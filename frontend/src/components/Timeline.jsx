import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const STAGE_KEYS = {
  harvest: { icon: '🐝', color: 'bg-honey-100 border-honey-400', textColor: 'text-honey-800', summary: (d) => `${d.quantityKg} kg from ${d.hiveId || 'N/A'}` },
  collection: { icon: '🏭', color: 'bg-blue-50 border-blue-400', textColor: 'text-blue-800', summary: (d) => `${d.centerName || 'N/A'} — ${d.quantityReceived || 'N/A'} kg received` },
  testing: { icon: '🧪', color: 'bg-purple-50 border-purple-400', textColor: 'text-purple-800', summary: (d) => `Moisture: ${d.moisture || 'N/A'}% · Sugar: ${d.sugarRatio || 'N/A'} · HMF: ${d.hmfLevel || 'N/A'}` },
  ai_verification: { icon: '🤖', color: 'bg-green-50 border-green-400', textColor: 'text-green-800', summary: (d) => `Risk: ${d.riskScore ?? 'N/A'} — ${d.riskBand?.replace(/_/g, ' ') || 'N/A'}` },
  processing: { icon: '⚙️', color: 'bg-orange-50 border-orange-400', textColor: 'text-orange-800', summary: (d) => `${d.method || 'N/A'} — ${d.facilityName || 'N/A'}` },
  packaging: { icon: '📦', color: 'bg-indigo-50 border-indigo-400', textColor: 'text-indigo-800', summary: (d) => `${d.jarSize || 'N/A'} — Seal: ${d.nfcSealId?.substring(0, 16) || 'N/A'}...` },
  distribution: { icon: '🚚', color: 'bg-cyan-50 border-cyan-400', textColor: 'text-cyan-800', summary: (d) => `${d.distributorName || 'N/A'} → ${d.destinationMarket || 'N/A'}` },
  retail: { icon: '🏪', color: 'bg-pink-50 border-pink-400', textColor: 'text-pink-800', summary: (d) => `${d.outletName || 'N/A'} — ₹${d.shelfPrice || 'N/A'}/kg` },
  consumer_purchase: { icon: '✅', color: 'bg-emerald-50 border-emerald-400', textColor: 'text-emerald-800', summary: (d) => d.orderId ? `Order ${d.orderId}` : 'Pending' },
  spectral_scan: { icon: '🔬', color: 'bg-purple-50 border-purple-400', textColor: 'text-purple-800', summary: () => 'Scan complete' },
  verification: { icon: '✅', color: 'bg-green-50 border-green-400', textColor: 'text-green-800', summary: () => 'Passed' },
};

function StageDetail({ data }) {
  const fields = Object.entries(data).filter(([k]) => !['batchId', 'step'].includes(k));
  return (
    <div className="mt-2 bg-honey-50 rounded-lg p-3 text-xs space-y-1">
      {fields.map(([key, val]) => {
        if (val === null || val === undefined || val === '') return null;
        let displayVal = val;
        if (typeof val === 'object') displayVal = JSON.stringify(val);
        else if (typeof val === 'boolean') displayVal = val ? '✓ Yes' : '✗ No';
        else if (key.includes('date') || key.includes('Date') || key.includes('timestamp') || key.includes('Timestamp')) {
          displayVal = new Date(val).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        }
        return (
          <div key={key} className="flex justify-between">
            <span className="text-honey-500 capitalize">{key.replace(/_/g, ' ')}:</span>
            <span className="text-honey-700 font-medium text-right max-w-[60%]">{String(displayVal)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Timeline({ entries }) {
  const [expanded, setExpanded] = useState({});
  const { t } = useTranslation();

  if (!entries || entries.length === 0) return <p className="text-honey-500">{t('timeline.noEntries')}</p>;

  const toggleExpand = (i) => setExpanded(prev => ({ ...prev, [i]: !prev[i] }));

  return (
    <div className="relative">
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-honey-200" />
      <div className="space-y-4">
        {entries.map((entry, i) => {
          const stageConfig = STAGE_KEYS[entry.step] || { icon: '📄', color: 'bg-gray-50 border-gray-400', textColor: 'text-gray-800', summary: () => entry.step };
          const label = t(`timeline.${entry.step}`, entry.step);
          const parsedData = typeof entry.data === 'string' ? JSON.parse(entry.data) : entry.data;
          const isExpanded = expanded[i];

          return (
            <div key={i} className="relative flex items-start gap-3 pl-1">
              <div className={`relative z-10 w-10 h-10 rounded-full ${stageConfig.color} border-2 flex items-center justify-center text-sm shrink-0`}>
                {stageConfig.icon}
              </div>
              <div className="flex-1 pb-2">
                <button onClick={() => toggleExpand(i)} className="w-full text-left">
                  <div className="flex items-center justify-between">
                    <p className={`font-semibold ${stageConfig.textColor}`}>{label}</p>
                    <span className="text-honey-400 text-xs">{isExpanded ? '▾' : '▸'}</span>
                  </div>
                  <p className="text-xs text-honey-500 mt-0.5">{stageConfig.summary(parsedData)}</p>
                  <p className="text-xs text-honey-400 mt-0.5">{new Date(entry.timestamp).toLocaleString()}</p>
                </button>
                {isExpanded && (
                  <>
                    <StageDetail data={parsedData} />
                    <div className="mt-2 bg-honey-50 rounded-lg p-3 font-mono text-xs space-y-1">
                      <p className="text-honey-400"><span className="text-honey-500">{t('timeline.prevHash')}:</span> <span className="text-honey-600">{entry.prevHash?.substring(0, 32)}...</span></p>
                      <p className="text-honey-400"><span className="text-honey-500">{t('timeline.currHash')}:</span> <span className="text-honey-600">{entry.currentHash?.substring(0, 32)}...</span></p>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
