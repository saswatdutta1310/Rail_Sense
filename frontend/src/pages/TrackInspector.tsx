import { useState } from 'react';
import { apiCall } from '../api/client';

interface TrackDefect {
  defect_class: string;
  confidence: number;
  risk_score: number;
  recommended_action: string;
}

interface TrackAnalysisResult {
  analysis_id: string;
  defects_found: number;
  maintenance_priority: string;
  defects: TrackDefect[];
}

export default function TrackInspector() {
  const [lineName, setLineName] = useState('North Corridor Delta');
  const [kmMarker, setKmMarker] = useState('KM 142.5');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<TrackAnalysisResult | null>(null);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      const blob = new Blob(["dummy content track"], { type: "image/jpeg" });
      formData.append("file", blob, "track_feed.jpg");

      const response = await apiCall<TrackAnalysisResult>('/vision/track', {
        method: 'POST',
        body: formData,
      }, {
        // Mock fallback if auth fails
        analysis_id: 'mock-123',
        defects_found: 3,
        maintenance_priority: 'critical',
        defects: [
          { defect_class: 'Transverse Fracture', confidence: 0.98, risk_score: 8.5, recommended_action: 'Immediate Stop & Inspect' },
          { defect_class: 'Missing Fastener (E-Clip)', confidence: 0.94, risk_score: 4.2, recommended_action: 'Schedule Maintenance' },
          { defect_class: 'Ballast Fouling', confidence: 0.88, risk_score: 2.1, recommended_action: 'Routine Check' }
        ]
      });
      
      setResult(response);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };



  const getPriorityBgColor = (priority?: string) => {
    switch(priority?.toLowerCase()) {
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

  return (
    <div className="w-full">
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* TopNavBar */}
        <header className="w-full h-16 flex justify-between items-center px-margin-desktop bg-surface border-b border-outline-variant z-40">
          <div className="flex items-center gap-4">
            <h1 className="font-headline-md text-headline-md font-bold text-primary">Track Health Inspector</h1>
          </div>
          {/* Search & Actions */}
          <div className="flex items-center gap-6">
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline" data-icon="search">search</span>
              <input className="pl-10 pr-4 py-2 bg-surface-container border border-outline-variant rounded-lg text-body-sm focus:ring-2 focus:ring-primary focus:outline-none w-64 transition-all" placeholder="Search infrastructure IDs..." type="text"/>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors cursor-pointer active:opacity-80">
                <span className="material-symbols-outlined" data-icon="notifications">notifications</span>
              </button>
              <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors cursor-pointer active:opacity-80">
                <span className="material-symbols-outlined" data-icon="settings">settings</span>
              </button>
              <div className="h-8 w-[1px] bg-outline-variant mx-2"></div>
              <div className="flex items-center gap-3 cursor-pointer">
                <img alt="Engineer Profile" className="w-10 h-10 rounded-full object-cover border border-primary/20" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDK8P1f6OtZhoEfBJQrNFhgMPUuhkQPjMnpZD9QuLDBX5rOz8A8EGwFHk9p3vp3cPo-CEmKpjOKFVufrwezQLfTZ54UffEwcumJ-eLd_S_t1AZ5LVuAspeu93fmnX1zdftf_uS0OxnyAXmdVReep2WWL152Mc3it0RO4ldLrBTpXjmE06Jr82N06LwryWG_gG6AzaecR4naSsCv89tcl8T3nsS1AQKqK10xHE2H1TFoG2jNM03CsIdLiENcKP6EX9IjkSPOIl153lsP"/>
                <div className="hidden xl:block">
                  <p className="font-label-md text-label-md text-on-surface font-bold">Sarah Chen</p>
                  <p className="text-[10px] text-outline uppercase tracking-wider">Lead Inspector</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-gutter bg-background custom-scrollbar">
          <div className="max-w-[1600px] mx-auto space-y-gutter">
            {/* Hero Grid: Analysis Config & Inspection View */}
            <div className="grid grid-cols-12 gap-gutter">
              {/* Left Column: Controls (Analysis Configuration) */}
              <section className="col-span-12 lg:col-span-4 flex flex-col gap-gutter">
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6 border-b border-outline-variant pb-4">
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">Analysis Configuration</h3>
                    <span className="material-symbols-outlined text-primary" data-icon="tune">tune</span>
                  </div>
                  <form className="space-y-6">
                    {/* Upload Zone */}
                    <div className="relative border-2 border-dashed border-outline-variant rounded-lg p-8 flex flex-col items-center justify-center gap-3 bg-surface-container-low hover:bg-surface-container-high transition-colors cursor-pointer group">
                      <span className="material-symbols-outlined text-4xl text-outline group-hover:text-primary transition-colors" data-icon="cloud_upload">cloud_upload</span>
                      <div className="text-center">
                        <p className="font-label-md text-label-md text-on-surface font-bold">Drag and drop assets</p>
                        <p className="text-label-sm font-label-sm text-outline">MP4, MOV, or High-Res JPG</p>
                      </div>
                      <input className="absolute inset-0 opacity-0 cursor-pointer" type="file"/>
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
                            value={kmMarker}
                            onChange={(e) => setKmMarker(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    {/* Action Button */}
                    <button 
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="w-full py-4 bg-primary-container text-on-primary-container rounded-lg font-bold flex items-center justify-center gap-3 hover:opacity-90 active:scale-[0.98] transition-all shadow-md disabled:opacity-50" 
                      type="button"
                    >
                      <span className={`material-symbols-outlined ${isAnalyzing ? 'animate-spin' : ''}`} data-icon="play_circle">{isAnalyzing ? 'refresh' : 'play_circle'}</span>
                      {isAnalyzing ? 'Running AI Vision Analysis...' : 'Run Analysis'}
                    </button>
                  </form>
                </div>
                {/* Mini Stats for Context */}
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

              {/* Right Column: Analysis (Inspection View) */}
              <section className="col-span-12 lg:col-span-8">
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm h-full flex flex-col">
                  <div className="flex items-center justify-between p-6 border-b border-outline-variant bg-white">
                    <div className="flex items-center gap-3">
                      <h3 className="font-headline-sm text-headline-sm text-on-surface">Inspection View</h3>
                      <span className="px-2 py-1 bg-surface-container-highest text-primary text-[10px] font-bold rounded uppercase tracking-tighter">Live Preview</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-surface-container rounded transition-colors"><span className="material-symbols-outlined" data-icon="zoom_in">zoom_in</span></button>
                      <button className="p-2 hover:bg-surface-container rounded transition-colors"><span className="material-symbols-outlined" data-icon="fullscreen">fullscreen</span></button>
                      {result && result.maintenance_priority && (
                        <div className={`px-4 py-1.5 rounded-full flex items-center gap-2 ${result.maintenance_priority === 'critical' ? 'animate-pulse' : ''} ${getPriorityBgColor(result.maintenance_priority)}`}>
                          <span className="w-2 h-2 bg-white rounded-full"></span>
                          <span className="font-label-md text-label-md font-bold uppercase">Priority: {result.maintenance_priority}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Viewer Area */}
                  <div className="relative flex-1 bg-on-surface flex items-center justify-center overflow-hidden min-h-[400px]">
                    <img alt="Track Health Analysis Viewer" className={`w-full h-full object-cover transition-opacity duration-500 ${isAnalyzing ? 'opacity-50 blur-sm' : 'opacity-90'}`} src="https://lh3.googleusercontent.com/aida-public/AB6AXuCbnpqfYNUFSS4vSZBldS-MvAsF3nxCxhD32K76rbd8FToyZszci_3jvFrP1KGmKDcKodL8UPJb7AhDfpvnrQqnNXuqAyObRh2ydpfgUUWlq5Wd1dsBCxaykzYCAFsKhDXWTx2Y2H9dh10hsyJNZGg8CkAuj7P6krp8PpO7LRD5FPKofBhQ-peaSEOC2FBNkwzC4GzrWsxIlC9JhkGtXyoRmvngv4gfdjqhdmsvr4sr_qpjeYNUbA4lAeD8zGnJTteOfnfaYfCD8tbH"/>
                    
                    {isAnalyzing && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-white font-headline-sm">Processing Neural Vision Models...</p>
                      </div>
                    )}
                    
                    {/* Floating UI Overlays */}
                    {!isAnalyzing && (
                      <>
                        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md p-3 rounded-lg border border-white/10 text-white space-y-1">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[10px] text-white/60">GPS COORDS</span>
                            <span className="text-[12px] font-mono">40.7128° N, 74.0060° W</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[10px] text-white/60">SYSTEM STATUS</span>
                            <span className="text-[12px] text-green-400 font-bold">READY</span>
                          </div>
                        </div>
                        {/* AI Confidence Indicators */}
                        {result && (
                          <div className="absolute bottom-6 right-6 flex flex-col gap-2">
                            <div className="flex items-center gap-3 bg-primary/80 backdrop-blur-sm p-3 rounded-lg border border-primary-fixed/20">
                              <div className="w-10 h-10 rounded-full border-2 border-white/20 flex items-center justify-center">
                                <span className="text-white font-bold text-xs">{result.defects_found > 0 ? (result.defects[0].confidence * 100).toFixed(0) : 99}%</span>
                              </div>
                              <div className="text-white">
                                <p className="text-[10px] opacity-80 uppercase font-bold">AI Confidence</p>
                                <p className="text-sm font-bold">Optimal Signal</p>
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
            
            {/* Bottom Section: Reporting (Defect Log) */}
            <section className={`bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden transition-all duration-700 ${result ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
              <div className="flex items-center justify-between p-6 border-b border-outline-variant bg-white">
                <div className="flex items-center gap-3">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">Defect Log</h3>
                  <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-label-sm font-bold">{result?.defects_found || 0} Detections</span>
                </div>
                <button className="bg-[#0F3460] text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 transition-opacity">
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
                      <th className="px-6 py-4 font-label-md text-label-md text-on-background border-b border-outline-variant text-center">Confidence (%)</th>
                      <th className="px-6 py-4 font-label-md text-label-md text-on-background border-b border-outline-variant">Risk Score</th>
                      <th className="px-6 py-4 font-label-md text-label-md text-on-background border-b border-outline-variant">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {result?.defects.map((defect, index) => (
                      <tr key={index} className="hover:bg-tertiary/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded flex items-center justify-center ${getIconColorForDefect(defect.defect_class)}`}>
                              <span className="material-symbols-outlined" data-icon={getIconForDefect(defect.defect_class)}>{getIconForDefect(defect.defect_class)}</span>
                            </div>
                            <span className="font-body-md text-body-md font-bold text-on-surface">{defect.defect_class}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-body-sm text-on-surface-variant">{kmMarker} / 40.7128, -74.006</td>
                        <td className="px-6 py-4 text-center">
                          <div className="w-full bg-surface-container rounded-full h-2 max-w-[100px] mx-auto overflow-hidden">
                            <div className="bg-primary h-full" style={{ width: `${defect.confidence * 100}%` }}></div>
                          </div>
                          <span className="text-[10px] font-bold text-primary">{(defect.confidence * 100).toFixed(1)}%</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1 bg-surface-container rounded-full overflow-hidden">
                              <div className={`h-full ${defect.risk_score > 7 ? 'bg-error' : defect.risk_score > 4 ? 'bg-secondary' : 'bg-outline'}`} style={{ width: `${defect.risk_score * 10}%` }}></div>
                            </div>
                            <span className={`text-body-sm font-bold ${defect.risk_score > 7 ? 'text-error' : defect.risk_score > 4 ? 'text-secondary' : 'text-outline'}`}>{defect.risk_score}/10</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-label-sm text-sm text-on-surface-variant border border-outline-variant px-3 py-1 rounded">
                            {defect.recommended_action}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {result?.defects.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant">No defects found in this scan.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
          
          {/* System Footer Toast */}
          <footer className="mt-8 h-10 bg-on-background text-white/40 px-6 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] rounded-t-lg">
            <div className="flex items-center gap-4">
              <span>RailSense AI Engine v4.2.0</span>
              <span>ENC: RSA-4096</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Neural Engine Connected</span>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
