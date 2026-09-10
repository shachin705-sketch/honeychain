import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Timeline from '../components/Timeline';
import CrossVerificationCard from '../components/CrossVerificationCard';
import api from '../api/client';

export default function SpectralScan() {
  const { batchId } = useParams();
  const [batch, setBatch] = useState(null);
  const [spectral, setSpectral] = useState({ moisture: '', sugar_ratio: '', hmf_level: '' });
  const [result, setResult] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/admin/batches').then(r => {
      const b = r.data.find(b => b.id === parseInt(batchId));
      if (b) {
        setBatch(b);
        const sd = JSON.parse(b.spectral_data || '{}');
        if (sd.moisture) setSpectral({ moisture: sd.moisture, sugar_ratio: sd.sugar_ratio, hmf_level: sd.hmf_level });
      }
    }).catch(() => {});
  }, [batchId]);

  const autoGenerate = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/admin/spectral-scan', { batchId: parseInt(batchId), auto_generate: true });
      setSpectral(data.spectralData);
    } catch (err) { alert('Failed'); }
    finally { setLoading(false); }
  };

  const runVerification = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(`/admin/verify/${batchId}`, {
        moisture: spectral.moisture,
        sugar_ratio: spectral.sugar_ratio,
        hmf_level: spectral.hmf_level
      });
      setResult(data);
      // Refresh batch data
      const { data: batches } = await api.get('/admin/batches');
      setBatch(batches.find(b => b.id === parseInt(batchId)));
    } catch (err) { alert(err.response?.data?.error || 'Verification failed'); }
    finally { setLoading(false); }
  };

  const generateQR = async () => {
    try {
      const { data } = await api.get(`/admin/qr/${batchId}`);
      setQrData(data);
    } catch (err) { alert('QR generation failed'); }
  };

  if (!batch) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-honey-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/admin" className="text-honey-600 hover:text-honey-800 text-sm mb-4 inline-block">← Back to Dashboard</Link>
      <h1 className="text-3xl font-bold text-honey-800 mb-2">Spectral Scan & Verification</h1>
      <p className="text-honey-500 mb-8">Batch #{batch.id} — {batch.beekeeper_name} — {batch.floral_source}</p>

      {/* Batch Info */}
      <div className="card mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-honey-500">Region:</span> <span className="font-medium text-honey-800">{batch.location_region}</span></div>
          <div><span className="text-honey-500">Date:</span> <span className="font-medium text-honey-800">{batch.harvest_date}</span></div>
          <div><span className="text-honey-500">Source:</span> <span className="font-medium text-honey-800 capitalize">{batch.floral_source}</span></div>
          <div><span className="text-honey-500">Quantity:</span> <span className="font-medium text-honey-800">{batch.quantity_kg} kg</span></div>
        </div>
      </div>

      {/* Spectral Scan Form */}
      <div className="card mb-6">
        <h2 className="text-xl font-bold text-honey-800 mb-4">🔬 NIR Spectral Scan</h2>
        <p className="text-sm text-honey-500 mb-4">SIMULATED — In production, data comes from Thermo Fisher Antaris or Bruker ALPHA II NIR spectrometer</p>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-honey-700 mb-1">Moisture %</label>
            <input type="number" step="0.1" value={spectral.moisture} onChange={e => setSpectral(s => ({ ...s, moisture: parseFloat(e.target.value) || '' }))}
              className="input-field" placeholder="e.g. 17.2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-honey-700 mb-1">Sugar Ratio</label>
            <input type="number" step="0.1" value={spectral.sugar_ratio} onChange={e => setSpectral(s => ({ ...s, sugar_ratio: parseFloat(e.target.value) || '' }))}
              className="input-field" placeholder="e.g. 82.5" />
          </div>
          <div>
            <label className="block text-sm font-medium text-honey-700 mb-1">HMF Level (mg/kg)</label>
            <input type="number" step="0.1" value={spectral.hmf_level} onChange={e => setSpectral(s => ({ ...s, hmf_level: parseFloat(e.target.value) || '' }))}
              className="input-field" placeholder="e.g. 12.3" />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={autoGenerate} disabled={loading} className="btn-secondary">🎲 Auto-Generate Readings</button>
          <button onClick={runVerification} disabled={loading} className="btn-primary">🔍 Run Verification Check</button>
        </div>
      </div>

      {/* AI Cross-Verification Report */}
      {result && result.report && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-honey-800 mb-4">🧠 AI Cross-Verification Report</h2>
          <CrossVerificationCard report={result.report} detailed={true} />
          {result.report.explanationText && (
            <div className="card mt-4">
              <p className="text-sm text-honey-600">{result.report.explanationText}</p>
            </div>
          )}
        </div>
      )}

      {/* QR Code */}
      {batch.status === 'verified' && (
        <div className="card mb-6 text-center">
          <h2 className="text-xl font-bold text-honey-800 mb-4">📦 Batch QR Code</h2>
          {qrData ? (
            <div>
              <img src={qrData.qrDataUrl} alt="Batch QR" className="mx-auto mb-3 rounded-xl shadow-md" />
              <p className="text-sm text-honey-500">Link: {qrData.url}</p>
              <Link to={`/verify/${batch.id}`} className="text-honey-700 text-sm font-medium underline block mt-2">Preview Consumer Page →</Link>
            </div>
          ) : (
            <button onClick={generateQR} className="btn-primary">📱 Generate QR Code</button>
          )}
        </div>
      )}

      {/* Ledger Trail */}
      {batch.status === 'verified' && (
        <div className="card">
          <h2 className="text-xl font-bold text-honey-800 mb-4">🔗 Blockchain Ledger Trail</h2>
          <LedgerTrail batchId={batch.id} />
        </div>
      )}
    </div>
  );
}

function LedgerTrail({ batchId }) {
  const [entries, setEntries] = useState([]);
  useEffect(() => {
    api.get(`/verify/${batchId}`).then(r => setEntries(r.data.ledger || [])).catch(() => {});
  }, [batchId]);
  return <Timeline entries={entries} />;
}
