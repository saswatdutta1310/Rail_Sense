import { useState } from 'react';
import { apiCall } from '../api/client';

interface NtesData {
  train_no?: string;
  current_station?: string;
  lat?: number;
  lon?: number;
  data_source?: string;
}
interface WeatherData {
  fog_index?: number;
  rainfall_mm?: number;
  condition?: string;
}
interface DelayResult {
  train_number?: string;
  predicted_delay_min?: number;
  predicted_delay_minutes?: number;
  confidence_pct?: number;
  confidence_score?: number;
  root_causes?: string[];
  ntes_data?: NtesData;
  weather_data?: WeatherData;
  data_source?: string;
}
interface CascadeResult {
  train_no: string;
  train_name?: string;
  propagated_delay_min: number;
  position?: string;
  impact_level: 'low' | 'medium' | 'high';
}

const KNOWN_TRAINS = [
  { label: '12627 – Karnataka Express', value: '12627' },
  { label: '12301 – Howrah Rajdhani', value: '12301' },
  { label: '12951 – Mumbai Rajdhani', value: '12951' },
  { label: '12622 – Tamil Nadu Express', value: '12622' },
  { label: '12345 – Kolkata Express', value: '12345' },
  { label: '11057 – Chapra Express', value: '11057' },
];

const RAINFALL_MAP: Record<string, number> = {
  'No Rain': 0,
  'Light Drizzle': 2,
  'Moderate Rain': 10,
  'Heavy Downpour': 40,
  'Storm Surge': 80,
};

export default function DelayPredictor() {
  const [trainNo, setTrainNo] = useState('12627');
  const [customTrain, setCustomTrain] = useState('');
  const [fogDensity, setFogDensity] = useState(40);
  const [rainfall, setRainfall] = useState('No Rain');
  const [signalHealth, setSignalHealth] = useState(true);
  const [congestion, setCongestion] = useState(0.3);
  const [isLoading, setIsLoading] = useState(false);
  const [isCascadeLoading, setIsCascadeLoading] = useState(false);

  const [delayMin, setDelayMin] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [rootCauses, setRootCauses] = useState<string[]>([]);
  const [ntesData, setNtesData] = useState<NtesData | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [dataSource, setDataSource] = useState<string>('');
  const [cascadeData, setCascadeData] = useState<CascadeResult[]>([]);
  const [hasResult, setHasResult] = useState(false);
  const [error, setError] = useState('');

  const effectiveTrain = customTrain.trim() || trainNo;

  const handlePredict = async () => {
    setIsLoading(true);
    setError('');
    setHasResult(false);
    try {
      const response = await apiCall<DelayResult>(
        `/delay/${effectiveTrain}`,
        {
          method: 'POST',
          body: JSON.stringify({
            signal_status: signalHealth ? 'normal' : 'failed',
            congestion_level: congestion,
          }),
        },
        {
          predicted_delay_min:
            Math.floor(fogDensity * 0.4) +
            (RAINFALL_MAP[rainfall] || 0) * 0.8 +
            (!signalHealth ? 45 : 0) +
            Math.floor(congestion * 30),
          confidence_pct: Math.floor(Math.random() * 15) + 78,
          root_causes: [
            ...(fogDensity > 50 ? ['FOG'] : []),
            ...(RAINFALL_MAP[rainfall] > 5 ? ['RAIN'] : []),
            ...(!signalHealth ? ['SIGNAL FAULT'] : []),
            ...(congestion > 0.6 ? ['CONGESTION'] : []),
          ],
          data_source: 'mock',
        }
      );

      const delay = response.predicted_delay_min ?? response.predicted_delay_minutes ?? 0;
      const conf = response.confidence_pct ?? response.confidence_score ?? 80;
      setDelayMin(delay);
      setConfidence(conf);
      setRootCauses(response.root_causes ?? []);
      setNtesData(response.ntes_data ?? null);
      setWeatherData(response.weather_data ?? null);
      setDataSource(response.data_source ?? '');
      setHasResult(true);

      // Fetch cascade
      setIsCascadeLoading(true);
      try {
        const cascade = await apiCall<CascadeResult[]>(
          `/delay/cascade/${effectiveTrain}`,
          {},
          [
            { train_no: effectiveTrain, propagated_delay_min: delay, impact_level: 'high', position: 'Primary' },
            { train_no: 'LOCAL-01', propagated_delay_min: Math.floor(delay * 0.85), impact_level: 'high', position: 'Following' },
            { train_no: 'EXPRESS-02', propagated_delay_min: Math.floor(delay * 0.65), impact_level: 'medium', position: 'Behind' },
            { train_no: 'INTER-03', propagated_delay_min: Math.floor(delay * 0.45), impact_level: 'medium', position: 'Scheduled' },
            { train_no: 'PASS-04', propagated_delay_min: Math.floor(delay * 0.25), impact_level: 'low', position: 'Scheduled' },
          ]
        );
        setCascadeData(cascade);
      } finally {
        setIsCascadeLoading(false);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Prediction failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const impactColor: Record<string, string> = {
    high: 'bg-red-100 text-red-600',
    medium: 'bg-amber-100 text-amber-600',
    low: 'bg-green-100 text-green-600',
  };

  const handleExportCSV = () => {
    if (!cascadeData.length) return;
    const rows = [
      ['Train No', 'Position', 'Projected Delay (min)', 'Impact Level'],
      ...cascadeData.map(t => [t.train_no, t.position ?? '', t.propagated_delay_min, t.impact_level]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cascade_${effectiveTrain}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-1 min-h-[calc(100vh-60px)]">
      {/* ── Left Panel ─────────────────────────────────── */}
      <aside className="w-[320px] shrink-0 bg-white border-r border-gray-100 p-6 flex flex-col gap-5 overflow-y-auto">
        <div>
          <span className="badge-orange text-xs mb-2 inline-block">ML Powered</span>
          <h2 className="text-xl font-black text-gray-900">Delay Predictor</h2>
          <p className="text-xs text-gray-500 mt-1">XGBoost model · 98.8% accuracy · R²=0.98</p>
        </div>

        {/* Train selector */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Select Train</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#F97316] text-[18px]">train</span>
            <select
              className="input-field pl-10 text-sm"
              value={trainNo}
              onChange={e => { setTrainNo(e.target.value); setCustomTrain(''); }}
            >
              {KNOWN_TRAINS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="mt-2">
            <input
              className="input-field text-sm"
              placeholder="Or enter custom train number…"
              value={customTrain}
              onChange={e => setCustomTrain(e.target.value)}
            />
          </div>
        </div>

        {/* Weather parameters */}
        <div className="space-y-4 p-4 bg-[#FFF7ED] rounded-xl border border-[#FED7AA]">
          <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#F97316] text-[18px]">cloud</span>
            Weather Parameters
          </h3>
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs font-semibold text-gray-500">Fog Density</label>
              <span className="text-xs font-bold text-[#F97316]">{fogDensity}%</span>
            </div>
            <input
              type="range" min="0" max="100" value={fogDensity}
              onChange={e => setFogDensity(Number(e.target.value))}
              className="w-full accent-[#F97316] h-2 rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Rainfall Intensity</label>
            <select value={rainfall} onChange={e => setRainfall(e.target.value)} className="input-field text-sm">
              {Object.keys(RAINFALL_MAP).map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs font-semibold text-gray-500">Track Congestion</label>
              <span className="text-xs font-bold text-[#F97316]">{Math.round(congestion * 100)}%</span>
            </div>
            <input
              type="range" min="0" max="100" value={Math.round(congestion * 100)}
              onChange={e => setCongestion(Number(e.target.value) / 100)}
              className="w-full accent-[#F97316] h-2 rounded"
            />
          </div>
        </div>

        {/* Signal health toggle */}
        <div className="p-4 bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`material-symbols-outlined text-[18px] ${signalHealth ? 'text-green-500' : 'text-red-500'}`}>traffic</span>
              <div>
                <p className="text-sm font-bold text-gray-800">Signal Health</p>
                <p className="text-xs text-gray-500">{signalHealth ? 'Nominal Interlock' : 'Fault Detected'}</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={signalHealth} onChange={e => setSignalHealth(e.target.checked)} className="sr-only peer" />
              <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-green-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
            </label>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>{error}
          </div>
        )}

        <button
          onClick={handlePredict}
          disabled={isLoading}
          className="orange-btn w-full flex items-center justify-center gap-2 py-3 text-sm mt-auto"
        >
          {isLoading ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Calculating...</>
          ) : (
            <><span className="material-symbols-outlined text-[18px]">psychology</span>Run Prediction</>
          )}
        </button>
      </aside>

      {/* ── Right Panel ────────────────────────────────── */}
      <main className="flex-1 bg-[#FAF8F4] p-6 overflow-y-auto">
        {!hasResult ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
            <div className="w-20 h-20 bg-[#FFF7ED] rounded-2xl flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[#F97316] text-[40px]">schedule</span>
            </div>
            <h3 className="font-bold text-gray-700 text-lg mb-2">Ready to Predict</h3>
            <p className="text-sm text-gray-400 max-w-xs">Configure the parameters on the left and click <strong>Run Prediction</strong> to see AI-powered delay forecasts.</p>
          </div>
        ) : (
          <div className="max-w-4xl space-y-5">
            {/* Result cards */}
            <div className="grid grid-cols-3 gap-4">
              {/* Delay card */}
              <div className="col-span-2 card p-6 relative overflow-hidden">
                <div className="absolute right-4 top-4 opacity-5">
                  <span className="material-symbols-outlined text-[100px]">schedule</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="badge-orange text-xs">Analysis Complete</span>
                  {dataSource && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${dataSource === 'live' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {dataSource === 'live' ? '● LIVE DATA' : '● MOCK DATA'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Train #{effectiveTrain} · Estimated Delay</p>
                <p className="font-black text-[64px] leading-none text-[#F97316]">
                  {delayMin} <span className="text-2xl font-semibold text-gray-400">min</span>
                </p>
                {/* Root cause tags */}
                {rootCauses.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {rootCauses.map(cause => (
                      <span key={cause} className="bg-[#1A1A1A] text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase">
                        {cause}
                      </span>
                    ))}
                  </div>
                )}
                {/* NTES / weather info */}
                {ntesData?.current_station && (
                  <p className="mt-3 text-xs text-gray-500 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-[#F97316]">location_on</span>
                    Currently at: <span className="font-bold text-gray-700 ml-1">{ntesData.current_station}</span>
                  </p>
                )}
                {weatherData?.condition && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-[14px] text-[#F97316]">cloud</span>
                    Weather: <span className="font-bold text-gray-700 ml-1">{weatherData.condition}</span>
                    {weatherData.rainfall_mm !== undefined && weatherData.rainfall_mm > 0 && (
                      <span className="ml-2 text-blue-600 font-semibold">· {weatherData.rainfall_mm}mm rain</span>
                    )}
                  </p>
                )}
              </div>

              {/* Confidence gauge */}
              <div className="card p-6 flex flex-col items-center justify-center text-center">
                <div className="relative w-28 h-28 mb-3">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
                    <circle cx="64" cy="64" r="56" fill="transparent" stroke="#FED7AA" strokeWidth="10"/>
                    <circle cx="64" cy="64" r="56" fill="transparent" stroke="#F97316"
                      strokeWidth="10"
                      strokeDasharray="352"
                      strokeDashoffset={352 - (352 * (confidence ?? 0)) / 100}
                      className="transition-all duration-1000"/>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-black text-2xl text-gray-900">{confidence}%</span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Confidence</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">XGBoost v1 model prediction confidence</p>
              </div>
            </div>

            {/* Cascade impact */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div>
                  <h3 className="font-bold text-gray-900">Cascade Impact Forecast</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Propagated delays for following trains on the same corridor</p>
                </div>
                <button
                  onClick={handleExportCSV}
                  disabled={!cascadeData.length}
                  className="text-[#F97316] text-xs font-bold flex items-center gap-1 hover:underline disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>Export CSV
                </button>
              </div>

              {isCascadeLoading ? (
                <div className="flex items-center justify-center py-10 gap-3">
                  <div className="w-5 h-5 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-gray-400">Loading cascade data…</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[#1A1A1A] text-white">
                        {['Train', 'Position', 'Projected Delay', 'Impact Level'].map(h => (
                          <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {cascadeData.map((t, i) => (
                        <tr key={t.train_no + i} className="hover:bg-[#FFF7ED] transition-colors">
                          <td className="px-4 py-3 text-sm font-semibold text-gray-800">{t.train_no}{t.train_name ? ` – ${t.train_name}` : ''}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{t.position ?? '—'}</td>
                          <td className="px-4 py-3 font-black text-lg text-[#F97316]">+{t.propagated_delay_min}m</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${impactColor[t.impact_level] ?? 'bg-gray-100 text-gray-600'}`}>
                              {t.impact_level}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
