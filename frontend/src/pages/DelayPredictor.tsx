import { useState, useRef } from 'react';
import {
  Search, Signal, Clock, MapPin, CloudRain,
  ChevronDown, ChevronUp, Wind, Droplets,
  AlertTriangle, Zap, Wifi, WifiOff, Thermometer,
} from 'lucide-react';
import axios from 'axios';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface NtesData {
  train_no: string;
  current_station: string;
  lat: number;
  lon: number;
  data_source: 'live' | 'mock';
}

interface WeatherData {
  fog_index: number;
  rainfall_mm: number;
  condition: string;
}

interface PredictionResult {
  predicted_delay_min: number;
  confidence_pct: number;
  root_causes: string[];
  ntes_data: NtesData;
  weather_data: WeatherData;
  data_source: 'live' | 'mock';
}

interface CascadeEntry {
  train_no: string;
  train_name: string;
  propagated_delay_min: number;
  position: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function delayColor(min: number): string {
  if (min < 15)  return 'text-emerald-500';
  if (min <= 60) return 'text-amber-400';
  return 'text-red-500';
}

function impactBadge(min: number): string {
  if (min < 10)  return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
  if (min <= 30) return 'bg-amber-100  text-amber-700  border border-amber-200';
  return               'bg-red-100    text-red-700    border border-red-200';
}

function impactLabel(min: number): string {
  if (min < 10)  return 'Low';
  if (min <= 30) return 'Medium';
  return 'High';
}

/** Map OpenWeather condition strings to an emoji icon */
function weatherEmoji(condition: string): string {
  const c = condition.toLowerCase();
  if (c.includes('fog') || c.includes('mist') || c.includes('haze')) return '🌫️';
  if (c.includes('thunder') || c.includes('storm'))                   return '⛈️';
  if (c.includes('drizzle') || c.includes('rain'))                    return '🌧️';
  if (c.includes('snow') || c.includes('sleet'))                      return '❄️';
  if (c.includes('cloud'))                                            return '☁️';
  if (c.includes('smoke') || c.includes('dust'))                      return '💨';
  return '☀️';
}

const ROOT_CAUSE_STYLES: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
  FOG:                { bg: 'bg-blue-100 text-blue-700 border border-blue-200',       icon: <Wind className="w-3 h-3" />,          label: 'FOG'              },
  SIGNAL:             { bg: 'bg-orange-100 text-orange-700 border border-orange-200', icon: <Zap className="w-3 h-3" />,           label: 'SIGNAL'           },
  RAIN:               { bg: 'bg-cyan-100 text-cyan-700 border border-cyan-200',       icon: <Droplets className="w-3 h-3" />,      label: 'RAIN'             },
  CONGESTION:         { bg: 'bg-red-100 text-red-700 border border-red-200',          icon: <AlertTriangle className="w-3 h-3" />, label: 'CONGESTION'       },
  'PEAK HOURS':       { bg: 'bg-purple-100 text-purple-700 border border-purple-200', icon: <Clock className="w-3 h-3" />,         label: 'PEAK HOURS'       },
  'ROUTE CONGESTION': { bg: 'bg-yellow-100 text-yellow-700 border border-yellow-200', icon: <AlertTriangle className="w-3 h-3" />, label: 'ROUTE CONGESTION' },
  'MINOR DELAY':      { bg: 'bg-gray-100 text-gray-600 border border-gray-200',       icon: <Clock className="w-3 h-3" />,         label: 'MINOR DELAY'      },
  'ON TIME':          { bg: 'bg-green-100 text-green-700 border border-green-200',    icon: <Zap className="w-3 h-3" />,           label: 'ON TIME'          },
  UNKNOWN:            { bg: 'bg-slate-100 text-slate-600 border border-slate-200',    icon: <Clock className="w-3 h-3" />,         label: 'UNKNOWN'          },
};

function RootCauseChip({ cause }: { cause: string }) {
  const style = ROOT_CAUSE_STYLES[cause] ?? ROOT_CAUSE_STYLES.UNKNOWN;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${style.bg}`}>
      {style.icon}
      {style.label}
    </span>
  );
}

/** Green LIVE / Yellow SIMULATED pill badge */
function DataSourceBadge({ source }: { source: 'live' | 'mock' }) {
  if (source === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
        <Wifi className="w-3 h-3" />
        LIVE
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
      <WifiOff className="w-3 h-3" />
      SIMULATED
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function DelayPredictor() {
  const [trainNo, setTrainNo]               = useState('');
  const [signalStatus, setSignalStatus]     = useState('normal');
  const [congestionLevel, setCongestionLevel] = useState(0.5);
  const [result, setResult]                 = useState<PredictionResult | null>(null);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState<string | null>(null);

  // Cascade state — lazy-loaded on first expand
  const [cascadeOpen, setCascadeOpen]         = useState(false);
  const [cascadeData, setCascadeData]         = useState<CascadeEntry[] | null>(null);
  const [cascadeLoading, setCascadeLoading]   = useState(false);
  const cascadeFetched                        = useRef(false);

  // ── Prediction ────────────────────────────────────────────────────────────
  const handlePredict = async () => {
    if (!trainNo.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setCascadeData(null);
    setCascadeOpen(false);
    cascadeFetched.current = false;

    try {
      const res = await axios.post<PredictionResult>(`/api/delay/${trainNo}`, {
        signal_status: signalStatus,
        congestion_level: congestionLevel,
      });
      setResult({
        ...res.data,
        root_causes: res.data.root_causes || [],
      });
    } catch {
      // Graceful mock fallback for demo / offline dev
      setResult({
        predicted_delay_min: 47,
        confidence_pct: 82.5,
        root_causes: ['FOG', 'SIGNAL'],
        data_source: 'mock',
        ntes_data: {
          train_no: trainNo || '12627',
          current_station: 'Hubballi',
          lat: 15.3647,
          lon: 75.124,
          data_source: 'mock',
        },
        weather_data: { fog_index: 0.85, rainfall_mm: 12.5, condition: 'Fog' },
      });
    }
    setLoading(false);
  };

  // ── Cascade lazy-load ─────────────────────────────────────────────────────
  const handleToggleCascade = async () => {
    const opening = !cascadeOpen;
    setCascadeOpen(opening);

    if (opening && !cascadeFetched.current) {
      cascadeFetched.current = true;
      setCascadeLoading(true);
      try {
        const res = await axios.get<CascadeEntry[]>(`/api/delay/cascade/${trainNo}`);
        setCascadeData(res.data);
      } catch {
        setCascadeData([
          { train_no: '12628', train_name: 'Karnataka Express',  propagated_delay_min: 39, position: 1 },
          { train_no: '16535', train_name: 'Gol Gumbaz Express', propagated_delay_min: 32, position: 2 },
          { train_no: '11013', train_name: 'Coimbatore Express', propagated_delay_min: 25, position: 3 },
          { train_no: '12779', train_name: 'Goa Express',        propagated_delay_min: 18, position: 4 },
          { train_no: '16589', train_name: 'Rani Chennamma',     propagated_delay_min: 11, position: 5 },
        ]);
      }
      setCascadeLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">

      {/* ── Left Panel: Controls ─────────────────────────────────────────── */}
      <div className="w-full md:w-1/3 bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant h-fit">
        <h2 className="text-xl font-semibold text-on-surface mb-6">Prediction Parameters</h2>

        <div className="space-y-5">
          {/* Train number */}
          <div>
            <label className="block text-sm font-medium text-neutralDark mb-2">Train Number</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={trainNo}
                onChange={(e) => setTrainNo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePredict()}
                placeholder="e.g. 12627"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm"
              />
            </div>
          </div>

          {/* Signal status */}
          <div>
            <label className="block text-sm font-medium text-neutralDark mb-2 flex items-center gap-2">
              <Signal className="w-4 h-4" /> Signal Status
            </label>
            <select
              value={signalStatus}
              onChange={(e) => setSignalStatus(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm"
            >
              <option value="normal">Normal</option>
              <option value="degraded">Degraded</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Congestion level slider */}
          <div>
            <label className="block text-sm font-medium text-neutralDark mb-2 flex items-center gap-2">
              <Thermometer className="w-4 h-4" />
              Congestion Level
              <span className="ml-auto text-xs font-bold text-primary">
                {Math.round(congestionLevel * 100)}%
              </span>
            </label>
            <input
              id="congestion-slider"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={congestionLevel}
              onChange={(e) => setCongestionLevel(parseFloat(e.target.value))}
              className="w-full accent-primary h-2 rounded-full cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>
          </div>

          {/* Submit */}
          <button
            id="predict-delay-btn"
            onClick={handlePredict}
            disabled={!trainNo.trim() || loading}
            className="w-full bg-primary hover:bg-blue-800 text-on-primary font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Analyzing…
              </>
            ) : 'Predict Delay'}
          </button>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </div>

      {/* ── Right Panel: Results ─────────────────────────────────────────── */}
      <div className="w-full md:w-2/3 space-y-5">
        {result ? (
          <div className="animate-fadeIn space-y-5">
            {/* ── 1. Result Card ─────────────────────────────────────────── */}
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                {/* Delay number */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Expected Delay</p>
                  <div className={`text-6xl font-extrabold leading-none tabular-nums ${delayColor(result.predicted_delay_min)}`}>
                    {result.predicted_delay_min}
                    <span className="text-2xl font-medium text-slate-400 ml-1">min</span>
                  </div>
                </div>

                {/* Confidence */}
                <div className="min-w-[160px] flex-1 max-w-xs">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">AI Confidence</p>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${result.confidence_pct}%` }}
                    />
                  </div>
                  <p className="text-sm text-slate-500 mt-1.5">{result.confidence_pct}% confidence</p>
                </div>
              </div>

              {/* Root cause chips */}
              <div className="mt-5 pt-5 border-t border-outline-variant">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Root Causes</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(result.root_causes && result.root_causes.length > 0
                    ? result.root_causes
                    : ['UNKNOWN']
                  ).map((cause: string) => (
                    <RootCauseChip key={cause} cause={cause} />
                  ))}
                </div>
              </div>
            </div>

            {/* ── 2. Cascade Impact (collapsible, lazy) ──────────────────── */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden">
              <button
                id="cascade-toggle-btn"
                onClick={handleToggleCascade}
                className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors"
              >
                <span>Show cascade impact on downstream trains</span>
                {cascadeOpen
                  ? <ChevronUp className="w-4 h-4 text-slate-400" />
                  : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {cascadeOpen && (
                <div className="border-t border-outline-variant">
                  {cascadeLoading ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
                      <span className="w-4 h-4 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
                      Loading cascade data…
                    </div>
                  ) : cascadeData && cascadeData.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="bg-surface-container-low border-b border-outline-variant">
                            <th className="px-5 py-3 font-semibold text-on-surface-variant w-8">#</th>
                            <th className="px-5 py-3 font-semibold text-on-surface-variant">Train No</th>
                            <th className="px-5 py-3 font-semibold text-on-surface-variant">Train Name</th>
                            <th className="px-5 py-3 font-semibold text-on-surface-variant text-right">Propagated Delay</th>
                            <th className="px-5 py-3 font-semibold text-on-surface-variant text-center">Impact Level</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cascadeData.map((entry) => (
                            <tr
                              key={entry.train_no}
                              className="border-b border-surface-container-highest last:border-0 hover:bg-surface-container-low transition-colors"
                            >
                              <td className="px-5 py-3 text-slate-400 font-mono">{entry.position}</td>
                              <td className="px-5 py-3 font-mono font-semibold text-primary">{entry.train_no}</td>
                              <td className="px-5 py-3 text-on-surface">{entry.train_name}</td>
                              <td className="px-5 py-3 text-right font-semibold text-on-surface tabular-nums">
                                +{entry.propagated_delay_min} min
                              </td>
                              <td className="px-5 py-3 text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${impactBadge(entry.propagated_delay_min)}`}>
                                  {impactLabel(entry.propagated_delay_min)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="px-6 py-6 text-sm text-slate-400">
                      No downstream cascade data found for train {trainNo}.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ── 3. Pipeline Data Visualization ─────────────────────────── */}
            {result.ntes_data && result.weather_data && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* NTES / IRCTC */}
                <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant">
                  <h3 className="text-sm font-semibold text-on-surface-variant flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-primary" />
                    IRCTC Train Status
                    <span className="ml-auto">
                      <DataSourceBadge source={result.ntes_data.data_source ?? result.data_source ?? 'mock'} />
                    </span>
                  </h3>
                  <div className="space-y-2 text-sm text-on-surface">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Train No</span>
                      <span className="font-medium font-mono">{result.ntes_data.train_no}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Last Station</span>
                      <span className="font-medium">{result.ntes_data.current_station}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Coordinates</span>
                      <span className="font-medium font-mono text-xs">
                        {result.ntes_data.lat.toFixed(4)}, {result.ntes_data.lon.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Weather */}
                <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant">
                  <h3 className="text-sm font-semibold text-on-surface-variant flex items-center gap-2 mb-3">
                    <CloudRain className="w-4 h-4 text-primary" />
                    OpenWeather API
                    <span className="ml-auto text-lg" title={result.weather_data.condition}>
                      {weatherEmoji(result.weather_data.condition)}
                    </span>
                  </h3>
                  <div className="space-y-2 text-sm text-on-surface">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Condition</span>
                      <span className="font-medium">{result.weather_data.condition}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Fog Index</span>
                      <span className="font-medium">{(result.weather_data.fog_index * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Rainfall (1h)</span>
                      <span className="font-medium">{result.weather_data.rainfall_mm} mm</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Empty state ──────────────────────────────────────────────── */
          <div className="bg-surface-container-lowest p-12 rounded-xl shadow-sm border border-outline-variant flex flex-col items-center justify-center text-center min-h-[320px]">
            <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-outline" />
            </div>
            <h3 className="text-xl font-semibold text-on-surface-variant">Awaiting Input</h3>
            <p className="text-outline mt-2 max-w-xs">
              Enter a train number and adjust parameters to see the AI delay prediction.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
