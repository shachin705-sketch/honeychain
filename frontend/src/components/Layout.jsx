import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import AlertBell from './AlertBell';

export default function Layout({ children }) {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const handleLogout = () => { logout(); navigate('/'); };

  const NAV_LINKS = {
    beekeeper: [
      { to: '/beekeeper', label: t('nav.dashboard') },
      { to: '/hive', label: t('nav.smartHive') },
    ],
    admin: [
      { to: '/admin', label: t('nav.verificationCenter') },
    ],
    kvic: [
      { to: '/kvic', label: t('nav.kvicOverview') },
    ],
    consumer: [
      { to: '/consumer', label: t('nav.dashboard') },
      { to: '/consumer/scan', label: t('nav.scanQR') },
      { to: '/consumer/orders', label: t('nav.myOrders') },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-white border-b border-honey-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl">🍯</span>
              <span className="text-xl font-bold text-honey-800">MadhuPramaan</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {isAuthenticated && NAV_LINKS[user.role]?.map(link => (
                <Link key={link.to} to={link.to}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === link.to ? 'bg-honey-100 text-honey-800' : 'text-honey-600 hover:bg-honey-50'
                  }`}>{link.label}</Link>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              {isAuthenticated && user.role === 'beekeeper' && <AlertBell />}
              {isAuthenticated ? (
                <>
                  <span className="text-sm text-honey-600 hidden sm:block">Hi, {user.name}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-honey-100 text-honey-700 font-medium hidden sm:block">{user.role}</span>
                  <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-700 font-medium">{t('nav.logout')}</button>
                </>
              ) : (
                <Link to="/login" className="btn-primary text-sm py-2 px-4">{t('nav.login')}</Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1">{children}</main>

      <footer className="bg-honey-900 text-honey-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm">MadhuPramaan — KVIC Honey Mission | Smart India Hackathon 2026</p>
          <p className="text-xs text-honey-400 mt-1">Every drop traced, every hive connected</p>
        </div>
      </footer>
    </div>
  );
}
