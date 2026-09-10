import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/client';

export default function ConsumerOrders() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/consumer/orders')
      .then(r => setOrders(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-honey-500 border-t-transparent rounded-full" /></div>;

  const steps = ['placed', 'packed', 'dispatched', 'delivered'];
  const stepLabels = { placed: t('orders.orderPlaced'), packed: t('orders.packed'), dispatched: t('orders.dispatched'), delivered: t('orders.delivered') };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-honey-800">{t('orders.title')}</h1>
        <p className="text-honey-500">{t('orders.desc')}</p>
      </div>

      {orders.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-honey-500 mb-4">{t('orders.noOrders')}</p>
          <Link to="/consumer/scan" className="btn-primary inline-block">{t('orders.scanOrder')}</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order, i) => (
            <div key={i} className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-bold text-honey-800 text-lg">Order #{order.orderId}</p>
                  <p className="text-sm text-honey-500">
                    {order.floralSource} honey from {order.beekeeperName}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                    order.status === 'dispatched' ? 'bg-blue-100 text-blue-700' :
                    order.status === 'packed' ? 'bg-purple-100 text-purple-700' :
                    'bg-honey-100 text-honey-700'
                  }`}>
                    {order.status?.toUpperCase()}
                  </span>
                  <p className="text-xs text-honey-400 mt-1">₹{order.totalPrice} · {order.quantity}kg</p>
                </div>
              </div>

              {/* Progress Stepper */}
              <div className="relative mb-4">
                <div className="flex items-center justify-between">
                  {steps.map((step, si) => {
                    const completed = order.statusDetail?.[step];
                    const isCurrent = !completed && (si === 0 || order.statusDetail?.[steps[si - 1]]);
                    return (
                      <div key={step} className="flex-1 flex flex-col items-center relative">
                        {/* Connector line */}
                        {si > 0 && (
                          <div className={`absolute top-3 right-1/2 w-full h-0.5 ${
                            completed || isCurrent ? 'bg-green-400' : 'bg-honey-200'
                          }`} style={{ zIndex: 0 }} />
                        )}
                        <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                          completed ? 'bg-green-500 border-green-500 text-white' :
                          isCurrent ? 'bg-honey-100 border-honey-500 text-honey-800' :
                          'bg-white border-honey-200 text-honey-400'
                        }`}>
                          {completed ? '✓' : si + 1}
                        </div>
                        <span className={`text-[10px] mt-1.5 text-center ${
                          completed ? 'text-green-700 font-medium' : 'text-honey-400'
                        }`}>
                          {stepLabels[step]}
                        </span>
                        {completed && (
                          <span className="text-[9px] text-honey-400">{new Date(completed).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-honey-50 text-xs text-honey-500">
                <Link to={`/verify/${order.batchId}`} className="text-honey-600 hover:text-honey-800 font-medium underline">
                  {t('orders.viewTimeline')}
                </Link>
                <span>Ordered: {new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
