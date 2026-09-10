const crypto = require('crypto');

// SIMULATED — This hash chain simulates a permissioned blockchain ledger.
// In production, this would be Hyperledger Fabric or a private Ethereum network
// with smart contracts enforcing append-only immutability and consensus.

function computeHash(prevHash, data) {
  const payload = prevHash + JSON.stringify(data);
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function getHashPrefix(hash, len = 12) {
  return hash.substring(0, len);
}

function formatHashDisplay(hash) {
  return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
}

module.exports = { computeHash, getHashPrefix, formatHashDisplay };
