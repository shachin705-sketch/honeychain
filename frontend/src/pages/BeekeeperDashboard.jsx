import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { VerifiedBadge, FlaggedBadge, PendingBadge } from '../components/Badge';
import api from '../api/client';

function parseSmsDetails(smsDetails) {
  if (!smsDetails) return {};
  if (typeof smsDetails === 'string') {
    try { return JSON.parse(smsDetails || '{}'); } catch { return {}; }
  }
  return smsDetails;
}

export default function BeekeeperDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [health, setHealth] = useState(null);
  const [criticalAlerts, setCriticalAlerts] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);

  const fetchAlerts = async () => {
    try {
      const { data } = await api.get('/alerts');
      setRecentAlerts(data);
      setCriticalAlerts(data.filter(a => a.severity === 'critical' && a.status === 'sent'));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    api.get('/beekeeper/batches').then(r => setBatches(r.data)).catch(() => {});
    api.get(`/beekeeper/forecast/${user.id}`).then(r => setForecast(r.data)).catch(() => {});
    api.get('/beekeeper/hive-health').then(r => setHealth(r.data)).catch(() => {});
    fetchAlerts();

    // Poll alerts every 10 seconds for real-time updates
    const alertInterval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(alertInterval);
  }, [user.id]);

  const acknowledgeAlert = async (id) => {
    try {
      await api.post(`/alerts/${id}/acknowledge`);
      setRecentAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'acknowledged' } : a));
      setCriticalAlerts(prev => prev.filter(a => a.id !== id));
    } catch { /* ignore */ }
  };

  const statusBadge = (status, reason) => {
    if (status === 'verified') return <VerifiedBadge />;
    if (status === 'flagged') return <FlaggedBadge reason={reason} />;
    return <PendingBadge />;
  };

  const DeliveryStatus = ({ smsDetails }) => {
    const sms = parseSmsDetails(smsDetails);
    const webOk = sms.webDelivered !== false;
    const smsOk = sms.smsDelivered === true;
    const smsFailed = sms.smsDelivered === false;
    const smsSim = sms.simulated === true;

    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
        <span className={`text-xs font-medium ${webOk ? 'text-green-600' : 'text-red-500'}`}>
          🌐 {webOk ? '✓ Delivered' : '✗ Failed'}
        </span>
        <span className={`text-xs font-medium ${smsOk ? 'text-green-600' : smsFailed ? 'text-red-500' : 'text-honey-400'}`}>
          📱 {smsSim
            ? '✓ Simulated'
            : smsOk
              ? '✓ Sent'
              : smsFailed
                ? '✗ Failed'
                : 'Sending...'}
        </span>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-honey-800">{t('beekeeper.title')}</h1>
          <p className="text-honey-500">{t('beekeeper.welcome')}, {user.name} — {user.village || user.cluster}</p>
        </div>
        <Link to="/beekeeper/log" className="btn-primary">{t('beekeeper.logHarvest')}</Link>
      </div>

      {/* Critical Alert Banner */}
      {criticalAlerts.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="font-bold">{t('alerts.urgentBanner')}: {criticalAlerts[0].message}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                <span className="text-sm text-red-100 font-medium">🌐 Web Alert: ✓ Delivered</span>
                <span className="text-sm text-red-100 font-medium">
                  📱 SMS: {parseSmsDetails(criticalAlerts[0].sms_details).simulated
                    ? '✓ Sent (simulated)'
                    : parseSmsDetails(criticalAlerts[0].sms_details).smsDelivered
                      ? '✓ Sent to your phone'
                      : parseSmsDetails(criticalAlerts[0].sms_details).smsDelivered === false
                        ? '✗ Failed — check number'
                        : 'Sending...'}
                </span>
              </div>
            </div>
            <button onClick={() => acknowledgeAlert(criticalAlerts[0].id)}
              className="px-4 py-2 bg-white text-red-600 font-semibold rounded-lg hover:bg-red-50 transition-colors text-sm flex-shrink-0">
              {t('alerts.acknowledge')}
            </button>
          </div>
          {criticalAlerts.length > 1 && (
            <p className="text-sm text-red-200 mt-2 ml-11">+ {criticalAlerts.length - 1} more critical alert{criticalAlerts.length > 2 ? 's' : ''} — check the Alerts bell above</p>
          )}
        </div>
      )}

      {health && (
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <p className="text-sm text-honey-500 mb-1">{t('beekeeper.hiveHealth')}</p>
            <p className={`text-4xl font-bold ${health.healthScore >= 70 ? 'text-green-600' : health.healthScore >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
              {health.healthScore}
            </p>
            <p className="text-sm text-honey-500 mt-1">{health.status}</p>
          </div>
          <div className="card">
            <p className="text-sm text-honey-500 mb-1">{t('beekeeper.latestWeight')}</p>
            <p className="text-4xl font-bold text-honey-700">{health.latest?.weight_kg || '—'} <span className="text-lg">kg</span></p>
          </div>
          <div className="card">
            <p className="text-sm text-honey-500 mb-1">{t('beekeeper.acousticScore')}</p>
            <p className="text-4xl font-bold text-honey-700">{health.latest?.acoustic_score || '—'}</p>
          </div>
        </div>
      )}

      {/* Harvest History */}
      <div className="card mb-8">
        <h2 className="text-xl font-bold text-honey-800 mb-4">{t('beekeeper.harvestHistory')}</h2>
        {batches.length === 0 ? (
          <p className="text-honey-500">{t('beekeeper.noHarvests')} <Link to="/beekeeper/log" className="text-honey-700 underline">{t('beekeeper.logFirst')}</Link></p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-honey-100">
                  <th className="text-left py-3 px-2 text-honey-600 font-medium">{t('admin.batch')}</th>
                  <th className="text-left py-3 px-2 text-honey-600 font-medium">{t('admin.date')}</th>
                  <th className="text-left py-3 px-2 text-honey-600 font-medium">{t('admin.source')}</th>
                  <th className="text-left py-3 px-2 text-honey-600 font-medium">{t('admin.qty')}</th>
                  <th className="text-left py-3 px-2 text-honey-600 font-medium">{t('admin.status')}</th>
                </tr>
              </thead>
              <tbody>
                {batches.map(b => (
                  <tr key={b.id} className="border-b border-honey-50 hover:bg-honey-50 transition-colors">
                    <td className="py-3 px-2 font-medium text-honey-800">#{b.id}</td>
                    <td className="py-3 px-2 text-honey-600">{b.harvest_date}</td>
                    <td className="py-3 px-2 text-honey-600 capitalize">{b.floral_source}</td>
                    <td className="py-3 px-2 text-honey-600">{b.quantity_kg} kg</td>
                    <td className="py-3 px-2">{statusBadge(b.status, b.flag_reason)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AI Forecast */}
      {forecast && (
        <div className="card mb-8">
          <h2 className="text-xl font-bold text-honey-800 mb-1">{t('beekeeper.aiForecast')}</h2>
          <p className="text-sm text-honey-500 mb-4">{t('beekeeper.forecastDesc')}</p>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={forecast.forecast}>
              <defs>
                <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4A017" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#D4A017" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="week" stroke="#B8860B" />
              <YAxis stroke="#B8860B" unit=" kg" />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #FFECB3' }} />
              <Area type="monotone" dataKey="predictedYield" stroke="#D4A017" fillOpacity={1} fill="url(#colorYield)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-xs text-honey-400 mt-2 italic">{t('beekeeper.forecastSim')}</p>
        </div>
      )}

      {/* Recent Alerts Panel — Dual-Channel */}
      {recentAlerts.length > 0 && (
        <div className="card mb-8">
          <h2 className="text-xl font-bold text-honey-800 mb-4">🔔 {t('alerts.title')}</h2>
          <div className="space-y-3">
            {recentAlerts.slice(0, 5).map(alert => (
              <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-xl ${alert.status === 'sent' ? 'bg-honey-50 border border-honey-100' : 'bg-gray-50 border border-gray-100'}`}>
                <span className="text-lg flex-shrink-0">{alert.severity === 'critical' ? '🔴' : '🟡'}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${alert.status === 'sent' ? 'text-honey-800' : 'text-honey-500'}`}>{alert.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-honey-400">{alert.alert_type === 'disease_image' ? '📸 Image' : alert.alert_type === 'disease_audio' ? '🎙️ Audio' : '📡 IoT'}</span>
                    <span className="text-xs text-honey-400">|</span>
                    <span className="text-xs text-honey-400">{new Date(alert.created_at).toLocaleString()}</span>
                  </div>
                  <DeliveryStatus smsDetails={alert.sms_details} />
                </div>
                {alert.status === 'sent' ? (
                  <button onClick={() => acknowledgeAlert(alert.id)} className="text-xs text-honey-600 hover:text-honey-800 font-medium underline flex-shrink-0 mt-1">
                    {t('alerts.acknowledge')}
                  </button>
                ) : (
                  <span className="text-xs text-green-600 font-medium flex-shrink-0 mt-1">✓ {t('alerts.acknowledged')}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
