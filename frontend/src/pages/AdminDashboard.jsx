import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { VerifiedBadge, FlaggedBadge, PendingBadge } from '../components/Badge';
import Timeline from '../components/Timeline';
import api from '../api/client';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [reports, setReports] = useState({});
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchLedger, setBatchLedger] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [addStageBatchId, setAddStageBatchId] = useState(null);
  const [stageForm, setStageForm] = useState({ step: 'distribution', data: {} });

  useEffect(() => {
    api.get('/admin/batches').then(r => setBatches(r.data)).catch(() => {});
    api.get('/admin/batches').then(r => {
      r.data.forEach(b => {
        api.get(`/verify/${b.id}/report`).then(rep => {
          setReports(prev => ({ ...prev, [b.id]: rep.data }));
        }).catch(() => {});
      });
    }).catch(() => {});
  }, []);

  const counts = { pending: 0, verified: 0, flagged: 0 };
  batches.forEach(b => counts[b.status]++);

  const getRiskBadge = (batchId) => {
    const report = reports[batchId];
    if (!report) return <span className="text-xs text-honey-400">—</span>;
    const score = report.riskScore;
    const band = report.riskBand;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        band === 'VERIFIED_AUTHENTIC' ? 'bg-green-100 text-green-700' :
        band === 'REVIEW_RECOMMENDED' ? 'bg-amber-100 text-amber-700' :
        'bg-red-100 text-red-700'
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${
          band === 'VERIFIED_AUTHENTIC' ? 'bg-green-500' :
          band === 'REVIEW_RECOMMENDED' ? 'bg-amber-500' :
          'bg-red-500'
        }`}></span>
        {score}
      </span>
    );
  };

  const viewTimeline = async (batchId) => {
    if (selectedBatch?.id === batchId) { setSelectedBatch(null); return; }
    setLoadingTimeline(true);
    try {
      const r = await api.get(`/verify/${batchId}`);
      setSelectedBatch(r.data.batch);
      setBatchLedger(r.data.ledger || []);
    } catch { setSelectedBatch(null); }
    setLoadingTimeline(false);
  };

  const handleAddStage = async (e) => {
    e.preventDefault();
    if (!addStageBatchId) return;
    try {
      await api.post(`/admin/batch/${addStageBatchId}/stage`, stageForm);
      setAddStageBatchId(null);
      setStageForm({ step: 'distribution', data: {} });
      viewTimeline(addStageBatchId);
    } catch {}
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-honey-800">{t('admin.title')}</h1>
        <p className="text-honey-500">{t('admin.desc')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="card text-center">
          <p className="text-sm text-honey-500">{t('admin.pendingReview')}</p>
          <p className="text-4xl font-bold text-yellow-600">{counts.pending}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-honey-500">{t('admin.verified')}</p>
          <p className="text-4xl font-bold text-green-600">{counts.verified}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-honey-500">{t('admin.flagged')}</p>
          <p className="text-4xl font-bold text-red-600">{counts.flagged}</p>
        </div>
      </div>

      {/* Batches Table */}
      <div className="card mb-6">
        <h2 className="text-xl font-bold text-honey-800 mb-4">{t('admin.allBatches')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-honey-100">
                <th className="text-left py-3 px-2 text-honey-600 font-medium">{t('admin.batch')}</th>
                <th className="text-left py-3 px-2 text-honey-600 font-medium">{t('admin.beekeeper')}</th>
                <th className="text-left py-3 px-2 text-honey-600 font-medium">{t('admin.region')}</th>
                <th className="text-left py-3 px-2 text-honey-600 font-medium">{t('admin.source')}</th>
                <th className="text-left py-3 px-2 text-honey-600 font-medium">{t('admin.date')}</th>
                <th className="text-left py-3 px-2 text-honey-600 font-medium">{t('admin.qty')}</th>
                <th className="text-left py-3 px-2 text-honey-600 font-medium">{t('admin.risk')}</th>
                <th className="text-left py-3 px-2 text-honey-600 font-medium">{t('admin.status')}</th>
                <th className="text-left py-3 px-2 text-honey-600 font-medium">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {batches.map(b => (
                <tr key={b.id} className={`border-b border-honey-50 hover:bg-honey-50 transition-colors ${
                  selectedBatch?.id === b.id ? 'bg-honey-50' : ''
                }`}>
                  <td className="py-3 px-2 font-medium text-honey-800">#{b.id}</td>
                  <td className="py-3 px-2 text-honey-600">{b.beekeeper_name}</td>
                  <td className="py-3 px-2 text-honey-600">{b.location_region}</td>
                  <td className="py-3 px-2 text-honey-600 capitalize">{b.floral_source}</td>
                  <td className="py-3 px-2 text-honey-600">{b.harvest_date}</td>
                  <td className="py-3 px-2 text-honey-600">{b.quantity_kg} kg</td>
                  <td className="py-3 px-2">{getRiskBadge(b.id)}</td>
                  <td className="py-3 px-2">
                    {b.status === 'verified' ? <VerifiedBadge /> : b.status === 'flagged' ? <FlaggedBadge reason={b.flag_reason} /> : <PendingBadge />}
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex gap-2">
                      <button onClick={() => viewTimeline(b.id)}
                        className="text-honey-700 hover:text-honey-900 text-xs font-medium underline">
                        {selectedBatch?.id === b.id ? t('admin.close') : t('admin.timeline')}
                      </button>
                      <Link to={`/admin/scan/${b.id}`} className="text-honey-700 hover:text-honey-900 text-xs font-medium underline">
                        {b.status === 'pending' ? t('admin.scan') : t('admin.details')}
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch Timeline Drill-Down */}
      {selectedBatch && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-honey-800">📋 {t('admin.timeline')} — Batch #{selectedBatch.id}</h2>
            <button onClick={() => setSelectedBatch(null)} className="text-honey-400 hover:text-honey-600 text-sm">✕ {t('admin.close')}</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
            <div><span className="text-honey-500">{t('admin.source')}:</span> <span className="font-medium text-honey-800 capitalize">{selectedBatch.floralSource}</span></div>
            <div><span className="text-honey-500">{t('admin.region')}:</span> <span className="font-medium text-honey-800">{selectedBatch.locationRegion}</span></div>
            <div><span className="text-honey-500">{t('admin.date')}:</span> <span className="font-medium text-honey-800">{selectedBatch.harvestDate}</span></div>
            <div><span className="text-honey-500">{t('admin.qty')}:</span> <span className="font-medium text-honey-800">{selectedBatch.quantityKg} kg</span></div>
          </div>
          {loadingTimeline ? (
            <div className="flex justify-center py-8"><div className="animate-spin w-6 h-6 border-4 border-honey-500 border-t-transparent rounded-full" /></div>
          ) : (
            <Timeline entries={batchLedger} />
          )}
          {/* Add Stage Form */}
          <div className="mt-6 pt-4 border-t border-honey-100">
            <button onClick={() => setAddStageBatchId(addStageBatchId ? null : selectedBatch.id)}
              className="text-honey-600 hover:text-honey-800 text-sm font-medium underline">
              {addStageBatchId ? t('admin.cancel') : t('admin.addStage')}
            </button>
            {addStageBatchId === selectedBatch.id && (
              <form onSubmit={handleAddStage} className="mt-3 p-4 bg-honey-50 rounded-xl space-y-3">
                <div>
                  <label className="block text-xs font-medium text-honey-700 mb-1">{t('admin.stage')}</label>
                  <select value={stageForm.step} onChange={e => setStageForm(f => ({ ...f, step: e.target.value, data: {} }))}
                    className="w-full px-3 py-2 rounded-lg border border-honey-200 text-sm">
                    <option value="processing">{t('admin.processing')}</option>
                    <option value="packaging">{t('admin.packaging')}</option>
                    <option value="distribution">{t('admin.distribution')}</option>
                    <option value="retail">{t('admin.retail')}</option>
                  </select>
                </div>

                {stageForm.step === 'processing' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-honey-700 mb-1">Method</label>
                      <select onChange={e => setStageForm(f => ({ ...f, data: { ...f.data, method: e.target.value } }))}
                        className="w-full px-3 py-2 rounded-lg border border-honey-200 text-sm">
                        <option value="raw">Raw</option>
                        <option value="filtered">Filtered</option>
                        <option value="heated">Heated</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-honey-700 mb-1">Facility Name</label>
                      <input type="text" placeholder="e.g., Punjab Honey Processing Unit"
                        onChange={e => setStageForm(f => ({ ...f, data: { ...f.data, facilityName: e.target.value } }))}
                        className="w-full px-3 py-2 rounded-lg border border-honey-200 text-sm" />
                    </div>
                  </div>
                )}

                {stageForm.step === 'packaging' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-honey-700 mb-1">Jar Size</label>
                      <select onChange={e => setStageForm(f => ({ ...f, data: { ...f.data, jarSize: e.target.value } }))}
                        className="w-full px-3 py-2 rounded-lg border border-honey-200 text-sm">
                        <option value="250g">250g</option>
                        <option value="500g">500g</option>
                        <option value="1kg">1kg</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-honey-700 mb-1">Facility</label>
                      <input type="text" placeholder="e.g., KVIC Certified Packaging"
                        onChange={e => setStageForm(f => ({ ...f, data: { ...f.data, facility: e.target.value } }))}
                        className="w-full px-3 py-2 rounded-lg border border-honey-200 text-sm" />
                    </div>
                  </div>
                )}

                {stageForm.step === 'distribution' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-honey-700 mb-1">Distributor</label>
                      <input type="text" placeholder="e.g., Northern India Honey Logistics"
                        onChange={e => setStageForm(f => ({ ...f, data: { ...f.data, distributorName: e.target.value } }))}
                        className="w-full px-3 py-2 rounded-lg border border-honey-200 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-honey-700 mb-1">Destination</label>
                      <input type="text" placeholder="e.g., Chennai, Tamil Nadu"
                        onChange={e => setStageForm(f => ({ ...f, data: { ...f.data, destinationMarket: e.target.value } }))}
                        className="w-full px-3 py-2 rounded-lg border border-honey-200 text-sm" />
                    </div>
                  </div>
                )}

                {stageForm.step === 'retail' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-honey-700 mb-1">Outlet Name</label>
                      <input type="text" placeholder="e.g., KVIC Emporium - Chennai"
                        onChange={e => setStageForm(f => ({ ...f, data: { ...f.data, outletName: e.target.value } }))}
                        className="w-full px-3 py-2 rounded-lg border border-honey-200 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-honey-700 mb-1">Shelf Price (₹/kg)</label>
                      <input type="number" placeholder="e.g., 750"
                        onChange={e => setStageForm(f => ({ ...f, data: { ...f.data, shelfPrice: parseInt(e.target.value) || 0 } }))}
                        className="w-full px-3 py-2 rounded-lg border border-honey-200 text-sm" />
                    </div>
                  </div>
                )}

                <button type="submit" className="btn-primary mt-2 text-sm py-2 px-4">{t('admin.addStageButton')}</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
