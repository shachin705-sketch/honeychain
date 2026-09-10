import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import SmsToast from '../components/SmsToast';
import api from '../api/client';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [toast, setToast] = useState({ show: false, alert: null });
  const seenIdsRef = useRef(new Set());
  const latestCountRef = useRef(0);

  const showToast = useCallback((alertData) => {
    setToast({ show: true, alert: alertData });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, show: false }));
  }, []);

  // Poll for new unacknowledged alerts every 10 seconds (beekeeper only)
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'beekeeper') return;

    const poll = async () => {
      try {
        const { data } = await api.get('/alerts/unacknowledged-count');
        const newCount = data.count || 0;

        // If count increased, fetch the latest alert and show toast
        if (newCount > latestCountRef.current) {
          try {
            const { data: alerts } = await api.get('/alerts');
            // Find the newest alert we haven't shown yet
            const newest = alerts.find(a => a.status === 'sent' && !seenIdsRef.current.has(a.id));
            if (newest) {
              seenIdsRef.current.add(newest.id);
              const smsDetails = typeof newest.sms_details === 'string'
                ? JSON.parse(newest.sms_details || '{}')
                : (newest.sms_details || {});
              showToast({
                message: newest.message,
                phone: smsDetails.deliveredTo,
                severity: newest.severity,
                webDelivered: smsDetails.webDelivered,
                smsDelivered: smsDetails.smsDelivered,
                smsError: smsDetails.smsError,
                simulated: smsDetails.simulated
              });
            }
          } catch { /* ignore fetch errors */ }
        }

        latestCountRef.current = newCount;
      } catch { /* ignore */ }
    };

    poll(); // initial check
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user, showToast]);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <SmsToast
        show={toast.show}
        message={toast.alert?.message || ''}
        phone={toast.alert?.phone || ''}
        severity={toast.alert?.severity || 'warning'}
        webDelivered={toast.alert?.webDelivered}
        smsDelivered={toast.alert?.smsDelivered}
        smsError={toast.alert?.smsError}
        simulated={toast.alert?.simulated}
        onClose={hideToast}
      />
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
