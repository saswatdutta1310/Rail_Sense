import { useState, useRef } from 'react';
import { API_BASE_URL } from '../api/client';

interface TrackDefect {
  defect_class?: string;
  class?: string;
  confidence: number;
  risk_score: number;
  severity?: string;
  location?: string;
  recommended_action?: string;
}

interface TrackAnalysisResult {
  defects: TrackDefect[];
  defects_found: number;
  maintenance_priority: string;
  confidence?: number;
  track_condition?: string;
  summary?: string;
  status?: string;
  file_received?: string;
  kilometer_marker?: string;
  model_version?: string;
}

const MOCK_RESULT: TrackAnalysisResult = {
  defects: [
    { defect_class: 'Cracked Fastener', confidence: 0.94, risk_score: 8.2, severity: 'Critical', location: 'Section A', recommended_action: 'Immediate Stop & Inspect' },
    { defect_class: 'Missing E-Clip', confidence: 0.87, risk_score: 6.1, severity: 'High', location: 'Section B', recommended_action: 'Schedule Maintenance Within 48h' },
    { defect_class: 'Surface Flaw', confidence: 0.76, risk_score: 3.4, severity: 'Low', location: 'Section C', recommended_action: 'Routine Check at Next Inspection' },
  ],
  defects_found: 3,
  maintenance_priority: 'IMMEDIATE',
  confidence: 91.0,
  track_condition: 'POOR',
  summary: 'Mock analysis — backend not available. Upload a real image with Gemini API key for AI-powered analysis.',
  status: 'mock',
  model_version: 'mock-fallback',
};

export default function TrackInspector() {
  const [lineName, setLineName] = useState('North Corridor Delta');
  const [kilometerMarker, setKilometerMarker] = useState('KM 142.5');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<TrackAnalysisResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setFile = (file: File) => {
    setUploadedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) setFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFile(file);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError('');
    setResult(null);
    try {
      const formData = new FormData();
      if (uploadedFile) {
        formData.append('file', uploadedFile);
      } else {
        // Create a tiny dummy JPEG so the endpoint doesn't complain
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        await new Promise<void>(resolve => canvas.toBlob(blob => {
          formData.append('file', blob!, 'track_dummy.jpg');
          resolve();
        }, 'image/jpeg'));
      }
      formData.append('kilometer_marker', kilometerMarker);

      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${API_BASE_URL}/track/analyze`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(err.detail || `Error ${response.status}`);
      }

      const data: TrackAnalysisResult = await response.json();
      setResult(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Analysis failed';
      setError(message);
      // Show mock fallback so the UI is still useful
      setResult({ ...MOCK_RESULT, kilometer_marker: kilometerMarker });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportWorkOrder = (defect: TrackDefect) => {
    const name = defect.defect_class ?? defect.class ?? 'Unknown';
    const txt = [
      `RAILSENSE AI — MAINTENANCE WORK ORDER`,
      `Generated: ${new Date().toLocaleString('en-IN')}`,
      `Line: ${lineName}`,
      `Marker: ${result?.kilometer_marker ?? kilometerMarker}`,
      `---`,
      `Defect Class : ${name}`,
      `Location     : ${defect.location ?? '—'}`,
      `Severity     : ${defect.severity ?? riskLabel(defect.risk_score)}`,
      `Risk Score   : ${defect.risk_score}/10`,
      `Confidence   : ${Math.round(defect.confidence * 100)}%`,
      `Action       : ${defect.recommended_action ?? '—'}`,
    ].join('\n');
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `work_order_${name.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const priorityColor: Record<string, string> = {
    IMMEDIATE: 'bg-red-600 text-white',
    SCHEDULED: 'bg-amber-500 text-white',
    MONITOR: 'bg-blue-600 text-white',
    HIGH: 'bg-red-600 text-white',
    MEDIUM: 'bg-amber-500 text-white',
    LOW: 'bg-green-600 text-white',
    CRITICAL: 'bg-red-800 text-white',
  };

  const conditionColor: Record<string, string> = {
    CRITICAL: 'text-red-600',
    POOR: 'text-orange-600',
    FAIR: 'text-amber-600',
    GOOD: 'text-green-600',
    EXCELLENT: 'text-emerald-600',
  };

  const riskLabel = (score: number) =>
    score >= 8 ? 'Critical' : score >= 6 ? 'High' : score >= 4 ? 'Moderate' : 'Low';

  const riskColor = (score: number) =>
    score >= 8 ? 'text-red-600 bg-red-50' : score >= 6 ? 'text-orange-600 bg-orange-50' : score >= 4 ? 'text-amber-600 bg-amber-50' : 'text-green-600 bg-green-50';

  return (
    <div className="flex-1 bg-[#FAF8F4] p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start flex-wrap gap-3">
        <div>
          <span className="badge-orange mb-2 inline-block">Vision AI</span>
          <h1 className="text-2xl font-black text-gray-900">Track <span className="text-[#F97316]">Inspector</span></h1>
          <p className="text-sm text-gray-500 mt-1">Gemini 2.5 Flash AI defect detection · Work order generation</p>
        </div>
        {result && (
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${result.status === 'complete' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {result.status === 'complete' ? '✓ AI Analysis Complete' : '⚠ Mock Result'}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Left: form & upload */}
        <div className="col-span-2 flex flex-col gap-4">
          <div className="card p-5">
            <h3 className="font-bold text-gray-900 mb-4">Inspection Parameters</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Railway Line Name</label>
                <input className="input-field text-sm" value={lineName} onChange={e => setLineName(e.target.value)} placeholder="e.g. Mumbai–Pune Corridor" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">KM Marker / GPS Tag</label>
                <input className="input-field text-sm" value={kilometerMarker} onChange={e => setKilometerMarker(e.target.value)} placeholder="e.g. KM 142.5" />
              </div>
            </div>
          </div>

          {/* Upload zone */}
          <div
            className={`card p-6 text-center cursor-pointer transition-all border-2 border-dashed ${isDragging ? 'border-[#F97316] bg-[#FFF7ED]' : 'border-gray-200 hover:border-[#F97316]'}`}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
            {previewUrl ? (
              <div className="relative">
                <img src={previewUrl} alt="Track preview" className="w-full h-36 object-cover rounded-lg mb-2" />
                <p className="font-bold text-gray-800 text-sm">{uploadedFile?.name}</p>
                <p className="text-xs text-green-600 mt-1 font-semibold flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>Ready for analysis
                </p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 bg-[#FFF7ED] rounded-xl flex items-center justify-center mx-auto mb-3">
                  <span className="material-symbols-outlined text-[#F97316] text-[24px]">upload_file</span>
                </div>
                {uploadedFile ? (
                  <>
                    <p className="font-bold text-gray-800 text-sm">{uploadedFile.name}</p>
                    <p className="text-xs text-green-600 mt-1 font-semibold">✓ Ready for analysis</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-gray-700 text-sm">Drop track image or video</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, MP4 · Max 50MB</p>
                    <p className="text-xs text-gray-400 mt-1">Or click to browse</p>
                  </>
                )}
              </>
            )}
          </div>

          {error && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs flex items-start gap-2">
              <span className="material-symbols-outlined text-sm mt-0.5">warning</span>
              <div><strong>Backend Error:</strong> {error}<br/><span className="text-gray-500">Showing mock result below.</span></div>
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="orange-btn flex items-center justify-center gap-2 w-full py-3 text-sm"
          >
            {isAnalyzing ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Analyzing Track...</>
            ) : (
              <><span className="material-symbols-outlined text-[18px]">search</span>Detect Defects</>
            )}
          </button>
        </div>

        {/* Right: results */}
        <div className="col-span-3">
          {!result ? (
            <div className="card h-full flex flex-col items-center justify-center p-10 text-center">
              <div className="w-16 h-16 bg-[#FFF7ED] rounded-2xl flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[#F97316] text-[32px]">engineering</span>
              </div>
              <h3 className="font-bold text-gray-700 mb-2">No Analysis Yet</h3>
              <p className="text-sm text-gray-400 max-w-xs">Upload a track image and click <strong>Detect Defects</strong> to get AI-powered defect classification and work orders.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Summary row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Defects Found', value: result.defects_found ?? result.defects?.length ?? 0, icon: 'warning', colorClass: 'text-red-500 bg-red-50' },
                  { label: 'Priority', value: result.maintenance_priority ?? '—', icon: 'priority_high', colorClass: 'text-amber-600 bg-amber-50' },
                  { label: 'Track Condition', value: result.track_condition ?? '—', icon: 'track_changes', colorClass: `${conditionColor[result.track_condition ?? ''] ?? 'text-gray-700'} bg-gray-50` },
                  { label: 'Model', value: result.model_version ?? '—', icon: 'memory', colorClass: 'text-[#F97316] bg-[#FFF7ED]' },
                ].map(s => (
                  <div key={s.label} className="card p-3 flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.colorClass.split(' ')[1]}`}>
                      <span className={`material-symbols-outlined text-[16px] ${s.colorClass.split(' ')[0]}`} style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide">{s.label}</p>
                      <p className="font-black text-xs text-gray-900 truncate">{s.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Maintenance priority badge */}
              {result.maintenance_priority && (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${priorityColor[result.maintenance_priority] ?? 'bg-gray-600 text-white'}`}>
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {result.maintenance_priority === 'IMMEDIATE' ? 'emergency' : result.maintenance_priority === 'SCHEDULED' ? 'calendar_month' : 'visibility'}
                  </span>
                  <div>
                    <p className="font-black text-sm">{result.maintenance_priority} ACTION REQUIRED</p>
                    {result.summary && <p className="text-white/80 text-xs mt-0.5 line-clamp-2">{result.summary}</p>}
                  </div>
                </div>
              )}

              {/* Defect cards */}
              <div className="space-y-3">
                {result.defects?.length === 0 ? (
                  <div className="card p-6 text-center">
                    <span className="material-symbols-outlined text-green-500 text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <p className="font-bold text-green-700 mt-2">No Defects Detected</p>
                    <p className="text-sm text-gray-400 mt-1">Track appears to be in good condition.</p>
                  </div>
                ) : (
                  result.defects?.map((d, i) => {
                    const name = d.defect_class ?? d.class ?? 'Unknown Defect';
                    return (
                      <div key={i} className="card p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-bold text-gray-900">{name}</h4>
                            {d.location && <p className="text-xs text-gray-500 mt-0.5">{d.location}</p>}
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${riskColor(d.risk_score)}`}>
                            {d.severity ?? riskLabel(d.risk_score)} · {d.risk_score}/10
                          </span>
                        </div>
                        <div className="flex gap-4 text-xs mb-4">
                          <span className="text-gray-500">Confidence: <span className="font-bold text-gray-800">{Math.round(d.confidence * 100)}%</span></span>
                          <span className="text-gray-500">Risk Score: <span className="font-bold text-[#F97316]">{d.risk_score}</span></span>
                        </div>
                        {/* Risk bar */}
                        <div className="h-1.5 bg-gray-100 rounded-full mb-4 overflow-hidden">
                          <div className={`h-full rounded-full ${d.risk_score >= 8 ? 'bg-red-500' : d.risk_score >= 6 ? 'bg-orange-500' : d.risk_score >= 4 ? 'bg-amber-500' : 'bg-green-500'}`}
                            style={{ width: `${d.risk_score * 10}%` }}></div>
                        </div>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold ${d.risk_score >= 7 ? 'bg-red-600 text-white' : d.risk_score >= 4 ? 'bg-amber-500 text-white' : 'bg-green-600 text-white'}`}>
                            <span className="material-symbols-outlined text-[14px]">build</span>
                            {d.recommended_action ?? 'Follow standard procedure'}
                          </div>
                          <button
                            onClick={() => handleExportWorkOrder(d)}
                            className="text-[#F97316] text-xs font-bold flex items-center gap-1 hover:underline"
                          >
                            <span className="material-symbols-outlined text-[14px]">download</span>Work Order
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
