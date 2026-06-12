import { useState, useRef } from 'react';

interface TrackDefect {
  class: string;
  location?: string;
  confidence: number;
  risk_score: number;
  recommended_action?: string;
  // legacy field names from mock
  defect_class?: string;
}

interface TrackAnalysisResult {
  defects: TrackDefect[];
  confidence?: number;
  status?: string;
  message?: string;
  model_version?: string;
  // legacy fields
  analysis_id?: string;
  defects_found?: number;
  maintenance_priority?: string;
}

export default function TrackInspector() {
  // ── Form state ──────────────────────────────────────────────────────────────
  const [lineName, setLineName] = useState('North Corridor Delta');
  const [kilometerMarker, setKilometerMarker] = useState('KM 142.5');

  // ── Analysis state ──────────────────────────────────────────────────────────
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<TrackAnalysisResult | null>(null);

  // ── Upload / Dropzone state ─────────────────────────────────────────────────
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Drag & Drop handlers ────────────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    const allowedTypes = [
      'video/mp4', 'video/avi', 'video/quicktime',
      'image/jpeg', 'image/png', 'image/jpg',
    ];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload MP4, AVI, JPG, or PNG files only');
      return;
    }
    setUploadedFile(file);
    setAnalysisResult(null); // reset previous results when new file chosen
    console.log('File selected:', file.name, file.size, file.type);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // ── Run Analysis ────────────────────────────────────────────────────────────
  const handleRunAnalysis = async () => {
    if (!uploadedFile) {
      alert('Please upload an image or video file first');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('kilometer_marker', kilometerMarker || 'KM 0.0');

      // Real backend endpoint is POST /api/track/analyze
      const response = await fetch('http://localhost:8000/api/track/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error(`Analysis failed: ${response.status}`);
      const data = await response.json();

      // Backend returns { analysis_id, defects_found, maintenance_priority, defects[] }
      // where each defect has defect_class, confidence (0–1), risk_score, recommended_action
      // Normalise into the shape the UI expects
      setAnalysisResult({
        ...data,
        defects: (data.defects || []).map((d: Record<string, unknown>) => ({
          ...d,
          class: (d.defect_class || d.class) as string,
          confidence: d.confidence as number,   // 0–1, defectConfidence() handles scaling
          risk_score: d.risk_score as number,
          recommended_action: d.recommended_action as string | undefined,
          location: d.location as string | undefined,
        })),
      });

    } catch (error: unknown) {
      console.error('Analysis error:', error);
      // Fallback mock so the UI remains useful without a live backend
      setAnalysisResult({
        maintenance_priority: 'critical',
        defects_found: 3,
        defects: [
          { defect_class: 'Transverse Fracture', class: 'Transverse Fracture', confidence: 98, risk_score: 8.5, recommended_action: 'Immediate Stop & Inspect', location: kilometerMarker },
          { defect_class: 'Missing Fastener (E-Clip)', class: 'Missing Fastener (E-Clip)', confidence: 94, risk_score: 4.2, recommended_action: 'Schedule Maintenance', location: kilometerMarker },
          { defect_class: 'Ballast Fouling', class: 'Ballast Fouling', confidence: 88, risk_score: 2.1, recommended_action: 'Routine Check', location: kilometerMarker },
        ],
        status: 'mock',
        message: `Backend error: ${error.message}. Showing demo results instead.`,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const getPriorityBgColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'bg-error text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-secondary text-white';
      default: return 'bg-green-500 text-white';
    }
  };

  const getIconForDefect = (defClass: string) => {
    if (defClass.toLowerCase().includes('fracture') || defClass.toLowerCase().includes('crack')) return 'broken_image';
    if (defClass.toLowerCase().includes('fastener') || defClass.toLowerCase().includes('clip')) return 'hardware';
    return 'grass';
  };

  const getIconColorForDefect = (defClass: string) => {
    if (defClass.toLowerCase().includes('fracture') || defClass.toLowerCase().includes('crack')) return 'text-error bg-error-container';
    if (defClass.toLowerCase().includes('fastener') || defClass.toLowerCase().includes('clip')) return 'text-on-secondary-container bg-secondary-container';
    return 'text-outline bg-surface-container-high';
  };

  const defectLabel = (d: TrackDefect) => d.class || d.defect_class || 'Unknown';
  const defectConfidence = (d: TrackDefect) =>
    typeof d.confidence === 'number'
      ? d.confidence > 1 ? d.confidence : d.confidence * 100
      : 0;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 overflow-y-auto p-gutter bg-background custom-scrollbar">
        <div className="max-w-[1600px] mx-auto space-y-gutter">

          {/* ── Hero Grid ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-12 gap-gutter">

            {/* Left Column: Analysis Configuration */}
            <section className="col-span-12 lg:col-span-4 flex flex-col gap-gutter">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6 border-b border-outline-variant pb-4">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">Analysis Configuration</h3>
                  <span className="material-symbols-outlined text-primary" data-icon="tune">tune</span>
                </div>

                <div className="space-y-6">

                  {/* Drag & Drop Upload Zone */}
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-3">Upload Asset</label>
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={[
                        'border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-3',
                        'cursor-pointer transition-all duration-200 select-none',
                        isDragging
                          ? 'border-primary bg-primary/5 scale-[1.01]'
                          : uploadedFile
                          ? 'border-green-500 bg-green-50'
                          : 'border-outline-variant bg-surface-container-low hover:border-primary hover:bg-surface-container-high',
                      ].join(' ')}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".mp4,.avi,.mov,.jpg,.jpeg,.png"
                        onChange={handleInputChange}
                        className="hidden"
                      />

                      {uploadedFile ? (
                        <div className="text-center">
                          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                            <span className="material-symbols-outlined text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          </div>
                          <p className="font-label-md text-label-md text-green-700 font-semibold">{uploadedFile.name}</p>
                          <p className="text-xs text-on-surface-variant mt-1">
                            {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          <p className="text-primary text-xs mt-2 underline">Click to change file</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <span
                            className={`material-symbols-outlined text-4xl transition-colors ${isDragging ? 'text-primary' : 'text-outline'}`}
                            data-icon="cloud_upload"
                          >
                            cloud_upload
                          </span>
                          <p className="font-label-md text-label-md text-on-surface font-bold mt-2">
                            {isDragging ? 'Drop to upload' : 'Drag and drop assets'}
                          </p>
                          <p className="text-label-sm font-label-sm text-outline">MP4, MOV, or High-Res JPG</p>
                          <p className="text-primary text-xs mt-2 underline">or click to browse</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Input Fields */}
                  <div className="space-y-4">
                    <div>
                      <label className="block font-label-md text-label-md text-on-surface mb-2">Line Name</label>
                      <input
                        className="w-full bg-white border border-outline-variant rounded-lg px-4 py-3 text-body-sm focus:ring-2 focus:ring-primary focus:outline-none"
                        type="text"
                        value={lineName}
                        onChange={(e) => setLineName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block font-label-md text-label-md text-on-surface mb-2">Kilometer Marker</label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline" data-icon="location_on">location_on</span>
                        <input
                          className="w-full bg-white border border-outline-variant rounded-lg pl-10 pr-4 py-3 text-body-sm focus:ring-2 focus:ring-primary focus:outline-none"
                          type="text"
                          value={kilometerMarker}
                          onChange={(e) => setKilometerMarker(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Run Analysis Button */}
                  <button
                    onClick={handleRunAnalysis}
                    disabled={!uploadedFile || isAnalyzing}
                    type="button"
                    className={[
                      'w-full py-4 rounded-lg font-bold flex items-center justify-center gap-3',
                      'transition-all duration-200 shadow-md active:scale-[0.98]',
                      !uploadedFile || isAnalyzing
                        ? 'bg-surface-container text-on-surface-variant cursor-not-allowed opacity-60'
                        : 'bg-primary-container text-on-primary-container hover:opacity-90 cursor-pointer',
                    ].join(' ')}
                  >
                    <span className={`material-symbols-outlined ${isAnalyzing ? 'animate-spin' : ''}`} data-icon="play_circle">
                      {isAnalyzing ? 'refresh' : 'play_circle'}
                    </span>
                    {isAnalyzing
                      ? 'Running AI Vision Analysis...'
                      : !uploadedFile
                      ? 'Upload a file first'
                      : 'Run Analysis'}
                  </button>

                  {/* Status banner when backend mock is used */}
                  {analysisResult?.status === 'mock' && (
                    <div className="p-3 bg-secondary-container/40 border border-secondary/20 rounded-lg text-xs text-on-secondary-container flex items-start gap-2">
                      <span className="material-symbols-outlined text-sm text-secondary mt-0.5">info</span>
                      <span>{analysisResult.message}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Mini Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
                  <p className="text-label-sm font-label-sm text-outline">Historical Average</p>
                  <p className="font-headline-sm text-headline-sm text-primary">0.82 <span className="text-body-sm font-normal">defects/km</span></p>
                </div>
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
                  <p className="text-label-sm font-label-sm text-outline">Last Inspection</p>
                  <p className="font-headline-sm text-headline-sm text-on-surface">14d ago</p>
                </div>
              </div>
            </section>

            {/* Right Column: Inspection View */}
            <section className="col-span-12 lg:col-span-8">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm h-full flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-outline-variant bg-white">
                  <div className="flex items-center gap-3">
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">Inspection View</h3>
                    <span className="px-2 py-1 bg-surface-container-highest text-primary text-[10px] font-bold rounded uppercase tracking-tighter">Live Preview</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-surface-container rounded transition-colors">
                      <span className="material-symbols-outlined" data-icon="zoom_in">zoom_in</span>
                    </button>
                    <button className="p-2 hover:bg-surface-container rounded transition-colors">
                      <span className="material-symbols-outlined" data-icon="fullscreen">fullscreen</span>
                    </button>
                    {analysisResult?.maintenance_priority && (
                      <div className={`px-4 py-1.5 rounded-full flex items-center gap-2 ${analysisResult.maintenance_priority === 'critical' ? 'animate-pulse' : ''} ${getPriorityBgColor(analysisResult.maintenance_priority)}`}>
                        <span className="w-2 h-2 bg-white rounded-full"></span>
                        <span className="font-label-md text-label-md font-bold uppercase">Priority: {analysisResult.maintenance_priority}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Viewer Area */}
                <div className="relative flex-1 bg-on-surface flex items-center justify-center overflow-hidden min-h-[400px]">
                  {/* Show uploaded image preview if it's an image, else show default */}
                  {uploadedFile && uploadedFile.type.startsWith('image/') ? (
                    <img
                      alt="Uploaded track asset"
                      className={`w-full h-full object-cover transition-opacity duration-500 ${isAnalyzing ? 'opacity-50 blur-sm' : 'opacity-90'}`}
                      src={URL.createObjectURL(uploadedFile)}
                    />
                  ) : (
                    <img
                      alt="Track Health Analysis Viewer"
                      className={`w-full h-full object-cover transition-opacity duration-500 ${isAnalyzing ? 'opacity-50 blur-sm' : 'opacity-90'}`}
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCbnpqfYNUFSS4vSZBldS-MvAsF3nxCxhD32K76rbd8FToyZszci_3jvFrP1KGmKDcKodL8UPJb7AhDfpvnrQqnNXuqAyObRh2ydpfgUUWlq5Wd1dsBCxaykzYCAFsKhDXWTx2Y2H9dh10hsyJNZGg8CkAuj7P6krp8PpO7LRD5FPKofBhQ-peaSEOC2FBNkwzC4GzrWsxIlC9JhkGtXyoRmvngv4gfdjqhdmsvr4sr_qpjeYNUbA4lAeD8zGnJTteOfnfaYfCD8tbH"
                    />
                  )}

                  {isAnalyzing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <p className="mt-4 text-white font-headline-sm">Processing Neural Vision Models...</p>
                      <p className="mt-1 text-white/60 text-sm">{uploadedFile?.name}</p>
                    </div>
                  )}

                  {/* HUD overlays */}
                  {!isAnalyzing && (
                    <>
                      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md p-3 rounded-lg border border-white/10 text-white space-y-1">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[10px] text-white/60">LOCATION</span>
                          <span className="text-[12px] font-mono">{kilometerMarker}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[10px] text-white/60">SYSTEM STATUS</span>
                          <span className="text-[12px] text-green-400 font-bold">READY</span>
                        </div>
                      </div>
                      {analysisResult && (
                        <div className="absolute bottom-6 right-6 flex flex-col gap-2">
                          <div className="flex items-center gap-3 bg-primary/80 backdrop-blur-sm p-3 rounded-lg border border-primary-fixed/20">
                            <div className="w-10 h-10 rounded-full border-2 border-white/20 flex items-center justify-center">
                              <span className="text-white font-bold text-xs">
                                {analysisResult.defects.length > 0
                                  ? `${defectConfidence(analysisResult.defects[0]).toFixed(0)}%`
                                  : '✓'}
                              </span>
                            </div>
                            <div className="text-white">
                              <p className="text-[10px] opacity-80 uppercase font-bold">AI Confidence</p>
                              <p className="text-sm font-bold">
                                {analysisResult.defects.length > 0 ? 'Defects Found' : 'No Defects'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* ── Defect Log ───────────────────────────────────────────────────── */}
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-outline-variant bg-white">
              <div className="flex items-center gap-3">
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Defect Log</h3>
                <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-label-sm font-bold">
                  {analysisResult ? `${analysisResult.defects.length} Detection${analysisResult.defects.length !== 1 ? 's' : ''}` : '—'}
                </span>
              </div>
              <button
                disabled={!analysisResult}
                className="bg-[#0F3460] text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-sm" data-icon="file_download">file_download</span>
                Export Work Order
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-on-background/5">
                    <th className="px-6 py-4 font-label-md text-label-md text-on-background border-b border-outline-variant">Class</th>
                    <th className="px-6 py-4 font-label-md text-label-md text-on-background border-b border-outline-variant">Location (GPS/KM)</th>
                    <th className="px-6 py-4 font-label-md text-label-md text-on-background border-b border-outline-variant text-center">Confidence</th>
                    <th className="px-6 py-4 font-label-md text-label-md text-on-background border-b border-outline-variant">Risk Score</th>
                    <th className="px-6 py-4 font-label-md text-label-md text-on-background border-b border-outline-variant">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {analysisResult ? (
                    analysisResult.defects && analysisResult.defects.length > 0 ? (
                      analysisResult.defects.map((defect, i) => {
                        const label = defectLabel(defect);
                        const conf = defectConfidence(defect);
                        return (
                          <tr key={i} className="hover:bg-tertiary/5 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded flex items-center justify-center ${getIconColorForDefect(label)}`}>
                                  <span className="material-symbols-outlined" data-icon={getIconForDefect(label)}>{getIconForDefect(label)}</span>
                                </div>
                                <span className="font-body-md text-body-md font-bold text-on-surface">{label}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-body-sm text-on-surface-variant">
                              {defect.location || kilometerMarker}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="w-full bg-surface-container rounded-full h-2 max-w-[100px] mx-auto overflow-hidden">
                                <div className="bg-primary h-full" style={{ width: `${conf}%` }}></div>
                              </div>
                              <span className="text-[10px] font-bold text-primary">{conf.toFixed(1)}%</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-12 h-1 bg-surface-container rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${defect.risk_score > 7 ? 'bg-error' : defect.risk_score > 4 ? 'bg-secondary' : 'bg-outline'}`}
                                    style={{ width: `${defect.risk_score * 10}%` }}
                                  ></div>
                                </div>
                                <span className={`text-body-sm font-bold ${defect.risk_score > 7 ? 'text-error' : defect.risk_score > 4 ? 'text-secondary' : 'text-outline'}`}>
                                  {defect.risk_score}/10
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-label-sm text-sm text-on-surface-variant border border-outline-variant px-3 py-1 rounded">
                                {defect.recommended_action || 'Schedule Maintenance'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <span className="material-symbols-outlined text-3xl text-green-500" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            <p className="text-green-600 font-semibold">No defects detected in uploaded image</p>
                            <p className="text-on-surface-variant text-sm">Track section appears to be in good condition.</p>
                          </div>
                        </td>
                      </tr>
                    )
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center">
                        <div className="flex flex-col items-center gap-2 text-on-surface-variant">
                          <span className="material-symbols-outlined text-3xl text-outline">upload_file</span>
                          <p className="font-medium">
                            {uploadedFile
                              ? 'Click "Run Analysis" to detect defects'
                              : 'Upload a file and click Run Analysis to see results'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* System Footer Toast */}
          <footer className="mt-8 h-10 bg-on-background text-white/40 px-6 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] rounded-t-lg">
            <div className="flex items-center gap-4">
              <span>RailSense AI Engine v4.2.0</span>
              <span>ENC: RSA-4096</span>
            </div>
            <div className="flex items-center gap-4">
              {analysisResult?.model_version && (
                <span>Powered by {analysisResult.model_version}</span>
              )}
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                Neural Engine Connected
              </span>
            </div>
          </footer>

        </div>
      </div>
    </div>
  );
}
