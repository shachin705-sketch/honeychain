import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Timeline from '../components/Timeline';
import CrossVerificationCard from '../components/CrossVerificationCard';
import { VerifiedBadge, FlaggedBadge } from '../components/Badge';
import api from '../api/client';

export default function VerifyBatch() {
  const { t } = useTranslation();
  const { batchId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sealResult, setSealResult] = useState(null);

  useEffect(() => {
    api.get(`/verify/${batchId}`)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [batchId]);

  // SIMULATED — In production, this would query an NFC tamper-evident seal reader
  const checkSeal = () => {
    setSealResult(t('verify.sealIntact'));
    setTimeout(() => setSealResult(null), 4000);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-honey-500 border-t-transparent rounded-full" /></div>;

  if (!data?.batch) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-honey-800 mb-2">{t('verify.batchNotFound')}</h1>
          <p className="text-honey-500">{t('verify.noBatch')} #{batchId}</p>
          <Link to="/" className="btn-primary mt-6 inline-block">{t('verify.goHome')}</Link>
        </div>
      </div>
    );
  }

  const { batch, ledger, report } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-honey-50 via-white to-honey-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-5xl">🍯</span>
          <h1 className="text-3xl font-bold text-honey-800 mt-3">{t('verify.title')}</h1>
          <p className="text-honey-500 mt-1">{t('verify.subtitle')}</p>
        </div>

        {/* Verification Badge */}
        <div className="card text-center mb-6">
          {batch.status === 'verified' ? (
            <div>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-4xl">✅</span>
              </div>
              <VerifiedBadge className="text-lg px-5 py-2" />
              <p className="text-green-700 mt-3 font-medium">{t('verify.verifiedMsg')}</p>
            </div>
          ) : (
            <div>
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-4xl">⚠️</span>
              </div>
              <FlaggedBadge reason={batch.flagReason} className="text-lg px-5 py-2" />
              <p className="text-red-700 mt-3 font-medium">{batch.flagReason}</p>
            </div>
          )}
        </div>

        {/* AI Cross-Verification Card (consumer view — detailed=false) */}
        {report && (
          <div className="mb-6">
            <CrossVerificationCard report={report} detailed={false} />
          </div>
        )}

        {/* Batch Details */}
        <div className="card mb-6">
          <h2 className="text-xl font-bold text-honey-800 mb-4">{t('verify.batchInfo')}</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-honey-500">{t('verify.batchId')}:</span> <span className="font-bold text-honey-800">#{batch.id}</span></div>
            <div><span className="text-honey-500">{t('verify.floralSource')}:</span> <span className="font-medium text-honey-800 capitalize">{batch.floralSource}</span></div>
            <div><span className="text-honey-500">{t('verify.harvestDate')}:</span> <span className="font-medium text-honey-800">{batch.harvestDate}</span></div>
            <div><span className="text-honey-500">{t('verify.quantity')}:</span> <span className="font-medium text-honey-800">{batch.quantityKg} kg</span></div>
            <div><span className="text-honey-500">{t('verify.beekeeper')}:</span> <span className="font-medium text-honey-800">{batch.beekeeperName}</span></div>
            <div><span className="text-honey-500">{t('verify.village')}:</span> <span className="font-medium text-honey-800">{batch.village}, {batch.cluster}</span></div>
          </div>
        </div>

        {/* Ledger Trail */}
        {ledger && ledger.length > 0 && (
          <div className="card mb-6">
            <h2 className="text-xl font-bold text-honey-800 mb-4">🔗 {t('timeline.supplyChainTrail')}</h2>
            <Timeline entries={ledger} />
          </div>
        )}

        {/* Hash Chain Visualization */}
        {ledger && ledger.length > 0 && (
          <div className="card mb-6">
            <h2 className="text-xl font-bold text-honey-800 mb-4">🔐 {t('timeline.hashChain')}</h2>
            <p className="text-sm text-honey-500 mb-4">{t('timeline.hashChainDesc')}</p>
            <div className="space-y-3">
              {ledger.map((e, i) => (
                <div key={i} className="bg-honey-50 rounded-lg p-3 font-mono text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-honey-200 text-honey-800 px-2 py-0.5 rounded font-bold">{e.step}</span>
                    {i < ledger.length - 1 && <span className="text-honey-400">→</span>}
                  </div>
                  <p className="text-honey-500">prev: <span className="text-honey-700">{e.prevHash?.substring(0, 24)}...</span></p>
                  <p className="text-honey-500">curr: <span className="text-honey-700">{e.currentHash?.substring(0, 24)}...</span></p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NFC Seal Check */}
        <div className="card mb-6 text-center">
          <h2 className="text-xl font-bold text-honey-800 mb-4">📱 {t('verify.nfcSeal')}</h2>
          <button onClick={checkSeal} className="btn-primary">
            🔒 {t('verify.verifySeal')}
          </button>
          {sealResult && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-green-700 font-medium">{sealResult}</p>
            </div>
          )}
          <p className="text-xs text-honey-400 mt-2 italic">{t('verify.sealSim')}</p>
        </div>

        {/* Buy Again */}
        {batch.status === 'verified' && (
          <div className="card text-center">
            <h2 className="text-xl font-bold text-honey-800 mb-3">🍯 {t('verify.loveHoney')}</h2>
            <p className="text-honey-500 mb-4">{t('verify.orderFrom')} {batch.beekeeperName} {t('verify.in')} {batch.village}</p>
            <Link to={`/order/${batch.id}`} className="btn-primary inline-block text-lg py-3 px-8">
              🛒 {t('verify.buyAgain')}
            </Link>
          </div>
        )}

        {/* Back */}
        <div className="text-center mt-6">
          <Link to="/" className="text-honey-600 hover:text-honey-800 text-sm">{t('verify.backHome')}</Link>
        </div>
      </div>
    </div>
  );
}
