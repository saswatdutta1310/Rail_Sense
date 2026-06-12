import { useState, useEffect, useRef } from 'react';
import { apiCall } from '../api/client';

interface Detection {
  label: string;
  confidence: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

interface PlatformAnalysis {
  analysis_id?: string;
  crowd_density_score: number;
  alert_level: string;
  fall_detected: boolean;
  detections?: Detection[];
}

const STATIONS = [
  { code: 'NDLS', name: 'New Delhi' },
  { code: 'HWH', name: 'Howrah Junction' },
  { code: 'CST', name: 'Mumbai CSMT' },
  { code: 'SBC', name: 'Bengaluru City' },
  { code: 'MAS', name: 'Chennai Central' },
  { code: 'PUNE', name: 'Pune Station' },
];

const CAMERAS = [
  { id: 'CAM-01', location: 'Main Entry Gate' },
  { id: 'CAM-02', location: 'Platform Edge North' },
  { id: 'CAM-03', location: 'Platform Edge South' },
  { id: 'CAM-04', location: 'Staircase A' },
  { id: 'CAM-05', location: 'Waiting Hall' },
  { id: 'CAM-06', location: 'Ticket Counter' },
];

function parseAlertLevel(raw: string): 'normal' | 'yellow' | 'red' | 'critical' {
  const r = raw.toLowerCase();
  if (r.includes('critical') || r.includes('high risk')) return 'critical';
  if (r.includes('red') || r.includes('elevated')) return 'red';
  if (r.includes('yellow')) return 'yellow';
  return 'normal';
}

export default function PlatformGuard() {
  const [station, setStation] = useState('NDLS');
  const [platform, setPlatform] = useState('1');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [density, setDensity] = useState<number | null>(null);
  const [fallDetected, setFallDetected] = useState(false);
  const [personCount, setPersonCount] = useState<number | null>(null);
  const [alertLevel, setAlertLevel] = useState<'normal' | 'yellow' | 'red' | 'critical'>('normal');
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [selectedCam, setSelectedCam] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ time: string; density: number; alert: string }>>([]);
  const [hasResult, setHasResult] = useState(false);
  const [error, setError] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setError('');
    try {
      const formData = new FormData();
      // Generate a tiny canvas image as the camera feed placeholder
      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 64;
      await new Promise<void>(resolve => canvas.toBlob(blob => {
        formData.append('file', blob!, 'camera_feed.jpg');
        resolve();
      }, 'image/jpeg'));

      const response = await apiCall<PlatformAnalysis>(
        '/vision/platform',
        { method: 'POST', body: formData },
        {
          crowd_density_score: parseFloat((Math.random() * 6 + 2).toFixed(1)),
          alert_level: 'normal',
          fall_detected: Math.random() > 0.85,
          detections: Array.from({ length: Math.floor(Math.random() * 60 + 10) }, () => ({ label: 'person', confidence: 0.9 })),
        }
      );

      const level = parseAlertLevel(response.alert_level);
      const persons = response.detections?.filter(d => d.label === 'person' || d.label === 'fallen_person').length ?? 0;
      const estimatedCount = persons > 0 ? persons * 20 : Math.floor(response.crowd_density_score * 180);

      setDensity(response.crowd_density_score);
      setAlertLevel(level);
      setFallDetected(response.fall_detected);
      setPersonCount(estimatedCount);
      setAnalysisId(response.analysis_id ?? null);
      setHasResult(true);

      // Keep last 10 readings for the mini chart
      setHistory(prev => {
        const entry = {
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          density: response.crowd_density_score,
          alert: level,
        };
        return [...prev.slice(-9), entry];
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auto-refresh every 15 seconds when enabled
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(runAnalysis, 15000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, station, platform]);

  const alertConfig = {
    normal: { bg: 'bg-green-500', label: 'NORMAL', icon: 'check_circle', text: 'Normal crowd levels' },
    yellow: { bg: 'bg-amber-400', label: 'MODERATE', icon: 'warning', text: 'Elevated crowd density' },
    red: { bg: 'bg-red-500', label: 'HIGH RISK', icon: 'report', text: 'High crowd density' },
    critical: { bg: 'bg-red-700', label: 'CRITICAL', icon: 'emergency', text: 'Immediate intervention required' },
  }[alertLevel];

  const stationName = STATIONS.find(s => s.code === station)?.name ?? station;

  return (
    <div className="flex-1 bg-[#FAF8F4] p-6">
      {/* Header */}
      <div className="mb-5 flex justify-between items-start flex-wrap gap-3">
        <div>
          <span className="badge-orange mb-2 inline-block">Computer Vision</span>
          <h1 className="text-2xl font-black text-gray-900">Platform <span className="text-[#F97316]">Guard</span></h1>
          <p className="text-sm text-gray-500 mt-1">YOLOv5 crowd monitoring · Fall detection · Real-time alerts</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-600 cursor-pointer select-none">
            <div className="relative">
              <input type="checkbox" className="sr-only peer" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
              <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-[#F97316] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
            </div>
            Auto-refresh
          </label>
          <button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="orange-btn flex items-center gap-2 text-sm"
          >
            <span className={`material-symbols-outlined text-[18px] ${isAnalyzing ? 'animate-spin' : ''}`}>radar</span>
            {isAnalyzing ? 'Analyzing…' : 'Run Analysis'}
          </button>
        </div>
      </div>

      {/* Station / platform selector */}
      <div className="card p-4 mb-5 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Station</label>
          <select value={station} onChange={e => setStation(e.target.value)} className="input-field text-sm">
            {STATIONS.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Platform</label>
          <select value={platform} onChange={e => setPlatform(e.target.value)} className="input-field text-sm">
            {[1,2,3,4,5,6,7,8].map(p => <option key={p} value={p}>Platform {p}</option>)}
          </select>
        </div>
        <div className="col-span-2 flex items-end">
          {hasResult && analysisId && (
            <p className="text-xs text-gray-400 font-mono">Analysis ID: {analysisId.slice(0, 16)}…</p>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">warning</span>
          {error} — showing simulated data.
        </div>
      )}

      <div className="grid grid-cols-3 gap-5 mb-5">
        {/* Camera grid */}
        <div className="col-span-2 card p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900">Live Camera Feeds — {stationName} Plt {platform}</h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-xs font-semibold text-red-500">LIVE</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {CAMERAS.map((cam, idx) => {
              const isMaintenance = idx === 3;
              const hasAlert = hasResult && (idx === 1 ? fallDetected : alertLevel === 'critical' && idx % 2 === 0);
              return (
                <div
                  key={cam.id}
                  className={`relative rounded-xl overflow-hidden bg-gray-900 aspect-video cursor-pointer transition-all
                    ${selectedCam === cam.id ? 'ring-2 ring-[#F97316]' : 'hover:ring-2 hover:ring-[#F97316]/50'}
                    ${hasAlert ? 'ring-2 ring-red-500' : ''}`}
                  onClick={() => setSelectedCam(selectedCam === cam.id ? null : cam.id)}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="material-symbols-outlined text-gray-600 text-[30px]">videocam</span>
                  </div>
                  {/* Simulated scanline effect */}
                  {!isMaintenance && (
                    <div className="absolute inset-0 pointer-events-none" style={{
                      background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 4px)'
                    }}></div>
                  )}
                  {isMaintenance && (
                    <div className="absolute inset-0 bg-gray-800/80 flex flex-col items-center justify-center">
                      <span className="material-symbols-outlined text-gray-400 text-[20px]">construction</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase mt-1">Maintenance</span>
                    </div>
                  )}
                  {hasAlert && !isMaintenance && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-500 animate-pulse flex items-center justify-center">
                      <span className="text-white text-[9px] font-black">!</span>
                    </div>
                  )}
                  {/* Crowd density overlay when result available */}
                  {hasResult && !isMaintenance && density !== null && (
                    <div className="absolute top-1.5 left-1.5">
                      <span className="text-[9px] font-bold text-white/80 bg-black/40 rounded px-1">{density.toFixed(1)} p/m²</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                    <p className="text-white text-[9px] font-bold">{cam.id}</p>
                    <p className="text-white/60 text-[8px]">{cam.location}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Alert status */}
          <div className={`${alertConfig.bg} rounded-2xl p-5 text-white transition-all`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{alertConfig.icon}</span>
              <span className="font-black text-sm uppercase tracking-widest">{alertConfig.label}</span>
            </div>
            {density !== null ? (
              <>
                <p className="font-black text-4xl mb-1">{density.toFixed(1)}<span className="text-xl font-medium"> p/m²</span></p>
                <p className="text-white/70 text-xs">{alertConfig.text}</p>
                {personCount !== null && (
                  <p className="text-white/80 text-xs mt-1">~{personCount.toLocaleString()} estimated persons</p>
                )}
              </>
            ) : (
              <p className="text-white/70 text-sm mt-2">Run an analysis to see live density metrics.</p>
            )}
            {fallDetected && (
              <div className="mt-3 bg-white/20 rounded-lg p-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>personal_injury</span>
                <span className="text-xs font-bold">Fall Event Detected — RPF Notified</span>
              </div>
            )}
          </div>

          {/* Live metrics */}
          <div className="card p-4">
            <p className="text-xs text-gray-500 font-semibold mb-3 uppercase tracking-wide">Live Metrics</p>
            {[
              { label: 'Person Count', value: personCount !== null ? personCount.toLocaleString() : '—', icon: 'people' },
              { label: 'Platform', value: `Platform ${platform}`, icon: 'train' },
              { label: 'Station', value: stationName, icon: 'location_on' },
              { label: 'Alert Level', value: alertConfig.label, icon: 'warning' },
            ].map(m => (
              <div key={m.label} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <span className="material-symbols-outlined text-[#F97316] text-[16px]">{m.icon}</span>
                <div>
                  <p className="text-[10px] text-gray-400">{m.label}</p>
                  <p className="text-sm font-bold text-gray-800">{m.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Alert thresholds legend */}
          <div className="card p-4">
            <p className="text-xs text-gray-500 font-semibold mb-2 uppercase tracking-wide">Alert Thresholds</p>
            {[
              { label: 'Normal', range: '0–3 p/m²', color: 'bg-green-500' },
              { label: 'Yellow', range: '3–6 p/m²', color: 'bg-amber-400' },
              { label: 'Red', range: '6–9 p/m²', color: 'bg-red-400' },
              { label: 'Critical', range: '>9 p/m²', color: 'bg-red-700' },
            ].map(t => (
              <div key={t.label} className="flex items-center gap-2 py-1">
                <div className={`w-3 h-3 rounded-sm ${t.color}`}></div>
                <span className="text-xs text-gray-600">{t.label}</span>
                <span className="ml-auto text-[10px] text-gray-400 font-mono">{t.range}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* History mini-chart */}
      {history.length > 0 && (
        <div className="card p-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-gray-900">Crowd Density History</h3>
              <p className="text-xs text-gray-400 mt-0.5">Last {history.length} readings — auto-updates on analysis</p>
            </div>
            <button onClick={() => setHistory([])} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Clear</button>
          </div>
          <div className="flex items-end gap-2 h-24">
            {history.map((h, i) => {
              const heightPct = Math.min((h.density / 10) * 100, 100);
              const barColor = h.alert === 'critical' ? '#DC2626' : h.alert === 'red' ? '#EF4444' : h.alert === 'yellow' ? '#F59E0B' : '#22C55E';
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="w-full rounded-t-sm relative" style={{ height: `${heightPct}%`, background: barColor, minHeight: '4px' }}>
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] rounded px-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {h.density.toFixed(1)} p/m²
                    </div>
                  </div>
                  <span className="text-[8px] text-gray-400 rotate-45 origin-left">{h.time.slice(0, 5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
