import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { VerifiedBadge, FlaggedBadge } from '../components/Badge';
import CrossVerificationCard from '../components/CrossVerificationCard';
import Timeline from '../components/Timeline';
import api from '../api/client';

const COLORS = ['#10B981', '#EF4444', '#F59E0B'];
const RISK_COLORS = { VERIFIED_AUTHENTIC: '#10B981', REVIEW_RECOMMENDED: '#F59E0B', HIGH_RISK: '#EF4444' };

export default function KvicDashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [drillBatch, setDrillBatch] = useState(null);
  const [drillLedger, setDrillLedger] = useState([]);
  const [loadingDrill, setLoadingDrill] = useState(false);
  const [alertsData, setAlertsData] = useState(null);

  useEffect(() => { api.get('/kvic/overview').then(r => setData(r.data)).catch(() => {}); }, []);
  useEffect(() => { api.get('/alerts/all').then(r => setAlertsData(r.data)).catch(() => {}); }, []);

  if (!data) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-honey-500 border-t-transparent rounded-full" /></div>;

  const pieData = [
    { name: 'Verified', value: data.verifiedCount },
    { name: 'Flagged', value: data.flaggedCount },
    { name: 'Pending', value: data.totalBatches - data.verifiedCount - data.flaggedCount }
  ].filter(d => d.value > 0);

  const riskBarData = (data.riskTrends || []).map(r => ({
    name: `#${r.batch_id}`,
    batchId: r.batch_id,
    score: r.risk_score,
    fill: RISK_COLORS[r.risk_band] || '#9CA3AF'
  }));

  const viewDrillDown = async (batchId) => {
    if (drillBatch?.id === batchId) { setDrillBatch(null); return; }
    setLoadingDrill(true);
    try {
      const r = await api.get(`/verify/${batchId}`);
      setDrillBatch(r.data.batch);
      setDrillLedger(r.data.ledger || []);
    } catch { setDrillBatch(null); }
    setLoadingDrill(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-honey-800">{t('kvic.title')}</h1>
        <p className="text-honey-500">{t('kvic.desc')}</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card text-center">
          <p className="text-sm text-honey-500">{t('kvic.totalBatches')}</p>
          <p className="text-4xl font-bold text-honey-800">{data.totalBatches}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-honey-500">{t('kvic.verified')}</p>
          <p className="text-4xl font-bold text-green-600">{data.verifiedCount}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-honey-500">{t('kvic.flagged')}</p>
          <p className="text-4xl font-bold text-red-600">{data.flaggedCount}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-honey-500">{t('kvic.verificationRate')}</p>
          <p className="text-4xl font-bold text-honey-600">{data.verificationRate}%</p>
        </div>
      </div>

      {/* Alert Stat Cards */}
      {alertsData && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="card text-center border-red-100 bg-red-50/50">
            <p className="text-sm text-honey-500">🔴 {t('alerts.criticalAlerts')}</p>
            <p className="text-4xl font-bold text-red-600">{alertsData.criticalCount}</p>
          </div>
          <div className="card text-center border-amber-100 bg-amber-50/50">
            <p className="text-sm text-honey-500">🟡 {t('alerts.warnings')}</p>
            <p className="text-4xl font-bold text-amber-600">{alertsData.warningCount}</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div className="card">
          <h2 className="text-xl font-bold text-honey-800 mb-4">{t('kvic.batchStatus')}</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-honey-800 mb-4">{t('kvic.adulterationTrend')}</h2>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data.adulterationTrend}>
              <defs>
                <linearGradient id="colorFlag" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" stroke="#B8860B" fontSize={12} />
              <YAxis stroke="#B8860B" />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #FFECB3' }} />
              <Area type="monotone" dataKey="flagged_count" stroke="#EF4444" fillOpacity={1} fill="url(#colorFlag)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Authenticity Risk Trends — clickable */}
      {riskBarData.length > 0 && (
        <div className="card mb-8">
          <h2 className="text-xl font-bold text-honey-800 mb-4">📊 {t('kvic.riskTrends')}</h2>
          <p className="text-sm text-honey-500 mb-4">{t('kvic.riskTrendsDesc')}</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={riskBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#B8860B" fontSize={12} />
              <YAxis stroke="#B8860B" domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #FFECB3' }} />
              <Bar dataKey="score" radius={[4, 4, 0, 0]} onClick={(entry) => viewDrillDown(entry.batchId)} style={{ cursor: 'pointer' }}>
                {riskBarData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 text-xs text-honey-600">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block"></span> {t('kvic.verifiedRange')}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500 inline-block"></span> {t('kvic.reviewRange')}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block"></span> {t('kvic.highRiskRange')}</span>
          </div>
        </div>
      )}

      {/* Batch Drill-Down Timeline */}
      {drillBatch && (
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-honey-800">📋 {t('kvic.fullSupplyChain')} — Batch #{drillBatch.id}</h2>
            <button onClick={() => setDrillBatch(null)} className="text-honey-400 hover:text-honey-600 text-sm">✕ {t('admin.close')}</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
            <div><span className="text-honey-500">{t('admin.source')}:</span> <span className="font-medium text-honey-800 capitalize">{drillBatch.floralSource}</span></div>
            <div><span className="text-honey-500">{t('admin.region')}:</span> <span className="font-medium text-honey-800">{drillBatch.locationRegion}</span></div>
            <div><span className="text-honey-500">{t('admin.date')}:</span> <span className="font-medium text-honey-800">{drillBatch.harvestDate}</span></div>
            <div><span className="text-honey-500">{t('admin.status')}:</span> <span className={`font-medium ${drillBatch.status === 'verified' ? 'text-green-600' : 'text-red-600'}`}>{drillBatch.status}</span></div>
          </div>
          {loadingDrill ? (
            <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-4 border-honey-500 border-t-transparent rounded-full" /></div>
          ) : (
            <Timeline entries={drillLedger} />
          )}
        </div>
      )}

      {/* High-Risk Batches Table */}
      {data.highRiskBatches && data.highRiskBatches.length > 0 && (
        <div className="card mb-8">
          <h2 className="text-xl font-bold text-honey-800 mb-4">⚠️ {t('kvic.highRiskBatches')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-honey-100">
                  <th className="text-left py-3 px-2 text-honey-600">{t('admin.batch')}</th>
                  <th className="text-left py-3 px-2 text-honey-600">{t('admin.beekeeper')}</th>
                  <th className="text-left py-3 px-2 text-honey-600">{t('admin.region')}</th>
                  <th className="text-left py-3 px-2 text-honey-600">{t('admin.source')}</th>
                  <th className="text-left py-3 px-2 text-honey-600">Risk Score</th>
                  <th className="text-left py-3 px-2 text-honey-600">Band</th>
                  <th className="text-left py-3 px-2 text-honey-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.highRiskBatches.map((b, i) => (
                  <tr key={i} className="border-b border-honey-50">
                    <td className="py-3 px-2 font-bold text-honey-800">#{b.batch_id}</td>
                    <td className="py-3 px-2 text-honey-800">{b.beekeeper_name}</td>
                    <td className="py-3 px-2 text-honey-600">{b.location_region}</td>
                    <td className="py-3 px-2 text-honey-600 capitalize">{b.floral_source}</td>
                    <td className="py-3 px-2">
                      <span className={`font-bold ${b.risk_score > 60 ? 'text-red-600' : b.risk_score > 25 ? 'text-amber-600' : 'text-green-600'}`}>
                        {b.risk_score}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        b.risk_band === 'HIGH_RISK' ? 'bg-red-100 text-red-700' :
                        b.risk_band === 'REVIEW_RECOMMENDED' ? 'bg-amber-100 text-amber-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {b.risk_band === 'HIGH_RISK' ? 'HIGH RISK' : b.risk_band === 'REVIEW_RECOMMENDED' ? 'REVIEW' : 'VERIFIED'}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex gap-2">
                        <button onClick={() => setSelectedReport(selectedReport?.batch_id === b.batch_id ? null : b)}
                          className="text-honey-600 hover:text-honey-800 text-xs font-medium underline">
                          {selectedReport?.batch_id === b.batch_id ? t('admin.close') : t('kvic.report')}
                        </button>
                        <button onClick={() => viewDrillDown(b.batch_id)}
                          className="text-honey-600 hover:text-honey-800 text-xs font-medium underline">
                          {t('admin.timeline')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selectedReport && (
            <div className="mt-4 pt-4 border-t border-honey-100">
              <CrossVerificationCard report={{
                floralSourceMatch: selectedReport.checks_detail?.floralSourceMatch?.passed ?? false,
                timingMatch: selectedReport.checks_detail?.timingMatch?.passed ?? false,
                ndviSupport: selectedReport.checks_detail?.ndviSupport?.passed ?? false,
                nirWithinRange: selectedReport.checks_detail?.nirWithinRange?.passed ?? false,
                pollenAvailable: false,
                riskScore: selectedReport.risk_score,
                riskBand: selectedReport.risk_band,
                explanationText: selectedReport.explanation_text
              }} detailed={true} />
              {selectedReport.explanation_text && (
                <p className="text-sm text-honey-600 mt-3 text-center">{selectedReport.explanation_text}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Leaderboard */}
      <div className="card mb-8">
        <h2 className="text-xl font-bold text-honey-800 mb-4">🏆 {t('kvic.leaderboard')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-honey-100">
                <th className="text-left py-3 px-2 text-honey-600">#</th>
                <th className="text-left py-3 px-2 text-honey-600">{t('admin.beekeeper')}</th>
                <th className="text-left py-3 px-2 text-honey-600">Village</th>
                <th className="text-left py-3 px-2 text-honey-600">Cluster</th>
                <th className="text-left py-3 px-2 text-honey-600">Verified Batches</th>
                <th className="text-left py-3 px-2 text-honey-600">Verified Yield (kg)</th>
              </tr>
            </thead>
            <tbody>
              {data.leaderboard.map((b, i) => (
                <tr key={i} className="border-b border-honey-50">
                  <td className="py-3 px-2 font-bold text-honey-800">{i + 1}</td>
                  <td className="py-3 px-2 text-honey-800 font-medium">{b.name}</td>
                  <td className="py-3 px-2 text-honey-600">{b.village}</td>
                  <td className="py-3 px-2 text-honey-600">{b.cluster}</td>
                  <td className="py-3 px-2 text-honey-600">{b.verified_batches}</td>
                  <td className="py-3 px-2 text-green-600 font-bold">{b.verified_kg?.toFixed(1) || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div className="card">
          <h2 className="text-xl font-bold text-honey-800 mb-4">📍 {t('kvic.clusterSummary')}</h2>
          {data.clusterSummary.map((c, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-honey-50 last:border-0">
              <div>
                <p className="font-medium text-honey-800">{c.cluster || 'Unknown'}</p>
                <p className="text-xs text-honey-500">{c.beekeeper_count} beekeepers · {c.total_batches} batches</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-honey-700">Acoustic: {c.avg_acoustic?.toFixed(0) || '—'}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-honey-800 mb-4">⚠️ {t('kvic.recentAlerts')}</h2>
          {data.flaggedBatches.length === 0 ? (
            <p className="text-honey-500 text-sm">{t('kvic.noFlagged')}</p>
          ) : (
            data.flaggedBatches.map((b, i) => (
              <div key={i} className="py-2 border-b border-honey-50 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <FlaggedBadge reason={b.flag_reason} />
                  <span className="text-xs text-honey-500">Batch #{b.id}</span>
                </div>
                <p className="text-xs text-honey-600">{b.flag_reason}</p>
                <p className="text-xs text-honey-400">{b.beekeeper_name} · {b.location_region} · {b.harvest_date}</p>
              </div>
            ))
          )}
          {data.diseaseAlerts.length > 0 && (
            <>
              <h3 className="text-sm font-bold text-honey-700 mt-4 mb-2">{t('kvic.diseaseAlerts')}</h3>
              {data.diseaseAlerts.slice(0, 3).map((d, i) => (
                <div key={i} className="py-2 border-b border-honey-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">🔴</span>
                    <p className="text-xs font-medium text-red-700">{d.result}</p>
                  </div>
                  <p className="text-xs text-honey-500 ml-5">{d.beekeeper_name} ({d.cluster}) · {d.confidence}% confidence</p>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Active Alerts Across All Beekeepers */}
      {alertsData && alertsData.alerts.length > 0 && (
        <div className="card mb-8">
          <h2 className="text-xl font-bold text-honey-800 mb-4">🚨 {t('alerts.activeAlerts')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-honey-100">
                  <th className="text-left py-3 px-2 text-honey-600">{t('admin.beekeeper')}</th>
                  <th className="text-left py-3 px-2 text-honey-600">Village</th>
                  <th className="text-left py-3 px-2 text-honey-600">{t('alerts.alertType')}</th>
                  <th className="text-left py-3 px-2 text-honey-600">{t('alerts.severity')}</th>
                  <th className="text-left py-3 px-2 text-honey-600">Message</th>
                  <th className="text-left py-3 px-2 text-honey-600">{t('alerts.timeRaised')}</th>
                  <th className="text-left py-3 px-2 text-honey-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {alertsData.alerts.map((alert, i) => (
                  <tr key={i} className={`border-b border-honey-50 ${alert.status === 'sent' ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="py-3 px-2 font-medium text-honey-800">{alert.beekeeper_name}</td>
                    <td className="py-3 px-2 text-honey-600">{alert.village || '—'}</td>
                    <td className="py-3 px-2">
                      <span className="text-xs">
                        {alert.alert_type === 'disease_image' ? '📸 Image' : alert.alert_type === 'disease_audio' ? '🎙️ Audio' : '📡 IoT'}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${alert.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {alert.severity === 'critical' ? '🔴' : '🟡'} {alert.severity}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-honey-700 max-w-xs truncate">{alert.message}</td>
                    <td className="py-3 px-2 text-honey-500 text-xs">{new Date(alert.created_at).toLocaleString()}</td>
                    <td className="py-3 px-2">
                      <span className={`text-xs font-medium ${alert.status === 'sent' ? 'text-red-600' : 'text-green-600'}`}>
                        {alert.status === 'sent' ? '⏳ Pending' : '✓ Acknowledged'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
