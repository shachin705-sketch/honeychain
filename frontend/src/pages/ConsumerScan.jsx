import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../api/client';

export default function ConsumerScan() {
  const [batchId, setBatchId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const { t } = useTranslation();
  const scannerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  const startCamera = async () => {
    setError('');
    setSuccess('');
    setCameraActive(true);

    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          scanner.stop().catch(() => {});
          setCameraActive(false);
          scannerRef.current = null;

          const id = decodedText.replace(/[^0-9]/g, '');
          if (id) {
            try {
              await api.post('/consumer/scan', { batchId: parseInt(id) });
              setSuccess(t('scan.earnPoints'));
              setTimeout(() => navigate(`/verify/${id}`), 1500);
            } catch {
              navigate(`/verify/${id}`);
            }
          }
        },
        () => {}
      );
    } catch (err) {
      setCameraActive(false);
      scannerRef.current = null;
      setError(err.message?.includes('Permission')
        ? 'Camera permission denied. Please allow camera access or use manual input.'
        : 'Camera not available. Use manual batch ID input below.');
    }
  };

  const stopCamera = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setCameraActive(false);
  };

  const handleManualScan = async (e) => {
    e.preventDefault();
    if (!batchId.trim()) return;
    setScanning(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/consumer/scan', { batchId: parseInt(batchId.trim()) });
      setSuccess(t('scan.earnPoints'));
      setTimeout(() => navigate(`/verify/${batchId.trim()}`), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record scan');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <span className="text-5xl">📱</span>
        <h1 className="text-2xl font-bold text-honey-800 mt-3">{t('scan.title')}</h1>
        <p className="text-honey-500 mt-1">{t('scan.desc')}</p>
      </div>

      {/* Camera Scanner */}
      <div className="card mb-6 text-center">
        {cameraActive ? (
          <div>
            <div id="qr-reader" ref={containerRef} className="w-full rounded-xl overflow-hidden mb-3" />
            <button onClick={stopCamera}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors">
              Stop Scanner
            </button>
          </div>
        ) : (
          <button onClick={startCamera}
            className="w-full py-6 border-2 border-dashed border-honey-300 rounded-xl hover:border-honey-500 hover:bg-honey-50 transition-all">
            <span className="text-4xl block mb-2">📷</span>
            <span className="text-honey-700 font-medium">{t('scan.openCamera')}</span>
          </button>
        )}
      </div>

      <div className="text-center text-honey-400 text-sm mb-6">{t('scan.orManual')}</div>

      {/* Manual Input */}
      <form onSubmit={handleManualScan} className="card">
        <label className="block text-sm font-medium text-honey-700 mb-2">{t('scan.batchId')}</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            placeholder={t('scan.enterBatchId')}
            className="flex-1 px-4 py-2.5 rounded-lg border border-honey-200 focus:ring-2 focus:ring-honey-400 focus:border-transparent outline-none text-sm"
          />
          <button type="submit" disabled={scanning || !batchId.trim()}
            className="btn-primary px-6 disabled:opacity-50">
            {scanning ? t('scan.scanning') : t('scan.verify')}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm text-center">
          {success}
        </div>
      )}

      <div className="text-center mt-8">
        <p className="text-xs text-honey-400">{t('scan.earnPoints')}</p>
      </div>
    </div>
  );
}
