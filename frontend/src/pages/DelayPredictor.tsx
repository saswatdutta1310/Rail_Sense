import { useState } from 'react';
import { apiCall } from '../api/client';

export default function DelayPredictor() {
  const [trainId, setTrainId] = useState('RS-402 Intercity Express');
  const [fogDensity, setFogDensity] = useState(75);
  const [rainfall, setRainfall] = useState('Moderate Rain');
  const [signalHealth, setSignalHealth] = useState(true);
  
  const [isLoading, setIsLoading] = useState(false);
  const [delayMin, setDelayMin] = useState(47);
  const [confidence, setConfidence] = useState(82);

  const handlePredict = async () => {
    setIsLoading(true);
    try {
      const response = await apiCall<any>('/delay/predict', {
        method: 'POST',
        body: JSON.stringify({
          train_id: trainId,
          weather_data: {
            condition: rainfall,
            temperature: 25,
            wind_speed_kmh: 15,
            precipitation_mm: fogDensity > 50 ? 10 : 0,
            fog_density: fogDensity
          },
          signal_status: signalHealth ? 'normal' : 'critical',
          congestion_level: 0.6
        })
      }, {
        predicted_delay_minutes: Math.floor(Math.random() * 30) + 15 + (fogDensity > 70 ? 20 : 0) + (!signalHealth ? 40 : 0),
        confidence_score: Math.floor(Math.random() * 20) + 75
      });
      
      setDelayMin(response.predicted_delay_minutes || 47);
      setConfidence(response.confidence_score || 82);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1" style={{ minHeight: 'calc(100vh - 64px)' }}>
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Controls & Search */}
        <section className="w-[380px] bg-white border-r border-outline-variant p-6 flex flex-col gap-8 overflow-y-auto shrink-0">
          {/* Train Search */}
          <div>
            <label className="block font-label-md text-label-md text-primary mb-3">Train Identifier</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" data-icon="train">train</span>
              <input 
                className="w-full pl-10 pr-4 py-3 bg-surface border border-outline-variant rounded focus:border-primary focus:ring-0 font-body-md text-body-md" 
                type="text" 
                value={trainId}
                onChange={(e) => setTrainId(e.target.value)}
              />
            </div>
          </div>
          
          {/* Weather Controls */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" data-icon="cloud">cloud</span>
                Weather Parameters
              </h3>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="font-label-md text-label-md text-on-surface-variant">Fog Density</label>
                  <span className="font-label-md text-label-md text-primary font-bold">{fogDensity}%</span>
                </div>
                <input 
                  className="w-full appearance-none h-1.5" 
                  max="100" min="0" type="range" 
                  value={fogDensity}
                  onChange={(e) => setFogDensity(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Rainfall Intensity</label>
                <select 
                  value={rainfall}
                  onChange={(e) => setRainfall(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded px-4 py-2.5 font-body-sm text-body-sm focus:ring-primary focus:border-primary"
                >
                  <option>Light Drizzle</option>
                  <option>Moderate Rain</option>
                  <option>Heavy Downpour</option>
                  <option>Storm Surge</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Signal Status Toggle */}
          <div className="p-4 bg-surface-container-low rounded-xl border border-primary/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined ${signalHealth ? 'text-primary' : 'text-error'}`} data-icon="traffic">traffic</span>
                <div>
                  <p className="font-label-md text-label-md text-on-surface font-bold">Signal Health</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{signalHealth ? 'Nominal Interlock' : 'Fault Detected'}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  checked={signalHealth} 
                  onChange={(e) => setSignalHealth(e.target.checked)}
                  className="sr-only peer" 
                  type="checkbox"
                />
                <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
          
          <div className="mt-auto">
            <button 
              onClick={handlePredict}
              disabled={isLoading}
              className="w-full bg-on-background text-on-primary py-4 rounded-xl font-label-md text-label-md tracking-wider uppercase flex items-center justify-center gap-3 hover:bg-secondary transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Calculating...' : 'Recalculate Predictions'}
              <span className={`material-symbols-outlined ${isLoading ? 'animate-spin' : ''}`} data-icon="refresh">refresh</span>
            </button>
          </div>
        </section>
        
        {/* Right Panel: Results & Analytics */}
        <section className="flex-grow p-gutter overflow-y-auto bg-background">
          <div className="max-w-container-max mx-auto space-y-6">
            {/* Top Result Card Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Prominent Result Card */}
              <div className="lg:col-span-2 bg-white p-8 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between min-h-[280px] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <span className="material-symbols-outlined text-[120px]" data-icon="schedule">schedule</span>
                </div>
                <div>
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded text-xs font-bold tracking-widest uppercase mb-4 inline-block">Analysis Complete</span>
                  <h2 className="font-label-md text-label-md text-on-surface-variant mb-2">Estimated Delay Arrival</h2>
                  <p className="font-headline-lg text-[64px] leading-tight text-primary font-bold">{delayMin} <span className="text-headline-md font-medium">min</span></p>
                </div>
                <div className="flex items-center gap-4 mt-6">
                  {fogDensity > 50 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-[#1A56A0] text-white rounded font-label-md text-label-md uppercase tracking-tight">
                      <span className="material-symbols-outlined text-sm" data-icon="foggy">foggy</span>
                      FOG
                    </div>
                  )}
                  {!signalHealth && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-[#0F3460] text-white rounded font-label-md text-label-md uppercase tracking-tight">
                      <span className="material-symbols-outlined text-sm" data-icon="error">error</span>
                      SIGNAL FAULT
                    </div>
                  )}
                </div>
              </div>
              
              {/* Confidence Meter Card */}
              <div className="bg-white p-8 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-center items-center text-center">
                <div className="relative w-40 h-40 mb-6">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle className="text-surface-container" cx="80" cy="80" fill="transparent" r="70" stroke="currentColor" strokeWidth="12"></circle>
                    <circle 
                      className="text-primary transition-all duration-1000" 
                      cx="80" cy="80" fill="transparent" r="70" 
                      stroke="currentColor" 
                      strokeDasharray="440" 
                      strokeDashoffset={440 - (440 * confidence) / 100} 
                      strokeWidth="12"
                    ></circle>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-headline-lg font-bold text-on-surface">{confidence}%</span>
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest">Confidence</span>
                  </div>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  ML-Model <span className="font-bold">NeuralTrack v4.2</span> suggests high correlation between local conditions and latency.
                </p>
              </div>
            </div>
            
            {/* Cascade Impact Table */}
            <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Cascade Impact Forecast</h3>
                <button className="text-primary font-label-md text-label-md flex items-center gap-2 hover:underline">
                  <span className="material-symbols-outlined" data-icon="download">download</span>
                  Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-on-background text-on-primary">
                      <th className="px-6 py-4 font-label-md text-label-md">Train Number</th>
                      <th className="px-6 py-4 font-label-md text-label-md">Scheduled Arrival</th>
                      <th className="px-6 py-4 font-label-md text-label-md text-center">Projected Delay</th>
                      <th className="px-6 py-4 font-label-md text-label-md">Impact Level</th>
                      <th className="px-6 py-4 font-label-md text-label-md">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    <tr className="hover:bg-tertiary/5 transition-colors">
                      <td className="px-6 py-4 font-label-md text-label-md text-primary font-bold">{trainId} (Primary)</td>
                      <td className="px-6 py-4 font-body-sm text-body-sm">14:30 GMT</td>
                      <td className="px-6 py-4 font-headline-sm text-headline-sm text-center text-error">+{delayMin}m</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${delayMin > 30 ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container'}`}>
                          {delayMin > 30 ? 'Critical' : 'Moderate'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-error animate-pulse"></div>
                          <span className="text-body-sm font-medium">In Transit</span>
                        </div>
                      </td>
                    </tr>
                    <tr className="bg-tertiary/5 hover:bg-tertiary/10 transition-colors">
                      <td className="px-6 py-4 font-label-md text-label-md text-on-surface">RS-112 Local</td>
                      <td className="px-6 py-4 font-body-sm text-body-sm">14:45 GMT</td>
                      <td className="px-6 py-4 font-headline-sm text-headline-sm text-center text-secondary">+{Math.floor(delayMin * 0.25)}m</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase">Moderate</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-secondary"></div>
                          <span className="text-body-sm">Departing</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Atmospheric Detail / Map Preview */}
            <div className="h-48 relative rounded-xl overflow-hidden group mt-6">
              <img className="w-full h-full object-cover grayscale brightness-50 group-hover:scale-105 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCLV-XDcoxIHWIx935YnXUlSmLdr0IGvIXxirkdsVTF83_DCBfZilhzY1b8CJ23P0vWqDhdnOSEJJ0KUQgbO0Yt7YR3aXe_1vbeeKcbWntTSz-0u_QKntW8TdcBwfomtgwAe6UoFgmE7Z2rkegZtBAUw3EBUm-IxMog9xZ49aaAettOIJqL8auZQUnvE9h1FD4fjVnzCQrLBYKkMwfkFzZL0V-HCX9DKpANZ2gsOQjWEhBLFvvguXjm0c6zKF-HSpFxLLVtzGPr-Zvw"/>
              <div className="absolute inset-0 bg-gradient-to-t from-on-background via-transparent to-transparent"></div>
              <div className="absolute bottom-4 left-6">
                <h4 className="text-on-primary font-headline-sm text-headline-sm">Zone: North Corridor Delta</h4>
                <p className="text-on-primary-container text-body-sm">Real-time network traffic visualization</p>
              </div>
              <div className="absolute top-4 right-6 flex gap-2">
                <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded text-[10px] text-on-primary font-bold border border-white/20">LIVE DATA FEED</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
