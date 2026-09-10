import { useState, useEffect, useRef, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import GaugeWidget from '../components/GaugeWidget';
import api from '../api/client';

export default function HiveMonitoring() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [history, setHistory] = useState([]);
  const [sliders, setSliders] = useState({ weight_kg: 22, temperature: 32, humidity: 55, acoustic_score: 65 });
  const [prediction, setPrediction] = useState(null);
  const [diseaseResult, setDiseaseResult] = useState(null);
  const [diseaseType, setDiseaseType] = useState('');
  const [loading, setLoading] = useState(false);
  const [audioResult, setAudioResult] = useState(null);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [waveform, setWaveform] = useState(null);
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const canvasRef = useRef(null);
  const audioUrlRef = useRef(null);
  const autoAnalyzeRef = useRef(false);

  useEffect(() => {
    api.get('/hive/sensor-data/' + user.id).then(r => setHistory(r.data)).catch(() => {});
  }, [user.id]);

  useEffect(() => {
    computePrediction();
  }, [sliders, history]);

  useEffect(() => {
    if (waveform && audioBlob) drawWaveform(audioBlob);
  }, [waveform, audioBlob]);

  useEffect(() => {
    if (audioBlob && autoAnalyzeRef.current) {
      autoAnalyzeRef.current = false;
      submitAudio();
    }
  }, [audioBlob]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const updateSlider = (k, v) => setSliders(prev => ({ ...prev, [k]: parseFloat(v) }));

  const computePrediction = useCallback(async () => {
    try {
      const { data } = await api.post('/hive/digital-twin', { ...sliders, history: history.slice(-15) });
      setPrediction(data);
      if (data.alert) {
        showToast({
          message: data.alert.message,
          phone: data.alert.deliveredTo,
          severity: data.alert.severity,
          webDelivered: data.alert.webDelivered,
          smsDelivered: data.alert.smsDelivered,
          smsError: data.alert.smsError,
          simulated: data.alert.simulated
        });
      }
    } catch (e) { /* ignore */ }
  }, [sliders, history]);

  const advanceDay = async () => {
    try {
      await api.post('/hive/advance-day', sliders);
      const { data } = await api.get('/hive/sensor-data/' + user.id);
      setHistory(data);
    } catch (e) { setError('Failed to advance day'); }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setDiseaseType('image');
    setDiseaseResult(null);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await api.post('/hive/disease/image', formData);
      setDiseaseResult(data);
      if (data.alert) {
        showToast({
          message: data.alert.message,
          phone: data.alert.deliveredTo,
          severity: data.alert.severity,
          webDelivered: data.alert.webDelivered,
          smsDelivered: data.alert.smsDelivered,
          smsError: data.alert.smsError,
          simulated: data.alert.simulated
        });
      }
    } catch (err) {
      setError('Image detection failed — please try again');
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setWaveform(true);
        stream.getTracks().forEach(t => t.stop());
        autoAnalyzeRef.current = true;
      };

      mediaRecorder.start();
      setRecording(true);
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') mediaRecorder.stop();
        setRecording(false);
      }, 5000);
    } catch (err) {
      setError('Microphone access denied — please allow mic permission and try again');
    }
  };

  const drawWaveform = async (blob) => {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const channelData = audioBuffer.getChannelData(0);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = '#D4A017';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const sliceWidth = w / channelData.length;
      let x = 0;
      for (let i = 0; i < channelData.length; i++) {
        const v = channelData[i];
        const y = (v + 1) / 2 * h;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.stroke();
    } catch (e) { /* waveform render failure is non-critical */ }
  };

  const submitAudio = async () => {
    if (!audioBlob) return;
    setLoading(true);
    setDiseaseType('audio');
    setAudioResult(null);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'hive-recording.webm');
      const { data } = await api.post('/hive/disease/audio', formData);
      setAudioResult(data);
      if (data.alert) {
        showToast({
          message: data.alert.message,
          phone: data.alert.deliveredTo,
          severity: data.alert.severity,
          webDelivered: data.alert.webDelivered,
          smsDelivered: data.alert.smsDelivered,
          smsError: data.alert.smsError,
          simulated: data.alert.simulated
        });
      }
    } catch (err) {
      setError('Audio detection failed — please try again');
    } finally {
      setLoading(false);
    }
  };

  const chartData = history.slice(-30).map(h => ({
    day: `Day ${h.day_index + 1}`,
    weight: h.weight_kg,
    temp: h.temperature,
    humidity: h.humidity,
    acoustic: h.acoustic_score
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-honey-800 mb-2">Smart Hive Monitoring</h1>
      <p className="text-honey-500 mb-8">IoT Simulator — adjust sensors, advance days, observe AI predictions</p>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
          <span className="text-red-500 text-lg">⚠️</span>
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* IoT Simulator Controls */}
      <div className="card mb-8">
        <h2 className="text-xl font-bold text-honey-800 mb-4">🎛️ IoT Sensor Simulator</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { key: 'weight_kg', label: 'Hive Weight', unit: 'kg', min: 10, max: 35, color: '#D4A017' },
            { key: 'temperature', label: 'Temperature', unit: '°C', min: 15, max: 45, color: '#EF4444' },
            { key: 'humidity', label: 'Humidity', unit: '%', min: 20, max: 95, color: '#3B82F6' },
            { key: 'acoustic_score', label: 'Acoustic Activity', unit: '/100', min: 0, max: 100, color: '#10B981' }
          ].map(s => (
            <div key={s.key}>
              <label className="text-sm font-medium text-honey-700 mb-2 block">{s.label}</label>
              <input type="range" min={s.min} max={s.max} step="0.5"
                value={sliders[s.key]} onChange={e => updateSlider(s.key, e.target.value)}
                className="w-full accent-honey-500" />
              <div className="flex justify-between text-xs text-honey-500 mt-1">
                <span>{s.min}{s.unit}</span>
                <span className="font-bold text-honey-700">{sliders[s.key]}{s.unit}</span>
                <span>{s.max}{s.unit}</span>
              </div>
            </div>
          ))}
        </div>
        <button onClick={advanceDay} className="btn-primary mt-6">
          ⏭️ Advance Simulated Day
        </button>
      </div>

      {/* Gauges + Digital Twin */}
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div className="card">
          <h2 className="text-xl font-bold text-honey-800 mb-4">Live Sensor Gauges</h2>
          <div className="flex justify-around">
            <GaugeWidget value={sliders.temperature} label="Temperature" unit="°C" min={15} max={45} />
            <GaugeWidget value={sliders.humidity} label="Humidity" unit="%" min={20} max={95} />
          </div>
          <div className="flex justify-around mt-4">
            <GaugeWidget value={sliders.weight_kg} label="Weight" unit="kg" min={10} max={35} />
            <GaugeWidget value={sliders.acoustic_score} label="Acoustic" unit="/100" min={0} max={100} />
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-honey-800 mb-4">🧠 Digital Twin Prediction</h2>
          {prediction ? (
            <div>
              <div className={`p-4 rounded-xl mb-4 ${
                prediction.riskLevel === 'high' ? 'bg-red-50 border border-red-200' :
                prediction.riskLevel === 'medium' ? 'bg-yellow-50 border border-yellow-200' :
                'bg-green-50 border border-green-200'
              }`}>
                <p className={`font-bold text-lg ${
                  prediction.riskLevel === 'high' ? 'text-red-700' :
                  prediction.riskLevel === 'medium' ? 'text-yellow-700' : 'text-green-700'
                }`}>{prediction.prediction}</p>
              </div>
              <p className="text-sm text-honey-600 mb-3">{prediction.reasoning}</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-honey-50 p-2 rounded-lg">
                  <span className="text-honey-500">Weight Slope:</span>
                  <span className="ml-1 font-bold text-honey-700">{prediction.weightSlope} kg/day</span>
                </div>
                <div className="bg-honey-50 p-2 rounded-lg">
                  <span className="text-honey-500">Avg Acoustic:</span>
                  <span className="ml-1 font-bold text-honey-700">{prediction.avgAcoustic}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-honey-500">Adjust sliders to see predictions</p>
          )}
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="card mb-8">
          <h2 className="text-xl font-bold text-honey-800 mb-4">📈 Weight Trend (Last 30 Days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="day" stroke="#B8860B" fontSize={12} />
              <YAxis stroke="#B8860B" unit=" kg" />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #FFECB3' }} />
              <Line type="monotone" dataKey="weight" stroke="#D4A017" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div className="card">
          <h2 className="text-xl font-bold text-honey-800 mb-2">📸 Image Disease Detection</h2>
          <p className="text-sm text-honey-500 mb-4">Upload a photo of hive frames for visual inspection</p>
          <label className="block w-full border-2 border-dashed border-honey-300 rounded-xl p-8 text-center cursor-pointer hover:border-honey-500 transition-colors">
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            <span className="text-3xl">📷</span>
            <p className="text-sm text-honey-500 mt-2">Click or drag to upload image</p>
          </label>
          {loading && diseaseType === 'image' && (
            <div className="mt-4 p-4 rounded-xl bg-honey-50 border border-honey-200 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-honey-400 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-honey-600">Analyzing image...</p>
            </div>
          )}
          {!loading && diseaseType === 'image' && diseaseResult && (
            <div className={`mt-4 p-4 rounded-xl ${diseaseResult.result.includes('Healthy') ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <p className={`font-bold ${diseaseResult.result.includes('Healthy') ? 'text-green-700' : 'text-red-700'}`}>{diseaseResult.result}</p>
              <p className="text-sm text-honey-500 mt-1">Confidence: {diseaseResult.confidence}%</p>
            </div>
          )}
          <p className="text-xs text-honey-400 mt-3 italic">SIMULATED — deterministic mock based on file signature. Production uses a trained CNN classifier (fine-tuned ResNet) on hive frame images.</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-honey-800 mb-2">🎙️ Audio Disease Detection</h2>
          <p className="text-sm text-honey-500 mb-4">Record 5 seconds of hive sound for acoustic analysis</p>
          <div className="space-y-3">
            <button onClick={startRecording} disabled={recording || loading}
              className={`w-full py-3 rounded-xl font-semibold transition-all ${recording ? 'bg-red-100 text-red-700 animate-pulse' : loading && diseaseType === 'audio' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-honey-100 text-honey-700 hover:bg-honey-200'}`}>
              {recording ? '🔴 Recording... (5 seconds)' : loading && diseaseType === 'audio' ? '⏳ Analyzing...' : '🎙️ Start Recording'}
            </button>
            <label className="block w-full border-2 border-dashed border-honey-300 rounded-xl p-4 text-center cursor-pointer hover:border-honey-500 transition-colors">
              <input type="file" accept="audio/*" onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const blob = new Blob([await file.arrayBuffer()], { type: file.type });
                setAudioBlob(blob);
                setWaveform(true);
                autoAnalyzeRef.current = true;
              }} className="hidden" />
              <p className="text-sm text-honey-500">Or upload audio file</p>
            </label>
            {audioBlob && (
              <audio controls src={URL.createObjectURL(audioBlob)} className="w-full rounded-lg" />
            )}
            {waveform && <canvas ref={canvasRef} width={400} height={80} className="w-full rounded-lg bg-honey-50" />}
            {audioBlob && !recording && !loading && !audioResult && (
              <button onClick={submitAudio} className="btn-primary w-full">
                🔬 Analyze Audio
              </button>
            )}
          </div>
          {loading && diseaseType === 'audio' && (
            <div className="mt-4 p-4 rounded-xl bg-honey-50 border border-honey-200 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-honey-400 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-honey-600">Analyzing sound pattern...</p>
            </div>
          )}
          {!loading && diseaseType === 'audio' && audioResult && (
            <div className={`mt-4 p-4 rounded-xl ${audioResult.result.includes('Healthy') ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <p className={`font-bold ${audioResult.result.includes('Healthy') ? 'text-green-700' : 'text-red-700'}`}>{audioResult.result}</p>
              <p className="text-sm text-honey-500 mt-1">Confidence: {audioResult.confidence}%</p>
            </div>
          )}
          <p className="text-xs text-honey-400 mt-3 italic">SIMULATED — deterministic mock based on file signature. Production uses a trained audio classifier (YAMNet/VGGish) on hive acoustic recordings.</p>
        </div>
      </div>
    </div>
  );
}
