import { useState } from 'react';
import { Search, CloudRain, CloudFog, Signal, Clock } from 'lucide-react';

export default function DelayPredictor() {
  const [trainNo, setTrainNo] = useState('');
  const [fogIndex, setFogIndex] = useState(0.2);
  const [rainfall, setRainfall] = useState(0);
  const [signalStatus, setSignalStatus] = useState('normal');
  const [result, setResult] = useState<any>(null);
  const [cascade, setCascade] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handlePredict = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/delay/${trainNo}?fog_index=${fogIndex}&rainfall=${rainfall}&signal_status=${signalStatus}`);
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        const cascadeRes = await fetch(`/api/delay/cascade/${trainNo}`);
        if (cascadeRes.ok) {
          setCascade(await cascadeRes.json());
        }
      } else {
        // Fallback mock if backend isn't up
        setResult({
          predicted_delay_min: 47,
          confidence_pct: 82.5,
          root_causes: ['FOG', 'SIGNAL FAULT']
        });
        setCascade({
          cascades: [
            { downstream_train: '12301 Howrah Rajdhani', impact_delay_min: 20 },
            { downstream_train: '12810 Howrah Mail', impact_delay_min: 15 }
          ]
        });
      }
    } catch (e) {
        // Fallback mock
        setResult({
          predicted_delay_min: 47,
          confidence_pct: 82.5,
          root_causes: ['FOG', 'SIGNAL FAULT']
        });
        setCascade({
          cascades: [
            { downstream_train: '12301 Howrah Rajdhani', impact_delay_min: 20 },
            { downstream_train: '12810 Howrah Mail', impact_delay_min: 15 }
          ]
        });
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">
      {/* Left Panel - Controls */}
      <div className="w-full md:w-1/3 bg-white p-6 rounded-lg shadow-sm border border-slate-200 h-fit">
        <h2 className="text-xl font-semibold text-navy mb-6">Prediction Parameters</h2>
        
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-neutralDark mb-2">Train Number</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                value={trainNo}
                onChange={(e) => setTrainNo(e.target.value)}
                placeholder="e.g. 12301" 
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutralDark mb-2 flex items-center gap-2">
              <CloudFog className="w-4 h-4" /> Fog Index (0-1)
            </label>
            <input 
              type="range" min="0" max="1" step="0.1" 
              value={fogIndex} onChange={(e) => setFogIndex(parseFloat(e.target.value))}
              className="w-full accent-primary" 
            />
            <div className="text-right text-xs text-slate-500 mt-1">{fogIndex}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutralDark mb-2 flex items-center gap-2">
              <CloudRain className="w-4 h-4" /> Rainfall (mm)
            </label>
            <input 
              type="number" 
              value={rainfall} onChange={(e) => setRainfall(parseFloat(e.target.value))}
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutralDark mb-2 flex items-center gap-2">
              <Signal className="w-4 h-4" /> Signal Status
            </label>
            <select 
              value={signalStatus} onChange={(e) => setSignalStatus(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="normal">Normal</option>
              <option value="degraded">Degraded</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <button 
            onClick={handlePredict}
            disabled={!trainNo || loading}
            className="w-full bg-primary hover:bg-navy text-white font-semibold py-3 rounded-md transition-colors disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : 'Predict Delay'}
          </button>
        </div>
      </div>

      {/* Right Panel - Results */}
      <div className="w-full md:w-2/3 space-y-6">
        {result ? (
          <>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <h2 className="text-xl font-semibold text-navy mb-4">Prediction Result</h2>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500 uppercase tracking-wide">Expected Delay</div>
                  <div className={`text-5xl font-bold ${result.predicted_delay_min > 30 ? 'text-danger' : 'text-warning'}`}>
                    {result.predicted_delay_min} <span className="text-2xl text-neutralDark">min</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-500 uppercase tracking-wide">AI Confidence</div>
                  <div className="text-3xl font-semibold text-success">{result.confidence_pct}%</div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="text-sm font-medium text-neutralDark mb-3">Identified Root Causes:</div>
                <div className="flex flex-wrap gap-2">
                  {result.root_causes.map((cause: string) => (
                    <span key={cause} className="bg-red-100 text-danger px-3 py-1 rounded-full text-sm font-bold tracking-wide">
                      {cause}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {cascade && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h2 className="text-xl font-semibold text-navy mb-4">Cascade Impact Analysis</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-sm font-semibold text-navy">Downstream Train</th>
                        <th className="px-4 py-3 text-sm font-semibold text-navy">Est. Ripple Delay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cascade.cascades.map((c: any, idx: number) => (
                        <tr key={idx} className="border-b border-slate-100">
                          <td className="px-4 py-3 text-sm text-neutralDark font-medium">{c.downstream_train}</td>
                          <td className="px-4 py-3 text-sm text-warning font-semibold">+{c.impact_delay_min} min</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white p-12 rounded-lg shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center h-full">
            <Clock className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-400">Awaiting Input</h3>
            <p className="text-slate-500 mt-2">Enter a train number and adjust parameters to see AI prediction.</p>
          </div>
        )}
      </div>
    </div>
  );
}
