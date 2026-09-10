import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Landing() {
  const { t } = useTranslation();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-honey-50 via-white to-honey-100 py-20 px-4">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, #D4A017 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="text-6xl mb-6">🍯</div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-honey-900 mb-4">
            {t('landing.heroTitle')}
          </h1>
          <p className="text-xl md:text-2xl text-honey-600 mb-3 font-medium">
            {t('landing.heroSubtitle')}
          </p>
          <p className="text-honey-500 max-w-2xl mx-auto mb-8">
            {t('landing.heroDesc')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/verify/1" className="btn-primary text-lg py-3 px-8">
              🔍 {t('landing.scanDemo')}
            </Link>
            <Link to="/login" className="btn-secondary text-lg py-3 px-8">
              {t('nav.login')}
            </Link>
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-honey-800 mb-12">{t('landing.problemTitle')}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="font-bold text-honey-800 mb-2">{t('landing.counterfeitTitle')}</h3>
              <p className="text-sm text-honey-600">{t('landing.counterfeitDesc')}</p>
            </div>
            <div className="card text-center">
              <div className="text-4xl mb-4">🔗</div>
              <h3 className="font-bold text-honey-800 mb-2">{t('landing.noTraceTitle')}</h3>
              <p className="text-sm text-honey-600">{t('landing.noTraceDesc')}</p>
            </div>
            <div className="card text-center">
              <div className="text-4xl mb-4">📉</div>
              <h3 className="font-bold text-honey-800 mb-2">{t('landing.weakMarketTitle')}</h3>
              <p className="text-sm text-honey-600">{t('landing.weakMarketDesc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture / Solution */}
      <section className="py-16 px-4 bg-honey-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-honey-800 mb-4">{t('landing.solutionTitle')}</h2>
          <p className="text-center text-honey-500 mb-12 max-w-2xl mx-auto">{t('landing.solutionDesc')}</p>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="card border-l-4 border-l-green-500">
              <h3 className="font-bold text-honey-800 text-lg mb-3">🔬 {t('landing.verificationBranch')}</h3>
              <ul className="space-y-2 text-sm text-honey-600">
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>{t('landing.nirAnalysis')}</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>{t('landing.aiScoring')}</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>{t('landing.bloomCalendar')}</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>{t('landing.blockchain')}</li>
                <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>{t('landing.qrCodes')}</li>
              </ul>
            </div>
            <div className="card border-l-4 border-l-blue-500">
              <h3 className="font-bold text-honey-800 text-lg mb-3">🐝 {t('landing.smartHiveBranch')}</h3>
              <ul className="space-y-2 text-sm text-honey-600">
                <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">✓</span>{t('landing.iotSensors')}</li>
                <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">✓</span>{t('landing.diseaseDetection')}</li>
                <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">✓</span>{t('landing.digitalTwin')}</li>
                <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">✓</span>{t('landing.forecasting')}</li>
                <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">✓</span>{t('landing.alerts')}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Role Links */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-honey-800 mb-12">{t('landing.platformAccess')}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link to="/login" className="card hover:shadow-lg transition-all group text-center">
              <div className="text-4xl mb-3">👨‍🌾</div>
              <h3 className="font-bold text-honey-800 group-hover:text-honey-600">{t('landing.beekeeperPortal')}</h3>
              <p className="text-sm text-honey-500 mt-1">{t('landing.beekeeperDesc')}</p>
            </Link>
            <Link to="/login" className="card hover:shadow-lg transition-all group text-center">
              <div className="text-4xl mb-3">🏭</div>
              <h3 className="font-bold text-honey-800 group-hover:text-honey-600">{t('landing.collectionCenter')}</h3>
              <p className="text-sm text-honey-500 mt-1">{t('landing.collectionCenterDesc')}</p>
            </Link>
            <Link to="/login" className="card hover:shadow-lg transition-all group text-center">
              <div className="text-4xl mb-3">🏛️</div>
              <h3 className="font-bold text-honey-800 group-hover:text-honey-600">{t('landing.kvicOfficial')}</h3>
              <p className="text-sm text-honey-500 mt-1">{t('landing.kvicDesc')}</p>
            </Link>
            <Link to="/login" className="card hover:shadow-lg transition-all group text-center">
              <div className="text-4xl mb-3">🛒</div>
              <h3 className="font-bold text-honey-800 group-hover:text-honey-600">{t('landing.consumerPortal')}</h3>
              <p className="text-sm text-honey-500 mt-1">{t('landing.consumerDesc')}</p>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-gradient-to-r from-honey-700 to-honey-900 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">{t('landing.ctaTitle')}</h2>
          <p className="text-honey-200 mb-8">{t('landing.ctaDesc')}</p>
          <Link to="/verify/1" className="inline-block bg-white text-honey-800 font-bold py-3 px-8 rounded-lg hover:bg-honey-50 transition-all text-lg">
            🔍 {t('landing.tryDemo')}
          </Link>
        </div>
      </section>
    </div>
  );
}
