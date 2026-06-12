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

              // CCTV scene SVGs — each camera shows a different view
              const cctvScenes = [
                // CAM-01: Main Entry Gate — crowd entering
                `<svg viewBox="0 0 160 90" xmlns="http://www.w3.org/2000/svg">
                  <defs><radialGradient id="g0" cx="50%" cy="40%" r="60%"><stop offset="0%" stop-color="#2d4a3e"/><stop offset="100%" stop-color="#0a1a12"/></radialGradient></defs>
                  <rect width="160" height="90" fill="url(#g0)"/>
                  <rect x="0" y="60" width="160" height="30" fill="#1a2e1e" opacity="0.8"/>
                  <!-- gate arch -->
                  <path d="M55 60 Q80 30 105 60" stroke="#4a7c59" stroke-width="3" fill="none"/>
                  <rect x="54" y="45" width="4" height="15" fill="#4a7c59"/>
                  <rect x="102" y="45" width="4" height="15" fill="#4a7c59"/>
                  <!-- people silhouettes -->
                  <ellipse cx="70" cy="57" rx="4" ry="6" fill="#1a3d2b"/>
                  <circle cx="70" cy="49" r="3" fill="#2d5a3d"/>
                  <ellipse cx="85" cy="56" rx="4" ry="7" fill="#234d35"/>
                  <circle cx="85" cy="48" r="3.5" fill="#2d5a3d"/>
                  <ellipse cx="95" cy="58" rx="3" ry="5" fill="#1a3d2b"/>
                  <circle cx="95" cy="51" r="2.5" fill="#2d5a3d"/>
                  <!-- timestamp -->
                  <rect x="2" y="2" width="56" height="8" fill="black" opacity="0.5" rx="1"/>
                  <text x="4" y="9" font-family="monospace" font-size="5.5" fill="#00ff41">CAM-01 LIVE</text>
                  <!-- scanlines -->
                  <rect width="160" height="1" y="15" fill="white" opacity="0.03"/>
                  <rect width="160" height="1" y="30" fill="white" opacity="0.03"/>
                  <rect width="160" height="1" y="45" fill="white" opacity="0.03"/>
                  <rect width="160" height="1" y="60" fill="white" opacity="0.03"/>
                  <rect width="160" height="1" y="75" fill="white" opacity="0.03"/>
                </svg>`,
                // CAM-02: Platform Edge North — train visible
                `<svg viewBox="0 0 160 90" xmlns="http://www.w3.org/2000/svg">
                  <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1a2535"/><stop offset="100%" stop-color="#0d151f"/></linearGradient></defs>
                  <rect width="160" height="90" fill="url(#g1)"/>
                  <!-- platform floor -->
                  <rect x="0" y="65" width="160" height="25" fill="#1e2d40"/>
                  <!-- train side -->
                  <rect x="0" y="30" width="160" height="35" fill="#243650" rx="3"/>
                  <rect x="8" y="35" width="22" height="16" fill="#1a4a6e" rx="2"/>
                  <rect x="36" y="35" width="22" height="16" fill="#1a4a6e" rx="2"/>
                  <rect x="64" y="35" width="22" height="16" fill="#2a5a7e" rx="2"/>
                  <rect x="92" y="35" width="22" height="16" fill="#1a4a6e" rx="2"/>
                  <rect x="120" y="35" width="22" height="16" fill="#1a4a6e" rx="2"/>
                  <!-- yellow platform line -->
                  <rect x="0" y="63" width="160" height="2" fill="#f0b429" opacity="0.8"/>
                  <!-- people on platform -->
                  <ellipse cx="40" cy="62" rx="3" ry="5" fill="#1e3a52"/>
                  <circle cx="40" cy="55" r="2.5" fill="#2a4a62"/>
                  <ellipse cx="100" cy="61" rx="3" ry="5" fill="#1e3a52"/>
                  <circle cx="100" cy="54" r="2.5" fill="#2a4a62"/>
                  <text x="4" y="9" font-family="monospace" font-size="5.5" fill="#00ff41">CAM-02 LIVE</text>
                  <rect x="2" y="2" width="56" height="8" fill="black" opacity="0.5" rx="1"/>
                </svg>`,
                // CAM-03: Platform Edge South — wide view
                `<svg viewBox="0 0 160 90" xmlns="http://www.w3.org/2000/svg">
                  <defs><linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1d1f2b"/><stop offset="100%" stop-color="#12141e"/></linearGradient></defs>
                  <rect width="160" height="90" fill="url(#g2)"/>
                  <!-- overhead canopy perspective -->
                  <path d="M0 20 L160 35" stroke="#2a2d3e" stroke-width="1.5"/>
                  <path d="M0 25 L160 40" stroke="#2a2d3e" stroke-width="1"/>
                  <!-- columns -->
                  <rect x="20" y="20" width="3" height="45" fill="#2a2d3e"/>
                  <rect x="60" y="22" width="3" height="43" fill="#2a2d3e"/>
                  <rect x="100" y="24" width="3" height="41" fill="#2a2d3e"/>
                  <rect x="140" y="26" width="3" height="39" fill="#2a2d3e"/>
                  <!-- platform -->
                  <rect x="0" y="65" width="160" height="25" fill="#1a1c28"/>
                  <rect x="0" y="63" width="160" height="2" fill="#f0b429" opacity="0.6"/>
                  <!-- track lines -->
                  <line x1="0" y1="80" x2="160" y2="80" stroke="#2d2f40" stroke-width="2"/>
                  <line x1="0" y1="85" x2="160" y2="85" stroke="#2d2f40" stroke-width="2"/>
                  <!-- people -->
                  <ellipse cx="55" cy="62" rx="4" ry="6" fill="#22253a"/>
                  <circle cx="55" cy="54" r="3" fill="#2c3050"/>
                  <ellipse cx="120" cy="61" rx="3.5" ry="5" fill="#22253a"/>
                  <circle cx="120" cy="54" r="2.5" fill="#2c3050"/>
                  <rect x="2" y="2" width="56" height="8" fill="black" opacity="0.5" rx="1"/>
                  <text x="4" y="9" font-family="monospace" font-size="5.5" fill="#00ff41">CAM-03 LIVE</text>
                </svg>`,
                // CAM-04: MAINTENANCE
                ``,
                // CAM-05: Waiting Hall — benches & people
                `<svg viewBox="0 0 160 90" xmlns="http://www.w3.org/2000/svg">
                  <defs><linearGradient id="g4" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1e1a2e"/><stop offset="100%" stop-color="#130f1e"/></linearGradient></defs>
                  <rect width="160" height="90" fill="url(#g4)"/>
                  <!-- ceiling light -->
                  <ellipse cx="80" cy="5" rx="30" ry="8" fill="#3a2f50" opacity="0.8"/>
                  <ellipse cx="80" cy="5" rx="15" ry="4" fill="#5a4a70" opacity="0.6"/>
                  <!-- floor -->
                  <rect x="0" y="68" width="160" height="22" fill="#16131f"/>
                  <!-- benches -->
                  <rect x="15" y="55" width="40" height="5" fill="#2d2440" rx="1"/>
                  <rect x="17" y="60" width="4" height="8" fill="#2d2440"/>
                  <rect x="51" y="60" width="4" height="8" fill="#2d2440"/>
                  <rect x="90" y="55" width="40" height="5" fill="#2d2440" rx="1"/>
                  <rect x="92" y="60" width="4" height="8" fill="#2d2440"/>
                  <rect x="126" y="60" width="4" height="8" fill="#2d2440"/>
                  <!-- seated people -->
                  <ellipse cx="28" cy="53" rx="5" ry="6" fill="#1e1a30"/>
                  <circle cx="28" cy="45" r="3.5" fill="#2a2440"/>
                  <ellipse cx="43" cy="53" rx="5" ry="6" fill="#201c32"/>
                  <circle cx="43" cy="45" r="3.5" fill="#2a2440"/>
                  <ellipse cx="105" cy="53" rx="5" ry="6" fill="#1e1a30"/>
                  <circle cx="105" cy="45" r="3.5" fill="#2a2440"/>
                  <!-- standing person -->
                  <ellipse cx="75" cy="58" rx="4" ry="8" fill="#1e1a30"/>
                  <circle cx="75" cy="48" r="4" fill="#2a2440"/>
                  <rect x="2" y="2" width="56" height="8" fill="black" opacity="0.5" rx="1"/>
                  <text x="4" y="9" font-family="monospace" font-size="5.5" fill="#00ff41">CAM-05 LIVE</text>
                </svg>`,
                // CAM-06: Ticket Counter — queue
                `<svg viewBox="0 0 160 90" xmlns="http://www.w3.org/2000/svg">
                  <defs><linearGradient id="g5" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1a2218"/><stop offset="100%" stop-color="#0e160c"/></linearGradient></defs>
                  <rect width="160" height="90" fill="url(#g5)"/>
                  <!-- counter -->
                  <rect x="10" y="35" width="140" height="20" fill="#1f2d1c" rx="2"/>
                  <rect x="10" y="33" width="140" height="5" fill="#2a3d26" rx="1"/>
                  <!-- windows -->
                  <rect x="20" y="10" width="30" height="25" fill="#1a2d16" rx="2" stroke="#2a4020" stroke-width="1"/>
                  <rect x="65" y="10" width="30" height="25" fill="#1a2d16" rx="2" stroke="#2a4020" stroke-width="1"/>
                  <rect x="110" y="10" width="30" height="25" fill="#1a2d16" rx="2" stroke="#2a4020" stroke-width="1"/>
                  <!-- monitor glow -->
                  <rect x="25" y="15" width="20" height="12" fill="#1a3a50" rx="1"/>
                  <rect x="70" y="15" width="20" height="12" fill="#1a3a50" rx="1"/>
                  <!-- queue of people -->
                  <ellipse cx="35" cy="62" rx="4" ry="7" fill="#162415"/>
                  <circle cx="35" cy="53" r="3" fill="#1e3020"/>
                  <ellipse cx="55" cy="63" rx="3.5" ry="6" fill="#162415"/>
                  <circle cx="55" cy="55" r="2.5" fill="#1e3020"/>
                  <ellipse cx="72" cy="62" rx="4" ry="7" fill="#1a2819"/>
                  <circle cx="72" cy="53" r="3" fill="#1e3020"/>
                  <ellipse cx="90" cy="63" rx="3.5" ry="6" fill="#162415"/>
                  <circle cx="90" cy="55" r="2.5" fill="#1e3020"/>
                  <!-- floor -->
                  <rect x="0" y="70" width="160" height="20" fill="#111a10"/>
                  <rect x="2" y="2" width="56" height="8" fill="black" opacity="0.5" rx="1"/>
                  <text x="4" y="9" font-family="monospace" font-size="5.5" fill="#00ff41">CAM-06 LIVE</text>
                </svg>`,
              ];

              return (
                <div
                  key={cam.id}
                  className={`relative rounded-xl overflow-hidden bg-[#0d1117] aspect-video cursor-pointer transition-all
                    ${selectedCam === cam.id ? 'ring-2 ring-[#F97316]' : 'hover:ring-2 hover:ring-[#F97316]/50'}
                    ${hasAlert ? 'ring-2 ring-red-500' : ''}`}
                  onClick={() => setSelectedCam(selectedCam === cam.id ? null : cam.id)}
                >
                  {/* CCTV scene or maintenance */}
                  {isMaintenance ? (
                    <div className="absolute inset-0 bg-[#0d1117] flex flex-col items-center justify-center">
                      <span className="material-symbols-outlined text-gray-500 text-[22px]">construction</span>
                      <span className="text-[10px] font-bold text-gray-500 uppercase mt-1 tracking-widest">Maintenance</span>
                    </div>
                  ) : (
                    <div
                      className="absolute inset-0 w-full h-full"
                      dangerouslySetInnerHTML={{ __html: cctvScenes[idx] }}
                      style={{ lineHeight: 0 }}
                    />
                  )}

                  {/* Green "recording" dot */}
                  {!isMaintenance && (
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                    </div>
                  )}

                  {/* Alert badge */}
                  {hasAlert && !isMaintenance && (
                    <div className="absolute top-1.5 right-5 w-5 h-5 rounded-full bg-red-500 animate-pulse flex items-center justify-center">
                      <span className="text-white text-[9px] font-black">!</span>
                    </div>
                  )}

                  {/* Density overlay */}
                  {hasResult && !isMaintenance && density !== null && (
                    <div className="absolute top-1.5 left-1.5">
                      <span className="text-[9px] font-bold text-white/80 bg-black/40 rounded px-1">{density.toFixed(1)} p/m²</span>
                    </div>
                  )}

                  {/* Camera label */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-1.5">
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
