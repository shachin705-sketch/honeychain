import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/client';

const FLORAL_SOURCES = ['mustard', 'wildflower', 'eucalyptus', 'litchi', 'jamun', 'multiflora'];
const REGIONS = ['Punjab', 'Haryana', 'Kerala', 'Uttar Pradesh', 'Maharashtra', 'Rajasthan', 'Madhya Pradesh'];

export default function LogHarvest() {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    harvest_date: new Date().toISOString().split('T')[0],
    floral_source: 'mustard',
    quantity_kg: '',
    location_lat: '',
    location_lng: '',
    location_region: 'Punjab'
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/beekeeper/batches', {
        ...form,
        quantity_kg: parseFloat(form.quantity_kg),
        location_lat: parseFloat(form.location_lat) || 30.9,
        location_lng: parseFloat(form.location_lng) || 75.8
      });
      setSuccess(true);
      setTimeout(() => navigate('/beekeeper'), 1500);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to log harvest');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-honey-800 mb-2">{t('logHarvest.success')}</h2>
        <p className="text-honey-500">{t('logHarvest.redirecting')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-honey-800 mb-6">{t('logHarvest.title')}</h1>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-honey-700 mb-1">{t('logHarvest.harvestDate')}</label>
            <input type="date" value={form.harvest_date} onChange={e => update('harvest_date', e.target.value)} className="input-field" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-honey-700 mb-1">{t('logHarvest.floralSource')}</label>
            <select value={form.floral_source} onChange={e => update('floral_source', e.target.value)} className="input-field">
              {FLORAL_SOURCES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-honey-700 mb-1">{t('logHarvest.quantity')}</label>
            <input type="number" step="0.1" min="0.1" value={form.quantity_kg} onChange={e => update('quantity_kg', e.target.value)} className="input-field" required placeholder="e.g. 12.5" />
          </div>

          <div>
            <label className="block text-sm font-medium text-honey-700 mb-1">{t('logHarvest.region')}</label>
            <select value={form.location_region} onChange={e => update('location_region', e.target.value)} className="input-field">
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-honey-700 mb-1">{t('logHarvest.latitude')}</label>
              <input type="number" step="0.0001" value={form.location_lat} onChange={e => update('location_lat', e.target.value)} className="input-field" placeholder="30.9010" />
            </div>
            <div>
              <label className="block text-sm font-medium text-honey-700 mb-1">{t('logHarvest.longitude')}</label>
              <input type="number" step="0.0001" value={form.location_lng} onChange={e => update('location_lng', e.target.value)} className="input-field" placeholder="75.8573" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? t('logHarvest.logging') : t('logHarvest.logButton')}
          </button>
        </form>
      </div>
    </div>
  );
}
