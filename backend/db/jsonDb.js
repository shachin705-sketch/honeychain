const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'madhupramaan.json');

function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    }
  } catch (e) { /* ignore */ }
  return {};
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

class JsonDB {
  constructor() {
    this.data = loadDB();
  }

  exec(sql) {
    // Parse CREATE TABLE statements from SQL
    const tableRegex = /CREATE TABLE IF NOT EXISTS (\w+)\s*\(([^)]+)\)/gi;
    let match;
    while ((match = tableRegex.exec(sql)) !== null) {
      const tableName = match[1];
      if (!this.data[tableName]) this.data[tableName] = [];
    }
    saveDB(this.data);
  }

  pragma() { /* no-op for compatibility */ }

  prepare(sql) {
    return new QueryBuilder(this, sql);
  }

  _getTable(name) {
    if (!this.data[name]) this.data[name] = [];
    return this.data[name];
  }
}

class QueryBuilder {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql.trim();
  }

  run(...params) {
    const sql = this.sql;
    const db = this.db;

    // INSERT
    if (sql.toUpperCase().startsWith('INSERT')) {
      const tableMatch = sql.match(/INSERT INTO (\w+)\s*\(([^)]+)\)/i);
      if (!tableMatch) return { changes: 0 };
      const table = tableMatch[1];
      const cols = tableMatch[2].split(',').map(c => c.trim());
      const row = {};
      cols.forEach((col, i) => { row[col] = params[i]; });
      row.id = db._getTable(table).length + 1;
      // Check for max id
      const existing = db._getTable(table);
      if (existing.length > 0) {
        row.id = Math.max(...existing.map(r => r.id || 0)) + 1;
      }
      db._getTable(table).push(row);
      saveDB(db.data);
      return { changes: 1, lastInsertRowid: row.id };
    }

    // UPDATE
    if (sql.toUpperCase().startsWith('UPDATE')) {
      const tableMatch = sql.match(/UPDATE (\w+)/i);
      if (!tableMatch) return { changes: 0 };
      const table = tableMatch[1];
      const rows = db._getTable(table);
      let changes = 0;

      // Parse SET clause
      const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i);
      const whereMatch = sql.match(/WHERE\s+(.+)/i);
      if (!setMatch) return { changes: 0 };

      const setPairs = setMatch[1].split(',').map(s => {
        const [col, val] = s.split('=').map(x => x.trim());
        return { col, val };
      });

      const whereClause = whereMatch ? whereMatch[1] : null;
      // Count how many ? params the SET clause consumes
      let setParamCount = 0;
      setPairs.forEach(p => { if (p.val === '?') setParamCount++; });
      let paramIdx = 0;

      rows.forEach(row => {
        let matches = true;
        if (whereClause) {
          matches = evaluateWhere(whereClause, row, params, setParamCount);
        }
        if (matches) {
          setPairs.forEach(p => {
            if (p.val === '?') {
              row[p.col] = params[paramIdx++];
            } else if (p.val.startsWith("'") && p.val.endsWith("'")) {
              row[p.col] = p.val.slice(1, -1);
            } else {
              row[p.col] = isNaN(p.val) ? p.val : Number(p.val);
            }
          });
          changes++;
        }
      });

      saveDB(db.data);
      return { changes };
    }

    // DELETE
    if (sql.toUpperCase().startsWith('DELETE')) {
      const tableMatch = sql.match(/DELETE FROM (\w+)/i);
      if (!tableMatch) return { changes: 0 };
      const table = tableMatch[1];
      const whereMatch = sql.match(/WHERE\s+(.+)/i);
      const rows = db._getTable(table);
      if (!whereMatch) {
        const len = rows.length;
        db.data[table] = [];
        saveDB(db.data);
        return { changes: len };
      }
      const before = rows.length;
      db.data[table] = rows.filter(row => !evaluateWhere(whereMatch[1], row, params, 0));
      saveDB(db.data);
      return { changes: before - db.data[table].length };
    }

    return { changes: 0 };
  }

  get(...params) {
    return this._queryAll(params)[0] || undefined;
  }

  all(...params) {
    return this._queryAll(params);
  }

  _queryAll(params) {
    const sql = this.sql;
    const db = this.db;

    // SELECT
    const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)/i);
    if (!selectMatch) return [];
    const selectCols = selectMatch[1].trim();
    const tableName = selectMatch[2];
    const rows = db._getTable(tableName);

    // WHERE
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+GROUP|\s+LIMIT|$)/i);
    let filtered = rows;
    if (whereMatch) {
      filtered = rows.filter(row => evaluateWhere(whereMatch[1], row, params, 0));
    }

    // GROUP BY
    const groupMatch = sql.match(/GROUP BY\s+(\w+)/i);
    if (groupMatch) {
      const groupCol = groupMatch[1];
      const groups = {};
      filtered.forEach(row => {
        const key = row[groupCol] || 'null';
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
      });

      const havingMatch = sql.match(/HAVING\s+(.+)/i);

      return Object.entries(groups).map(([key, groupRows]) => {
        const result = {};

        // Handle aggregate functions
        const aggRegex = /(COUNT|SUM|AVG|MAX|MIN)\s*\(\s*(\*|\w+)\s*\)(?:\s+as\s+(\w+))?/gi;
        let aggMatch;
        while ((aggMatch = aggRegex.exec(selectCols)) !== null) {
          const func = aggMatch[1].toUpperCase();
          const col = aggMatch[2];
          const alias = aggMatch[3] || `${func.toLowerCase()}_${col === '*' ? 'all' : col}`;
          if (func === 'COUNT') result[alias] = groupRows.length;
          else if (func === 'SUM') result[alias] = groupRows.reduce((s, r) => s + (Number(r[col]) || 0), 0);
          else if (func === 'AVG') result[alias] = groupRows.reduce((s, r) => s + (Number(r[col]) || 0), 0) / groupRows.length;
          else if (func === 'MAX') result[alias] = Math.max(...groupRows.map(r => Number(r[col]) || 0));
          else if (func === 'MIN') result[alias] = Math.min(...groupRows.map(r => Number(r[col]) || 0));
        }

        // Non-aggregate columns — use first row
        const nonAgg = selectCols.replace(/(COUNT|SUM|AVG|MAX|MIN)\s*\([^)]+\)(?:\s+as\s+\w+)?,?\s*/gi, '').trim();
        if (nonAgg && nonAgg !== '*') {
          nonAgg.split(',').map(c => c.trim()).filter(Boolean).forEach(c => {
            const parts = c.split(/\s+as\s+/i);
            const col = parts[0].trim();
            const alias = parts[1]?.trim() || col;
            if (col === '*') return;
            result[alias] = groupRows[0]?.[col];
          });
        } else if (nonAgg === '*') {
          Object.assign(result, groupRows[0]);
        }

        // HAVING
        if (havingMatch) {
          // Simple having support
        }

        return result;
      });
    }

    // ORDER BY
    const orderMatch = sql.match(/ORDER BY\s+(\w+)(?:\s+(ASC|DESC))?/i);
    if (orderMatch) {
      const orderCol = orderMatch[1];
      const dir = (orderMatch[2] || 'ASC').toUpperCase();
      filtered.sort((a, b) => {
        const va = a[orderCol], vb = b[orderCol];
        if (va == null) return 1;
        if (vb == null) return -1;
        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
        return dir === 'DESC' ? -cmp : cmp;
      });
    }

    // LIMIT
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      filtered = filtered.slice(0, parseInt(limitMatch[1]));
    }

    // SELECT columns
    if (selectCols === '*') {
      return filtered;
    }

    return filtered.map(row => {
      const result = {};
      selectCols.split(',').map(c => c.trim()).forEach(c => {
        const parts = c.split(/\s+as\s+/i);
        const col = parts[0].trim();
        const alias = parts[1]?.trim() || col;
        // Handle MAX, MIN on non-grouped queries
        const aggMatch = col.match(/(COUNT|SUM|AVG|MAX|MIN)\s*\(\s*(\*|\w+)\s*\)/i);
        if (aggMatch) {
          const func = aggMatch[1].toUpperCase();
          const aggCol = aggMatch[2];
          const vals = filtered.map(r => Number(r[aggCol]) || 0);
          if (func === 'MAX') result[alias] = Math.max(...vals);
          else if (func === 'MIN') result[alias] = Math.min(...vals);
          else if (func === 'COUNT') result[alias] = filtered.length;
          else if (func === 'SUM') result[alias] = vals.reduce((a, b) => a + b, 0);
          else if (func === 'AVG') result[alias] = vals.reduce((a, b) => a + b, 0) / vals.length;
        } else {
          result[alias] = row[col];
        }
      });
      return result;
    });
  }
}

function evaluateWhere(clause, row, params, paramOffset) {
  // Simple WHERE evaluation supporting: col = ?, col = 'val', col = num, AND, IS NULL, NOT LIKE
  const andParts = clause.split(/\s+AND\s+/i);
  let paramIdx = paramOffset;

  for (const part of andParts) {
    const trimmed = part.trim();

    // IS NULL / IS NOT NULL
    if (trimmed.match(/(\w+)\s+IS\s+NULL/i)) {
      const col = trimmed.match(/(\w+)\s+IS\s+NULL/i)[1];
      if (row[col] != null) return false;
      continue;
    }
    if (trimmed.match(/(\w+)\s+IS\s+NOT\s+NULL/i)) {
      const col = trimmed.match(/(\w+)\s+IS\s+NOT\s+NULL/i)[1];
      if (row[col] == null) return false;
      continue;
    }

    // col != ? or col <> ?
    const neqMatch = trimmed.match(/(\w+)\s*(?:!=|<>)\s*\?/);
    if (neqMatch) {
      if (row[neqMatch[1]] == params[paramIdx]) return false;
      paramIdx++;
      continue;
    }

    // col = ?
    const eqParamMatch = trimmed.match(/(\w+)\s*=\s*\?/);
    if (eqParamMatch) {
      if (row[eqParamMatch[1]] != params[paramIdx]) return false;
      paramIdx++;
      continue;
    }

    // col = 'string'
    const eqStrMatch = trimmed.match(/(\w+)\s*=\s*'([^']+)'/);
    if (eqStrMatch) {
      if (row[eqStrMatch[1]] != eqStrMatch[2]) return false;
      continue;
    }

    // col = number
    const eqNumMatch = trimmed.match(/(\w+)\s*=\s*(\d+\.?\d*)/);
    if (eqNumMatch) {
      if (row[eqNumMatch[1]] != Number(eqNumMatch[2])) return false;
      continue;
    }

    // col LIKE pattern
    const likeMatch = trimmed.match(/(\w+)\s+LIKE\s+'([^']+)'/i);
    if (likeMatch) {
      const pattern = likeMatch[2].replace(/%/g, '.*');
      if (!new RegExp(`^${pattern}$`, 'i').test(row[likeMatch[1]] || '')) return false;
      continue;
    }

    // col NOT LIKE pattern
    const notLikeMatch = trimmed.match(/(\w+)\s+NOT\s+LIKE\s+'([^']+)'/i);
    if (notLikeMatch) {
      const pattern = notLikeMatch[2].replace(/%/g, '.*');
      if (new RegExp(`^${pattern}$`, 'i').test(row[notLikeMatch[1]] || '')) return false;
      continue;
    }

    // col >= ?
    const gteMatch = trimmed.match(/(\w+)\s*>=\s*\?/);
    if (gteMatch) {
      if ((row[gteMatch[1]] || 0) < params[paramIdx]) return false;
      paramIdx++;
      continue;
    }

    // col <= ?
    const lteMatch = trimmed.match(/(\w+)\s*<=\s*\?/);
    if (lteMatch) {
      if ((row[lteMatch[1]] || 0) > params[paramIdx]) return false;
      paramIdx++;
      continue;
    }

    // col > ?
    const gtMatch = trimmed.match(/(\w+)\s*>\s*\?/);
    if (gtMatch) {
      if ((row[gtMatch[1]] || 0) <= params[paramIdx]) return false;
      paramIdx++;
      continue;
    }

    // col < ?
    const ltMatch = trimmed.match(/(\w+)\s*<\s*\?/);
    if (ltMatch) {
      if ((row[ltMatch[1]] || 0) >= params[paramIdx]) return false;
      paramIdx++;
      continue;
    }

    // IN clause: col IN (?, ?, ?)
    const inMatch = trimmed.match(/(\w+)\s+IN\s*\(([^)]+)\)/i);
    if (inMatch) {
      const col = inMatch[1];
      const vals = inMatch[2].split(',').map(v => {
        v = v.trim();
        if (v === '?') return params[paramIdx++];
        if (v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1);
        return isNaN(v) ? v : Number(v);
      });
      if (!vals.includes(row[col])) return false;
      continue;
    }
  }

  return true;
}

function initDB() {
  const db = new JsonDB();
  return db;
}

module.exports = { initDB };
