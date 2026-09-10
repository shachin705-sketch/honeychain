import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/client';

export default function ConsumerDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('purchases');

  useEffect(() => {
    api.get('/consumer/stats').then(r => setStats(r.data)).catch(() => {});
    api.get('/consumer/purchases').then(r => setPurchases(r.data)).catch(() => {});
    api.get('/consumer/favorites').then(r => setFavorites(r.data)).catch(() => {});
    api.get('/consumer/orders').then(r => setOrders(r.data)).catch(() => {});
  }, []);

  const toggleFavorite = async (bkId) => {
    try {
      await api.post(`/consumer/favorite/${bkId}`);
      const r = await api.get('/consumer/favorites');
      setFavorites(r.data);
    } catch {}
  };

  if (!stats) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-honey-500 border-t-transparent rounded-full" /></div>;

  const badgeColor = stats.badge === 'Gold' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
    stats.badge === 'Silver' ? 'bg-gray-100 text-gray-800 border-gray-300' :
    'bg-orange-100 text-orange-800 border-orange-300';

  const tabs = [
    { id: 'purchases', label: t('consumer.myVerifiedPurchases'), icon: '🍯' },
    { id: 'orders', label: t('consumer.myOrders'), icon: '📦' },
    { id: 'favorites', label: t('consumer.favoriteBeekeepers'), icon: '⭐' },
    { id: 'trust', label: t('consumer.trustScoreHistory'), icon: '📊' },
    { id: 'rewards', label: t('consumer.rewardsPoints'), icon: '🏆' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-honey-800">{t('consumer.title')}</h1>
        <p className="text-honey-500">{t('consumer.desc')}</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card text-center">
          <p className="text-sm text-honey-500">{t('consumer.verifiedPurchases')}</p>
          <p className="text-3xl font-bold text-honey-800">{purchases.length}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-honey-500">{t('consumer.totalOrders')}</p>
          <p className="text-3xl font-bold text-honey-800">{stats.totalOrders}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-honey-500">{t('consumer.qrScans')}</p>
          <p className="text-3xl font-bold text-honey-800">{stats.totalScans}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-honey-500">{t('consumer.rewardPoints')}</p>
          <p className="text-3xl font-bold text-honey-800">{stats.points}</p>
        </div>
      </div>

      {/* Badge */}
      <div className="card mb-6 text-center">
        <p className="text-sm text-honey-500 mb-1">{t('consumer.trustBadge')}</p>
        <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold border ${badgeColor}`}>
          {stats.badge} {t('consumer.trustMember')}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto mb-6 border-b border-honey-100 pb-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id ? 'bg-honey-100 text-honey-800 border-b-2 border-honey-500' : 'text-honey-500 hover:text-honey-700'
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'purchases' && (
        <div className="space-y-4">
          {purchases.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-4xl mb-3">🍯</p>
              <p className="text-honey-500">{t('consumer.noPurchases')}</p>
              <Link to="/consumer/scan" className="btn-primary mt-4 inline-block">{t('consumer.scanQRCode')}</Link>
            </div>
          ) : purchases.map((p, i) => (
            <div key={i} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-honey-800">Batch #{p.batchId} — {p.floralSource}</p>
                  <p className="text-sm text-honey-500">{p.beekeeperName} · {p.village}</p>
                  <p className="text-xs text-honey-400 mt-1">Order: {p.orderId}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    p.riskBand === 'VERIFIED_AUTHENTIC' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    Score: {p.riskScore}
                  </span>
                  <p className="text-xs text-honey-400 mt-1">{p.quantity} kg · ₹{p.totalPrice}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-4xl mb-3">📦</p>
              <p className="text-honey-500">{t('consumer.noOrders')}</p>
            </div>
          ) : orders.map((o, i) => (
            <div key={i} className="card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-bold text-honey-800">Order #{o.orderId}</p>
                  <p className="text-sm text-honey-500">{o.floralSource} · {o.beekeeperName}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  o.status === 'delivered' ? 'bg-green-100 text-green-700' :
                  o.status === 'dispatched' ? 'bg-blue-100 text-blue-700' :
                  o.status === 'packed' ? 'bg-purple-100 text-purple-700' :
                  'bg-honey-100 text-honey-700'
                }`}>{o.status}</span>
              </div>
              {/* Progress Stepper */}
              <div className="flex items-center gap-0 text-xs">
                {['placed', 'packed', 'dispatched', 'delivered'].map((step, si) => {
                  const completed = o.statusDetail?.[step];
                  return (
                    <div key={step} className="flex-1 flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        completed ? 'bg-green-500 text-white' : 'bg-honey-100 text-honey-400'
                      }`}>{si + 1}</div>
                      <span className={`mt-1 ${completed ? 'text-green-700' : 'text-honey-400'}`}>{step}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-honey-500 mt-2">
                <span>₹{o.totalPrice} · {o.quantity}kg</span>
                <span>{new Date(o.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'favorites' && (
        <div className="space-y-4">
          {favorites.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-4xl mb-3">⭐</p>
              <p className="text-honey-500">{t('consumer.noFavorites')}</p>
            </div>
          ) : favorites.map((f, i) => (
            <div key={i} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-honey-800">{f.name}</p>
                  <p className="text-sm text-honey-500">{f.village}, {f.cluster}</p>
                  {f.latestBatch && (
                    <p className="text-xs text-honey-400 mt-1">
                      Latest: {f.latestBatch.floralSource} · {f.latestBatch.harvestDate} · {f.latestBatch.quantityKg}kg
                    </p>
                  )}
                </div>
                <button onClick={() => toggleFavorite(f.id)}
                  className="text-honey-400 hover:text-red-500 text-lg">★</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'trust' && (
        <div className="card">
          <h3 className="font-bold text-honey-800 mb-4">{t('consumer.trustOverTime')}</h3>
          {stats.trustHistory.length === 0 ? (
            <p className="text-honey-500 text-center py-8">{t('consumer.noTrustHistory')}</p>
          ) : (
            <>
              <div className="mb-6">
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={stats.trustHistory.map(h => ({
                    date: new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                    score: 100 - h.riskScore,
                    band: h.riskBand,
                  }))}>
                    <defs>
                      <linearGradient id="colorTrust" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="date" stroke="#B8860B" fontSize={12} />
                    <YAxis stroke="#B8860B" domain={[0, 100]} unit="%" />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #FFECB3' }} />
                    <Area type="monotone" dataKey="score" stroke="#10B981" fillOpacity={1} fill="url(#colorTrust)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {stats.trustHistory.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-honey-50 last:border-0">
                    <span className={`w-3 h-3 rounded-full ${
                      item.riskBand === 'VERIFIED_AUTHENTIC' ? 'bg-green-500' :
                      item.riskBand === 'REVIEW_RECOMMENDED' ? 'bg-amber-500' : 'bg-red-500'
                    }`}></span>
                    <span className="text-sm text-honey-600 flex-1">{new Date(item.date).toLocaleDateString()}</span>
                    <span className="font-bold text-honey-800">{100 - item.riskScore}%</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      item.riskBand === 'VERIFIED_AUTHENTIC' ? 'bg-green-100 text-green-700' :
                      item.riskBand === 'REVIEW_RECOMMENDED' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>{item.riskBand?.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'rewards' && (
        <div className="card text-center py-12">
          <p className="text-5xl mb-4">🏆</p>
          <p className="text-4xl font-bold text-honey-800 mb-2">{stats.points} {t('consumer.points')}</p>
          <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold border ${badgeColor} mb-6`}>
            {stats.badge} {t('consumer.member')}
          </span>
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto text-sm">
            <div className="bg-honey-50 rounded-lg p-3">
              <p className="font-bold text-honey-800">0-50</p>
              <p className="text-honey-500">Bronze</p>
            </div>
            <div className="bg-honey-50 rounded-lg p-3">
              <p className="font-bold text-honey-800">51-150</p>
              <p className="text-honey-500">Silver</p>
            </div>
            <div className="bg-honey-50 rounded-lg p-3">
              <p className="font-bold text-honey-800">151+</p>
              <p className="text-honey-500">Gold</p>
            </div>
          </div>
          <p className="text-xs text-honey-400 mt-4">{t('consumer.earnPoints')}</p>
        </div>
      )}
    </div>
  );
}
