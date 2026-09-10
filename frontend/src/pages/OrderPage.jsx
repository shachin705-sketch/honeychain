import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/client';

const GRADE_INFO = {
  S: { label: 'Premium Grade', color: 'text-yellow-600', desc: 'Exceptional purity — lowest moisture, lowest HMF' },
  A: { label: 'Standard Grade', color: 'text-honey-600', desc: 'High quality — meets all FSSAI parameters' },
  B: { label: 'Basic Grade', color: 'text-orange-600', desc: 'Good quality — within acceptable limits' }
};

export default function OrderPage() {
  const { t } = useTranslation();
  const { batchId } = useParams();
  const [batch, setBatch] = useState(null);
  const [form, setForm] = useState({ buyer_name: '', buyer_address: '', buyer_phone: '', quantity: 1 });
  const [order, setOrder] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    api.get(`/verify/${batchId}`)
      .then(r => setBatch(r.data?.batch))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [batchId]);

  const getGrade = () => {
    if (!batch || batch.status !== 'verified') return { grade: 'N/A', price: 0 };
    // SIMULATED — grading based on spectral data quality
    if (batch.floralSource === 'mustard' || batch.floralSource === 'jamun') return { grade: 'S', price: 750 };
    if (batch.floralSource === 'wildflower' || batch.floralSource === 'eucalyptus') return { grade: 'A', price: 600 };
    return { grade: 'B', price: 450 };
  };

  const { grade, price } = getGrade();
  const total = price * form.quantity;

  const handleOrder = async (e) => {
    e.preventDefault();
    setOrdering(true);
    try {
      const { data } = await api.post(`/order/${batchId}`, form);
      setOrder(data);
      // Get order QR
      const { data: qr } = await api.get(`/order/qr/${data.orderId}`);
      setQrData(qr);
    } catch (err) {
      alert(err.response?.data?.error || 'Order failed');
    } finally {
      setOrdering(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-honey-500 border-t-transparent rounded-full" /></div>;

  if (!batch) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-honey-800">{t('verify.batchNotFound')}</h1>
          <Link to="/" className="btn-primary mt-4 inline-block">{t('verify.goHome')}</Link>
        </div>
      </div>
    );
  }

  // Order Confirmed Screen
  if (order) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="text-7xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-green-700 mb-2">{t('order.orderConfirmed')}</h1>
          <p className="text-honey-500 mb-6">{t('order.orderSuccess')}</p>

          <div className="card mb-6">
            <p className="text-sm text-honey-500">{t('order.orderId')}</p>
            <p className="text-xl font-bold text-honey-800 font-mono">{order.orderId}</p>
            <div className="grid grid-cols-2 gap-4 mt-4 text-sm text-left">
              <div><span className="text-honey-500">{t('order.honeyType')}:</span> <span className="font-medium capitalize">{order.floralSource}</span></div>
              <div><span className="text-honey-500">{t('order.grade')}:</span> <span className={`font-bold ${GRADE_INFO[order.grade]?.color || ''}`}>{order.grade} — {GRADE_INFO[order.grade]?.label}</span></div>
              <div><span className="text-honey-500">{t('logHarvest.quantity')}:</span> <span className="font-medium">{order.quantity} kg</span></div>
              <div><span className="text-honey-500">{t('order.total')}:</span> <span className="font-bold text-honey-800">₹{order.totalPrice}</span></div>
              <div><span className="text-honey-500">{t('verify.beekeeper')}:</span> <span className="font-medium">{order.beekeeperName}</span></div>
              <div><span className="text-honey-500">{t('verify.village')}:</span> <span className="font-medium">{order.village}</span></div>
            </div>
          </div>

          {qrData && (
            <div className="card mb-6">
              <p className="text-sm text-honey-500 mb-3">{t('order.reorderQr')}</p>
              <img src={qrData.qrDataUrl} alt="Reorder QR" className="mx-auto rounded-xl shadow-md" />
            </div>
          )}

          <Link to={`/verify/${batchId}`} className="btn-secondary inline-block">{t('order.viewVerification')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to={`/verify/${batchId}`} className="text-honey-600 hover:text-honey-800 text-sm mb-4 inline-block">{t('order.backToVerification')}</Link>
      <h1 className="text-3xl font-bold text-honey-800 mb-6">{t('order.orderHoney')}</h1>

      {/* Product Card */}
      <div className="card mb-6">
        <div className="flex items-start gap-4">
          <div className="w-24 h-24 bg-honey-100 rounded-xl flex items-center justify-center text-5xl shrink-0">🍯</div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-honey-800 capitalize">{batch.floralSource} Honey</h2>
            <p className="text-sm text-honey-500">by {batch.beekeeperName} · {batch.village}, {batch.cluster}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className={`text-lg font-bold ${GRADE_INFO[grade]?.color}`}>Grade {grade}</span>
              <span className="text-xs text-honey-500">·</span>
              <span className="text-xs text-honey-500">{GRADE_INFO[grade]?.desc}</span>
            </div>
            <p className="text-2xl font-bold text-honey-800 mt-2">₹{price} <span className="text-sm font-normal text-honey-500">/ kg</span></p>
          </div>
        </div>
      </div>

      {/* Order Form */}
      <div className="card">
        <h2 className="text-xl font-bold text-honey-800 mb-4">{t('order.deliveryDetails')}</h2>
        <form onSubmit={handleOrder} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-honey-700 mb-1">{t('order.fullName')}</label>
            <input type="text" value={form.buyer_name} onChange={e => setForm(f => ({ ...f, buyer_name: e.target.value }))} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-honey-700 mb-1">{t('order.address')}</label>
            <textarea value={form.buyer_address} onChange={e => setForm(f => ({ ...f, buyer_address: e.target.value }))} className="input-field" rows={3} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-honey-700 mb-1">{t('order.phone')}</label>
            <input type="tel" value={form.buyer_phone} onChange={e => setForm(f => ({ ...f, buyer_phone: e.target.value }))} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-honey-700 mb-1">{t('order.quantityKg')}</label>
            <input type="number" min="0.5" step="0.5" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: parseFloat(e.target.value) || 1 }))} className="input-field" />
          </div>
          <div className="bg-honey-50 rounded-xl p-4">
            <div className="flex justify-between">
              <span className="text-honey-600">{form.quantity} kg × ₹{price}</span>
              <span className="text-xl font-bold text-honey-800">₹{total}</span>
            </div>
          </div>
          <button type="submit" disabled={ordering} className="btn-primary w-full text-lg py-3">
            {ordering ? t('order.placingOrder') : t('order.placeOrder')}
          </button>
        </form>
      </div>
    </div>
  );
}
