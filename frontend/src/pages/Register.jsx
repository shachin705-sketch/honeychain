import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../api/client';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'consumer', village: '', cluster: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      login(data.token, data.user);
      const redirects = { beekeeper: '/beekeeper', admin: '/admin', kvic: '/kvic', consumer: '/consumer' };
      navigate(redirects[data.user.role] || '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-5xl">🐝</span>
          <h1 className="text-3xl font-bold text-honey-800 mt-4">{t('auth.joinMadhupramaan')}</h1>
          <p className="text-honey-500 mt-2">{t('auth.registerSubtitle')}</p>
        </div>

        <div className="card">
          {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-honey-700 mb-1">{t('auth.role')}</label>
              <select value={form.role} onChange={e => update('role', e.target.value)} className="input-field">
                <option value="consumer">{t('auth.consumer')}</option>
                <option value="beekeeper">{t('auth.beekeeper')}</option>
                <option value="admin">{t('auth.admin')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-honey-700 mb-1">{t('auth.fullName')}</label>
              <input type="text" value={form.name} onChange={e => update('name', e.target.value)} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-honey-700 mb-1">{t('auth.email')}</label>
              <input type="email" value={form.email} onChange={e => update('email', e.target.value)} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-honey-700 mb-1">{t('auth.password')}</label>
              <input type="password" value={form.password} onChange={e => update('password', e.target.value)} className="input-field" required minLength={6} />
            </div>
            {form.role === 'beekeeper' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-honey-700 mb-1">{t('auth.village')}</label>
                  <input type="text" value={form.village} onChange={e => update('village', e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-honey-700 mb-1">{t('auth.cluster')}</label>
                  <input type="text" value={form.cluster} onChange={e => update('cluster', e.target.value)} className="input-field" />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-honey-700 mb-1">{t('auth.phone')}</label>
              <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} className="input-field" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? t('auth.creatingAccount') : t('auth.createAccount')}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-honey-500">
          {t('auth.haveAccount')} <Link to="/login" className="text-honey-700 font-semibold hover:underline">{t('auth.signInLink')}</Link>
        </p>
      </div>
    </div>
  );
}
