export default function GaugeWidget({ value, label, unit, min = 0, max = 100, color = '#D4A017' }) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const r = 45;
  const circumference = Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  let statusColor = color;
  if (label === 'Temperature') {
    statusColor = value > 38 ? '#EF4444' : value < 20 ? '#3B82F6' : '#10B981';
  } else if (label === 'Humidity') {
    statusColor = value > 75 ? '#EF4444' : value < 30 ? '#F59E0B' : '#10B981';
  }

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="75" viewBox="0 0 100 60">
        <path d="M 5 55 A 45 45 0 0 1 95 55" fill="none" stroke="#E5E7EB" strokeWidth="8" strokeLinecap="round" />
        <path d="M 5 55 A 45 45 0 0 1 95 55" fill="none" stroke={statusColor} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }} />
      </svg>
      <div className="text-center -mt-2">
        <span className="text-2xl font-bold" style={{ color: statusColor }}>{typeof value === 'number' ? value.toFixed(1) : value}</span>
        <span className="text-xs text-honey-500 ml-1">{unit}</span>
      </div>
      <span className="text-xs font-medium text-honey-600 mt-1">{label}</span>
    </div>
  );
}
