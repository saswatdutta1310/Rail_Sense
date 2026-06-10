import { useState } from 'react';
import { UploadCloud, AlertTriangle, Users, Activity, CheckCircle2 } from 'lucide-react';

export default function PlatformGuard() {
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
      
      const res = await fetch('/api/vision/platform', {
        method: 'POST',
        body: formData
      });
      
      if (res.ok) {
        setResult(await res.json());
      } else {
        throw new Error('API Error');
      }
    } catch (e) {
      // Mock fallback
      setTimeout(() => {
        setResult({
          crowd_density_score: 6.2,
          alert_level: 'Red - High Crowd Density',
          fall_detected: false,
          detections: [
            { label: 'person', confidence: 0.92 },
            { label: 'person', confidence: 0.88 },
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
      <div className="w-full md:w-1/3 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h2 className="text-xl font-semibold text-navy mb-6">Platform Camera Input</h2>
        
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-neutralDark mb-2">Select Station & Platform</label>
            <select className="w-full mb-3 px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary outline-none">
              <option>New Delhi (NDLS)</option>
              <option>Howrah (HWH)</option>
              <option>Mumbai Central (MMCT)</option>
            </select>
            <select className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary outline-none">
              <option>Platform 1</option>
              <option>Platform 2</option>
              <option>Platform 3</option>
            </select>
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors">
            <UploadCloud className="w-10 h-10 text-slate-400 mb-3" />
            <p className="text-sm text-neutralDark mb-2 text-center">Drag and drop CCTV feed snapshot or</p>
            <label className="bg-white border border-slate-300 text-neutralDark px-4 py-2 rounded shadow-sm cursor-pointer hover:bg-slate-50 text-sm">
              Browse Files
              <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
            </label>
            {file && <p className="mt-3 text-xs font-semibold text-primary">{file.name}</p>}
          </div>

          <button 
            onClick={handleAnalyze}
            disabled={!file || analyzing}
            className="w-full bg-primary hover:bg-navy text-white font-semibold py-3 rounded-md transition-colors disabled:opacity-50"
          >
            {analyzing ? 'Processing Vision Model...' : 'Analyze Feed'}
          </button>
        </div>
      </div>

      {/* Right Panel - Results */}
      <div className="w-full md:w-2/3 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h2 className="text-xl font-semibold text-navy mb-4">Live Analysis</h2>
        
        {result ? (
          <div className="space-y-6">
            <div className="w-full h-64 bg-slate-900 rounded-lg flex items-center justify-center relative overflow-hidden">
              <img 
                src={file ? URL.createObjectURL(file) : ''} 
                alt="Analyzed Frame" 
                className="opacity-50 object-cover w-full h-full"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div className="absolute inset-0 flex items-center justify-center flex-col text-white">
                 <ScanLine className="w-12 h-12 text-success animate-pulse mb-2" />
                 <span>YOLOv5 Detections Rendered (Mock)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border border-slate-100 bg-slate-50 flex items-center gap-4">
                <div className={`p-3 rounded-full ${result.alert_level.includes('Red') ? 'bg-red-100 text-danger' : 'bg-green-100 text-success'}`}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Alert Level</div>
                  <div className="text-sm font-bold text-navy">{result.alert_level}</div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-slate-100 bg-slate-50 flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-100 text-primary">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Crowd Density</div>
                  <div className="text-sm font-bold text-navy">{result.crowd_density_score} persons/m²</div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-slate-100 bg-slate-50 flex items-center gap-4">
                <div className={`p-3 rounded-full ${result.fall_detected ? 'bg-red-100 text-danger' : 'bg-green-100 text-success'}`}>
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Fall Detected</div>
                  <div className="text-sm font-bold text-navy">{result.fall_detected ? 'YES' : 'NO'}</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
             <CheckCircle2 className="w-12 h-12 text-slate-300 mb-3" />
             <p className="text-slate-500">Upload a feed and run analysis to view metrics.</p>
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
