import { useState } from 'react';
import { apiCall } from '../api/client';

export default function PlatformGuard() {
  const [station, setStation] = useState('New Delhi');
  const [platform, setPlatform] = useState('Platform 4');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [density, setDensity] = useState(6.2);
  const [fallDetected, setFallDetected] = useState(false);
  const [personCount, setPersonCount] = useState(1245);
  const [alertLevel, setAlertLevel] = useState('critical');

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      // Create a dummy file for the MVP vision endpoint
      const formData = new FormData();
      const blob = new Blob(["dummy content"], { type: "image/jpeg" });
      formData.append("file", blob, "camera_feed.jpg");

      const response = await apiCall<any>('/vision/platform', {
        method: 'POST',
        body: formData,
      }, {
        // Mock fallback if auth fails
        crowd_density_score: Number((Math.random() * 5 + 3).toFixed(1)),
        alert_level: Math.random() > 0.7 ? 'critical' : 'normal',
        fall_detected: Math.random() > 0.8,
        detections: new Array(Math.floor(Math.random() * 50 + 20)).fill({ label: 'person' })
      });
      
      setDensity(response.crowd_density_score);
      setAlertLevel(response.alert_level);
      setFallDetected(response.fall_detected);
      setPersonCount(response.detections?.length * 45 || Math.floor(Math.random() * 2000 + 500));
      
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="w-full">
      <main className="flex flex-col overflow-hidden h-screen">
        {/* TopNavBar */}
        <header className="w-full h-16 bg-surface border-b border-outline-variant flex justify-between items-center px-margin-desktop z-40">
          <div className="flex items-center gap-6">
            <span className="font-headline-md text-headline-md font-bold text-primary">RailSense AI</span>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-outline">search</span>
              <input className="bg-surface-container-low border-none rounded-full pl-10 pr-4 py-1.5 w-64 text-sm focus:ring-2 focus:ring-primary focus:bg-white transition-all" placeholder="Search infrastructure..." type="text"/>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors cursor-pointer active:opacity-80">
                <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
              </button>
              <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors cursor-pointer active:opacity-80">
                <span className="material-symbols-outlined text-on-surface-variant">settings</span>
              </button>
              <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors cursor-pointer active:opacity-80">
                <span className="material-symbols-outlined text-on-surface-variant">help</span>
              </button>
            </div>
            <div className="w-10 h-10 rounded-full border border-outline-variant p-0.5">
              <img alt="Engineer Profile" className="w-full h-full object-cover rounded-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCV7NDR0O7bDxloLZ4RwVpC3k7MG6XZYIWz0pw88QQn43RU1_6E8B3H_Xm2WEmNqtlpxJX1cwvbCDzeD1ACbqzpvBpAsxb3JyPk5M9UBkB7_ej4tvvyrX9TfYjkuSPyoGyMKTqQQilby_wY35NT1MK8xTZx__l9qpS3V75chZqMvcKzGTlN0Z1GiRfdajGZoCe2u-HlN8Kd3t0lfcp1qUIObl1VhazVMpxsoYdjWrTFCuAiIy9nqCiV7LAGz6wqLrc04wV-Oz9i9o9H"/>
            </div>
          </div>
        </header>
        
        {/* Dashboard Canvas */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-gutter bg-background">
          <div className="max-w-container-max mx-auto">
            <header className="mb-8">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface">PlatformGuard Dashboard</h2>
                  <p className="text-on-surface-variant mt-1">Real-time computer vision monitoring and crowd flow intelligence.</p>
                </div>
                <div className="flex gap-2 bg-surface-container p-1 rounded-lg">
                  <button className="px-4 py-2 bg-white rounded-md shadow-sm font-label-md text-primary">Overview</button>
                  <button className="px-4 py-2 text-on-surface-variant font-label-md hover:text-on-surface">History</button>
                </div>
              </div>
            </header>
            
            <div className="grid grid-cols-12 gap-8">
              {/* Left Panel: Analysis Configuration */}
              <section className="col-span-12 lg:col-span-4 space-y-6">
                <div className="bg-white rounded-xl border border-outline-variant shadow-[0_4px_20px_0_rgba(0,0,0,0.04)] overflow-hidden">
                  <div className="p-4 border-b border-outline-variant bg-surface-container-low">
                    <h3 className="font-headline-sm text-headline-sm text-primary flex items-center gap-2">
                      <span className="material-symbols-outlined">tune</span>
                      Analysis Configuration
                    </h3>
                  </div>
                  <div className="p-6 space-y-6">
                    {/* Drag & Drop Zone */}
                    <div>
                      <label className="block font-label-md text-label-md text-secondary mb-3">Live Video Source</label>
                      <div className="border-2 border-dashed border-outline-variant rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-surface hover:border-primary hover:bg-surface-container-low transition-all group cursor-pointer">
                        <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center group-hover:scale-110 transition-transform">
                          <span className="material-symbols-outlined text-primary text-3xl">upload_file</span>
                        </div>
                        <p className="font-label-md text-label-md text-on-surface">Upload Feed or Drop File</p>
                        <p className="text-xs text-on-surface-variant">MP4, AVI, or Live Stream URL</p>
                      </div>
                    </div>
                    {/* Station Select */}
                    <div>
                      <label className="block font-label-md text-label-md text-secondary mb-2">Select Station</label>
                      <div className="relative">
                        <select 
                          value={station}
                          onChange={(e) => setStation(e.target.value)}
                          className="w-full h-12 bg-surface border border-outline-variant rounded-lg px-4 font-body-md focus:ring-2 focus:ring-primary focus:border-primary outline-none appearance-none cursor-pointer"
                        >
                          <option>Mumbai CST</option>
                          <option>New Delhi</option>
                          <option>Howrah</option>
                          <option>Chennai Central</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-outline">expand_more</span>
                      </div>
                    </div>
                    {/* Platform Number */}
                    <div>
                      <label className="block font-label-md text-label-md text-secondary mb-2">Platform Number</label>
                      <div className="relative">
                        <select 
                          value={platform}
                          onChange={(e) => setPlatform(e.target.value)}
                          className="w-full h-12 bg-surface border border-outline-variant rounded-lg px-4 font-body-md focus:ring-2 focus:ring-primary focus:border-primary outline-none appearance-none cursor-pointer"
                        >
                          <option>Platform 1</option>
                          <option>Platform 4</option>
                          <option>Platform 12</option>
                          <option>Platform 18</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-outline">expand_more</span>
                      </div>
                    </div>
                    <button 
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="w-full bg-primary-container py-4 rounded-xl text-white font-headline-sm flex items-center justify-center gap-3 hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-primary-container/20 disabled:opacity-50"
                    >
                      <span className={`material-symbols-outlined ${isAnalyzing ? 'animate-pulse' : ''}`} style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
                      {isAnalyzing ? 'Analyzing Feed...' : 'Analyze Feed'}
                    </button>
                  </div>
                </div>
                {/* Secondary Context Card */}
                <div className="bg-inverse-surface rounded-xl p-6 text-white overflow-hidden relative">
                  <div className="relative z-10">
                    <h4 className="font-headline-sm text-headline-sm mb-2">Network Load</h4>
                    <p className="text-sm opacity-80 mb-6">Current system utilization across the main intelligence cluster.</p>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm">
                        <span>AI Inference</span>
                        <span className="text-primary-fixed-dim">74%</span>
                      </div>
                      <div className="w-full bg-white/10 h-1.5 rounded-full">
                        <div className="bg-primary-fixed-dim h-full rounded-full" style={{ width: "74%" }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -right-4 -bottom-4 opacity-10">
                    <span className="material-symbols-outlined text-[120px]">hub</span>
                  </div>
                </div>
              </section>
              
              {/* Right Panel: Live Intelligence */}
              <section className="col-span-12 lg:col-span-8 space-y-6">
                <div className="bg-white rounded-xl border border-outline-variant shadow-[0_4px_20px_0_rgba(0,0,0,0.04)] flex flex-col h-full overflow-hidden">
                  <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
                    <h3 className="font-headline-sm text-headline-sm text-primary flex items-center gap-2">
                      <span className="material-symbols-outlined">live_tv</span>
                      Live Platform Analysis
                    </h3>
                    {alertLevel === 'critical' ? (
                      <div className="flex items-center gap-2 bg-error-container text-on-error-container px-3 py-1 rounded-full font-label-md text-xs border border-error/20">
                        <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
                        Red - High Risk
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full font-label-md text-xs border border-green-300">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Nominal Flow
                      </div>
                    )}
                  </div>
                  <div className="p-0 bg-on-background relative group">
                    <img alt="Platform Analysis Feed" className="w-full aspect-video object-cover opacity-90 transition-opacity group-hover:opacity-100" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAgrUQEFw_4Iv83Ekf3TNn2PyUyZndDcWRv4Oz7vpcHvDHQiHKRmxJmWk1zS5DFiTvZQgDwb1FGY5PVG2hEP2akP7iNo-Fu7ulyOSuGFw7OEXuF25WRYBQ6-BA3WtPVl2vP_sZOPgFfIq6QVnm5VLm8QD3HStPDKMFOEjo_-hu5GiqpWlmW2clJP9xzinBD7PDw3UXI1xWMPLF8K8izV36nib-8RWL3wHUbnFC-haz1k3d5zEyeyKEY46FztsHyhwUXEHEL1Mlasnuh"/>
                    {/* HUD Overlay elements */}
                    <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between border-4 border-primary/20">
                      <div className="flex justify-between items-start">
                        <div className="bg-on-background/60 backdrop-blur-md px-3 py-1 rounded border border-white/20 text-white text-xs font-mono uppercase">
                          CAM_04_{station.substring(0, 3)}_{platform.replace(' ', '_')}
                        </div>
                        <div className="bg-on-background/60 backdrop-blur-md px-3 py-1 rounded border border-white/20 text-white text-xs font-mono">
                          FPS: {isAnalyzing ? '22' : '60'} | LATENCY: {isAnalyzing ? '45' : '24'}ms
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="bg-primary/20 backdrop-blur-lg p-3 rounded-lg border border-primary/40 flex items-center gap-3 text-white">
                          <span className="material-symbols-outlined text-primary-fixed-dim">group</span>
                          <div>
                            <div className="text-[10px] uppercase tracking-wider opacity-60">Estimated Headcount</div>
                            <div className="text-xl font-bold">{personCount.toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-gutter">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Stat Card 1 */}
                      <div className={`p-4 rounded-xl border ${density > 6 ? 'border-error/50 bg-error/5' : 'border-outline-variant bg-surface'}`}>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="material-symbols-outlined text-secondary">density_medium</span>
                          <span className="font-label-md text-secondary">Crowd Density</span>
                        </div>
                        <div className="flex items-end gap-2">
                          <span className="text-3xl font-bold text-on-surface">{density.toFixed(1)}</span>
                          <span className="text-sm text-on-surface-variant pb-1">persons/m²</span>
                        </div>
                        {density > 6 ? (
                          <div className="mt-3 flex items-center gap-1 text-xs text-error font-medium">
                            <span className="material-symbols-outlined text-sm">trending_up</span>
                            <span>Above safety threshold</span>
                          </div>
                        ) : (
                          <div className="mt-3 flex items-center gap-1 text-xs text-green-600 font-medium">
                            <span className="material-symbols-outlined text-sm">trending_flat</span>
                            <span>Within normal limits</span>
                          </div>
                        )}
                      </div>
                      {/* Stat Card 2 */}
                      <div className={`p-4 rounded-xl border ${fallDetected ? 'border-error/50 bg-error/5' : 'border-outline-variant bg-surface'}`}>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="material-symbols-outlined text-secondary">personal_injury</span>
                          <span className="font-label-md text-secondary">Safety Events</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-3xl font-bold text-on-surface">{fallDetected ? 'Yes' : 'No'}</span>
                          {fallDetected ? (
                            <div className="w-8 h-8 rounded-full bg-error-container flex items-center justify-center">
                              <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                              <span className="material-symbols-outlined text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            </div>
                          )}
                        </div>
                        <p className="mt-3 text-xs text-on-surface-variant">Fall Detected: {fallDetected ? 'Yes (Platform Edge)' : 'No'}</p>
                      </div>
                      {/* Stat Card 3 */}
                      <div className="p-4 rounded-xl border border-outline-variant bg-surface">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="material-symbols-outlined text-secondary">speed</span>
                          <span className="font-label-md text-secondary">Flow Rate</span>
                        </div>
                        <div className="flex items-end gap-2">
                          <span className="text-3xl font-bold text-on-surface">{Math.floor(60 - density * 2.5)}</span>
                          <span className="text-sm text-on-surface-variant pb-1">px/min</span>
                        </div>
                        <div className="mt-3 flex items-center gap-1 text-xs text-secondary font-medium">
                          <span className="material-symbols-outlined text-sm">info</span>
                          <span>{density > 6 ? 'Restricted through-put' : 'Nominal through-put'}</span>
                        </div>
                      </div>
                    </div>
                    {alertLevel === 'critical' && (
                      <div className="mt-8 p-6 bg-error-container rounded-xl border border-error/20 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center text-error shadow-sm animate-pulse">
                            <span className="material-symbols-outlined">shield_with_heart</span>
                          </div>
                          <div>
                            <h5 className="font-headline-sm text-headline-sm text-on-error-container">Auto-Escalation Triggered</h5>
                            <p className="text-sm text-on-error-container opacity-80">Ground security notified. RPF dispatched to Platform 4.</p>
                          </div>
                        </div>
                        <button className="px-6 py-2 bg-error text-white rounded-lg font-label-md hover:bg-error/90 transition-all shadow-md">
                          Acknowledge
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
