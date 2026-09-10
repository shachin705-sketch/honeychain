import { useEffect } from 'react';

export default function SmsToast({ show, message, phone, severity, onClose, webDelivered, smsDelivered, smsError, simulated }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => onClose(), 6000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  const webOk = webDelivered !== false;
  const smsOk = smsDelivered === true;
  const smsFailed = smsDelivered === false;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] animate-slideUp">
      <div className="w-80 bg-white rounded-2xl shadow-2xl border border-honey-200 overflow-hidden" style={{ animation: 'slideUp 0.4s ease-out' }}>
        {/* Header */}
        <div className={`px-4 py-2.5 flex items-center gap-2 ${severity === 'critical' ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-amber-500 to-amber-600'}`}>
          <span className="text-white text-lg">⚠️</span>
          <span className="text-white font-bold text-sm">New Alert</span>
        </div>

        {/* Body */}
        <div className="px-4 py-3">
          <div className="bg-honey-50 rounded-xl p-3 mb-3">
            <p className="text-sm text-honey-700 leading-relaxed">{message}</p>
          </div>

          {/* Dual-Channel Delivery Status */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold ${webOk ? 'text-green-600' : 'text-red-500'}`}>
                🌐 Web Alert: {webOk ? '✓ Delivered' : '✗ Failed'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {simulated ? (
                <span className="text-xs font-semibold text-honey-500">
                  📱 SMS (simulated) ✓
                </span>
              ) : smsOk ? (
                <span className="text-xs font-semibold text-green-600">
                  📱 SMS to {phone || '+91-XXXXXXXXXX'}: ✓ Sent
                </span>
              ) : smsFailed ? (
                <span className="text-xs font-semibold text-red-500">
                  📱 SMS: ✗ Failed — {smsError || 'check number'}
                </span>
              ) : (
                <span className="text-xs font-semibold text-honey-400">
                  📱 SMS: Sending...
                </span>
              )}
            </div>
          </div>

          <p className="text-[10px] text-honey-400 mt-3 italic">Reply STOP to unsubscribe.</p>
        </div>

        {/* Footer accent bar */}
        <div className={`h-1 ${severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
      </div>
    </div>
  );
}
