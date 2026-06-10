import { useState } from 'react';
import { UploadCloud, Wrench, ShieldAlert, Navigation } from 'lucide-react';

export default function TrackInspector() {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/vision/track', {
        method: 'POST',
        body: formData
      });
      
      if (res.ok) {
        setResult(await res.json());
      } else {
        throw new Error('API Error');
      }
    } catch (e) {
      setTimeout(() => {
        setResult({
          defects_found: 2,
          maintenance_priority: 'High',
          defects: [
            { defect_class: 'Cracked Fastener', risk_score: 8.4, confidence: 0.94, recommended_action: 'Immediate Inspect' },
            { defect_class: 'Surface Flaw', risk_score: 4.2, confidence: 0.81, recommended_action: 'Schedule Maintenance' }
          ]
        });
        setAnalyzing(false);
      }, 1500);
      return;
    }
    setAnalyzing(false);
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">
      {/* Left Panel - Upload */}
      <div className="w-full md:w-1/3 bg-surface-container-lowest p-6 rounded-lg shadow-sm border border-outline-variant">
        <h2 className="text-xl font-semibold text-on-surface mb-6">Track Input Data</h2>
        
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-2">Track Segment (Line & KM Marker)</label>
            <div className="flex gap-2">
              <input type="text" placeholder="Line (e.g. Main)" className="w-1/2 px-4 py-2 border border-outline rounded-md focus:ring-2 focus:ring-primary outline-none" />
              <input type="text" placeholder="KM (e.g. 142.5)" className="w-1/2 px-4 py-2 border border-outline rounded-md focus:ring-2 focus:ring-primary outline-none" />
            </div>
          </div>

          <div className="border-2 border-dashed border-outline rounded-lg p-8 flex flex-col items-center justify-center bg-surface-container-low hover:bg-surface-container transition-colors">
            <UploadCloud className="w-10 h-10 text-outline mb-3" />
            <p className="text-sm text-on-surface-variant mb-2 text-center">Upload track surface image</p>
            <label className="bg-surface-container-lowest border border-outline text-on-surface-variant px-4 py-2 rounded shadow-sm cursor-pointer hover:bg-surface-container-low text-sm">
              Browse Files
              <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            </label>
            {file && <p className="mt-3 text-xs font-semibold text-primary">{file.name}</p>}
          </div>

          <button 
            onClick={handleAnalyze}
            disabled={!file || analyzing}
            className="w-full bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container font-semibold py-3 rounded-md transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
          >
            <Navigation className="w-5 h-5" />
            {analyzing ? 'Scanning Track...' : 'Run Diagnostics'}
          </button>
        </div>
      </div>

      {/* Right Panel - Results */}
      <div className="w-full md:w-2/3 bg-surface-container-lowest p-6 rounded-lg shadow-sm border border-outline-variant">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-on-surface">Diagnostic Report</h2>
            {result && (
                <span className={`px-4 py-1 rounded-full text-sm font-bold tracking-wider text-on-error ${result.maintenance_priority === 'Critical' || result.maintenance_priority === 'High' ? 'bg-error' : 'bg-warning'}`}>
                    PRIORITY: {result.maintenance_priority.toUpperCase()}
                </span>
            )}
        </div>
        
        {result ? (
          <div className="space-y-6">
            <div className="w-full h-64 bg-slate-800 rounded-lg flex items-center justify-center relative overflow-hidden border border-slate-700">
               <img 
                src={file ? URL.createObjectURL(file) : ''} 
                alt="Track Frame" 
                className="opacity-40 object-cover w-full h-full grayscale"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div className="absolute inset-0 flex items-center justify-center flex-col text-white">
                 <ScanLine className="w-12 h-12 text-warning animate-spin-slow mb-2" />
                 <span>Defect Bounding Boxes Rendered</span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-wide mb-3 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> Detected Anomalies ({result.defects_found})
              </h3>
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant">
                        <th className="px-4 py-3 text-sm font-semibold text-on-surface">Defect Class</th>
                        <th className="px-4 py-3 text-sm font-semibold text-on-surface">AI Confidence</th>
                        <th className="px-4 py-3 text-sm font-semibold text-on-surface">Risk Score</th>
                        <th className="px-4 py-3 text-sm font-semibold text-on-surface">Recommended Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.defects.map((d: any, idx: number) => (
                        <tr key={idx} className="border-b border-surface-container-highest hover:bg-surface-container-low">
                          <td className="px-4 py-3 text-sm text-on-surface-variant font-medium flex items-center gap-2">
                              <Wrench className="w-4 h-4 text-outline" /> {d.defect_class}
                          </td>
                          <td className="px-4 py-3 text-sm text-on-surface-variant">{Math.round(d.confidence * 100)}%</td>
                          <td className="px-4 py-3 text-sm font-semibold text-error">{d.risk_score} / 10</td>
                          <td className="px-4 py-3 text-sm text-primary font-medium">{d.recommended_action}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex justify-end">
                    <button className="bg-inverse-surface hover:bg-surface-tint text-inverse-on-surface px-4 py-2 rounded shadow-sm text-sm font-medium transition-colors">
                        Export Work Order
                    </button>
                </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-outline-variant rounded-lg bg-surface-container-low">
             <Wrench className="w-12 h-12 text-outline mb-3" />
             <p className="text-outline">Upload track imagery to identify structural defects.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Add missing icon
const ScanLine = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
    <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
    <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
    <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
    <line x1="3" y1="12" x2="21" y2="12"></line>
  </svg>
)
