import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function parseSmsDetails(smsDetails) {
  if (!smsDetails) return {};
  if (typeof smsDetails === 'string') {
    try { return JSON.parse(smsDetails || '{}'); } catch { return {}; }
  }
  return smsDetails;
}

export default function AlertBell() {
  const { t } = useTranslation();
  const [count, setCount] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const prevCountRef = useRef(0);

  const fetchCount = async () => {
    try {
      const { data } = await api.get('/alerts/unacknowledged-count');
      setCount(data.count);
    } catch { /* ignore */ }
  };

  const fetchAlerts = async () => {
    try {
      const { data } = await api.get('/alerts');
      setAlerts(data);
      setCount(data.filter(a => a.status === 'sent').length);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchCount();
    // Poll every 10 seconds for faster alert delivery
    const interval = setInterval(fetchCount, 10000);
    return () => clearInterval(interval);
  }, []);

  // Also refresh the full alert list every 10s if panel is open
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, [open]);

  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const togglePanel = async () => {
    if (!open) {
      setLoading(true);
      await fetchAlerts();
      setLoading(false);
    }
    setOpen(!open);
  };

  const acknowledge = async (id) => {
    try {
      await api.post(`/alerts/${id}/acknowledge`);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'acknowledged' } : a));
      setCount(prev => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button onClick={togglePanel} className="relative p-2 text-honey-600 hover:text-honey-800 hover:bg-honey-50 rounded-lg transition-colors">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full animate-pulse">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-honey-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-honey-100 bg-honey-50 flex items-center justify-between">
            <h3 className="font-bold text-honey-800">{t('alerts.title')}</h3>
            {count > 0 && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{count} {t('alerts.unread')}</span>}
          </div>
          <div className="overflow-y-auto max-h-[calc(70vh-50px)]">
            {loading ? (
              <div className="p-8 text-center text-honey-400">{t('common.loading')}</div>
            ) : alerts.length === 0 ? (
              <div className="p-8 text-center text-honey-400">{t('alerts.noAlerts')}</div>
            ) : (
              alerts.map(alert => {
                const sms = parseSmsDetails(alert.sms_details);
                const webOk = sms.webDelivered !== false;
                const smsOk = sms.smsDelivered === true;
                const smsFailed = sms.smsDelivered === false;
                const smsSim = sms.simulated === true;
                const phone = sms.deliveredTo || '+XX-XXXXXXXXXX';

                return (
                  <div key={alert.id} className={`px-4 py-3 border-b border-honey-50 ${alert.status === 'sent' ? 'bg-white' : 'bg-gray-50'}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-lg mt-0.5 flex-shrink-0">
                        {alert.severity === 'critical' ? '🔴' : '🟡'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${alert.status === 'sent' ? 'text-honey-800' : 'text-honey-500'}`}>{alert.message}</p>

                        {/* Dual-Channel Delivery Status */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                          <span className={`text-xs font-medium ${webOk ? 'text-green-600' : 'text-red-500'}`}>
                            🌐 {webOk ? '✓ Delivered' : '✗ Failed'}
                          </span>
                          <span className={`text-xs font-medium ${smsOk ? 'text-green-600' : smsFailed ? 'text-red-500' : 'text-honey-400'}`}>
                            📱 {smsSim
                              ? `✓ Simulated`
                              : smsOk
                                ? `✓ Sent to ${phone}`
                                : smsFailed
                                  ? `✗ Failed — check number`
                                  : 'Sending...'}
                          </span>
                        </div>

                        <span className="text-xs text-honey-400 mt-1 block">{timeAgo(alert.created_at)}</span>

                        {alert.status === 'sent' ? (
                          <button onClick={() => acknowledge(alert.id)} className="mt-2 text-xs text-honey-600 hover:text-honey-800 font-medium underline transition-colors">
                            {t('alerts.acknowledge')}
                          </button>
                        ) : (
                          <span className="mt-2 inline-block text-xs text-green-600 font-medium">✓ {t('alerts.acknowledged')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
