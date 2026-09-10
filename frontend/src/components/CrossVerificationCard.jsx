import { useTranslation } from 'react-i18next';

function getIcon(passed, isPollen, t) {
  if (isPollen) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100" title="Lab microscopy">
        <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      </span>
    );
  }
  if (passed) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100">
        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100">
      <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    </span>
  );
}

export default function CrossVerificationCard({ report, detailed }) {
  const { t } = useTranslation();
  if (!report) return null;

  var consistency = Math.max(0, 100 - (report.riskScore || 0));

  var bannerConfig = {
    VERIFIED_AUTHENTIC: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: '\u2705', labelKey: 'crossVerification.verified' },
    REVIEW_RECOMMENDED: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: '\u26A0\uFE0F', labelKey: 'crossVerification.reviewRequired' },
    HIGH_RISK: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: '\u274C', labelKey: 'crossVerification.highRisk' }
  };
  var defaultBanner = { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', icon: '\u2753', labelKey: 'crossVerification.unknown' };
  var banner = bannerConfig[report.riskBand] || defaultBanner;

  var checklistItems = [
    { label: t('crossVerification.claimedOrigin'), passed: report.floralSourceMatch },
    { label: t('crossVerification.weatherConsistency'), passed: report.timingMatch },
    { label: t('crossVerification.vegetationSignal'), passed: report.ndviSupport },
    { label: t('crossVerification.nirProfile'), passed: report.nirWithinRange },
    { label: t('crossVerification.pollenEvidence'), passed: false, isPollen: true }
  ];

  var bannerClass = 'mt-5 ' + banner.bg + ' ' + banner.border + ' border rounded-lg py-3 text-center';
  var bannerTextClass = 'font-bold text-sm ' + banner.text;

  var items = checklistItems.map(function (item, i) {
    return (
      <div key={i} className="flex justify-between items-center">
        <span className="text-sm text-honey-700">{item.label}</span>
        {getIcon(item.passed, item.isPollen, t)}
      </div>
    );
  });

  return (
    <div className="bg-white rounded-2xl shadow-md border-2 border-honey-200 p-6 max-w-md mx-auto">
      <div className="text-center mb-2">
        <h3 className="text-xs font-extrabold text-honey-800 uppercase" style={{letterSpacing: '0.2em'}}>{t('crossVerification.title')}</h3>
        <p className="text-sm text-honey-500 mt-0.5">{t('crossVerification.subtitle')}</p>
      </div>
      <div className="border-t border-honey-200 my-4" />
      <div className="space-y-3">
        {items}
      </div>
      {detailed ? (
        <div className="mt-5 pt-4 border-t border-honey-100">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-honey-600">{t('crossVerification.overallConsistency')}</span>
            <span className="text-2xl font-bold text-honey-800">{consistency}%</span>
          </div>
        </div>
      ) : null}
      <div className={bannerClass}>
        <span className={bannerTextClass}>
          {banner.icon} {t(banner.labelKey)}
        </span>
      </div>
    </div>
  );
}
