import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../api/client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(data.token, data.user);
      const redirects = { beekeeper: '/beekeeper', admin: '/admin', kvic: '/kvic', consumer: '/consumer' };
      navigate(redirects[data.user.role] || '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const demoLogins = [
    { label: 'Beekeeper (Rajesh)', email: 'rajesh@demo.com', role: 'beekeeper' },
    { label: 'Admin (Priya)', email: 'priya@demo.com', role: 'admin' },
    { label: 'KVIC Official (Dr. Meena)', email: 'meena@demo.com', role: 'kvic' },
    { label: 'Consumer (Anita)', email: 'anita@demo.com', role: 'consumer' },
  ];

  const fillDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-5xl">🍯</span>
          <h1 className="text-3xl font-bold text-honey-800 mt-4">{t('auth.welcomeBack')}</h1>
          <p className="text-honey-500 mt-2">{t('auth.signInSubtitle')}</p>
        </div>

        <div className="card">
          {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-honey-700 mb-1">{t('auth.email')}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-honey-700 mb-1">{t('auth.password')}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-field" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? t('auth.signingIn') : t('auth.signIn')}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-honey-100">
            <p className="text-xs text-honey-500 mb-3 text-center">{t('auth.quickDemo')}</p>
            <div className="space-y-2">
              {demoLogins.map(d => (
                <button key={d.email} onClick={() => fillDemo(d.email)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-honey-50 hover:bg-honey-100 text-sm transition-colors">
                  <span className="font-medium text-honey-800">{d.label}</span>
                  <span className="text-honey-500 ml-2">({d.email})</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center mt-6 text-sm text-honey-500">
          {t('auth.noAccount')} <Link to="/register" className="text-honey-700 font-semibold hover:underline">{t('auth.register')}</Link>
        </p>
      </div>
    </div>
  );
}
