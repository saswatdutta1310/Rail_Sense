import { logoBase64 } from '../assets/logoBase64';
import { useState, useEffect } from 'react';
import { apiCall } from '../api/client';

export default function Dashboard() {
  const [stats, setStats] = useState({
    trainsTracked: 1284,
    alertsFired: 42,
    defectsDetected: 156,
    systemHealth: 99.8,
    safetyGain: 24,
    costSaved: 1.2
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiCall<unknown>('/impact/', { method: 'GET' }, {
          stations_deployed: 50,
          incidents_prevented_yr: 42,
          annual_fuel_savings_cr: 1.2,
          avg_delay_saved_min: 15
        });
        setStats(prev => ({
          ...prev,
          trainsTracked: data.stations_deployed * 25 || 1284,
          alertsFired: data.incidents_prevented_yr || 42,
          costSaved: data.annual_fuel_savings_cr || 1.2,
          safetyGain: data.avg_delay_saved_min || 15,
          defectsDetected: data.track_km_monitored || 156
        }));
      } catch (e) {
        console.error(e);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="w-full">
      <main className="ml-[280px] pt-16 min-h-screen">
{/* Hero Banner Section */}
<section className="relative h-[320px] bg-primary overflow-hidden">
{/* Animated Background Placeholder */}

<div className="relative z-10 px-gutter h-full flex flex-col justify-center max-w-5xl">
<img alt="RailSense AI Logo" className="h-12 w-auto mb-6" src={logoBase64}/>
<h2 className="font-headline-lg text-headline-lg text-on-primary max-w-2xl leading-tight">
                    The first software-only intelligence layer for Indian Railways
                </h2>
<p className="font-body-lg text-body-lg text-on-primary-container mt-4 max-w-xl opacity-90">
                    Revolutionizing track maintenance, passenger safety, and operational efficiency through real-time AI computer vision and predictive analytics.
                </p>
<div className="mt-8 flex gap-4">
<button className="bg-surface-container-lowest text-primary px-8 py-3 rounded-lg font-bold hover:shadow-lg transition-all">View Active Fleet</button>
<button className="border border-on-primary/30 text-on-primary px-8 py-3 rounded-lg font-bold hover:bg-white/10 transition-all">Documentation</button>
</div>
</div>
</section>
{/* Live Stats Strip */}
<div className="relative -mt-10 px-gutter">
<div className="bg-white border border-outline-variant shadow-xl rounded-xl flex divide-x divide-outline-variant/30 overflow-hidden">
<div className="flex-1 p-6 flex items-center gap-4">
<div className="w-12 h-12 bg-primary-container/10 rounded-full flex items-center justify-center text-primary">
<span className="material-symbols-outlined text-3xl">train</span>
</div>
<div>
<p className="font-label-sm text-label-sm uppercase text-on-surface-variant">Trains Tracked</p>
<h3 className="font-headline-md text-headline-md text-primary" id="count-trains">{stats.trainsTracked.toLocaleString()}</h3>
</div>
</div>
<div className="flex-1 p-6 flex items-center gap-4">
<div className="w-12 h-12 bg-error-container/10 rounded-full flex items-center justify-center text-error">
<span className="material-symbols-outlined text-3xl stats-pulse">notifications_active</span>
</div>
<div>
<p className="font-label-sm text-label-sm uppercase text-on-surface-variant">Alerts Fired</p>
<h3 className="font-headline-md text-headline-md text-error" id="count-alerts">{stats.alertsFired.toLocaleString()}</h3>
</div>
</div>
<div className="flex-1 p-6 flex items-center gap-4">
<div className="w-12 h-12 bg-secondary-container/10 rounded-full flex items-center justify-center text-secondary">
<span className="material-symbols-outlined text-3xl">construction</span>
</div>
<div>
<p className="font-label-sm text-label-sm uppercase text-on-surface-variant">Defects Detected</p>
<h3 className="font-headline-md text-headline-md text-secondary" id="count-defects">{stats.defectsDetected.toLocaleString()}</h3>
</div>
</div>
<div className="flex-1 p-6 flex items-center gap-4 bg-primary-container/5">
<div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white">
<span className="material-symbols-outlined text-3xl">visibility</span>
</div>
<div>
<p className="font-label-sm text-label-sm uppercase text-on-surface-variant">System Health</p>
<h3 className="font-headline-md text-headline-md text-primary">{stats.systemHealth}%</h3>
</div>
</div>
</div>
</div>
{/* Module Grid */}
<section className="px-gutter py-12">
<div className="flex justify-between items-end mb-8">
<div>
<h3 className="font-headline-md text-headline-md text-on-background">Operational Modules</h3>
<p className="text-on-surface-variant">Core AI engines driving railway intelligence</p>
</div>
<button className="text-primary font-bold flex items-center gap-1 group">
                    View All Modules
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
</button>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
{/* Module Card 1 */}
<a href="/delay" className="bg-white border border-outline-variant p-8 rounded-xl shadow-sm hover:shadow-md transition-all group border-b-4 border-b-primary block">
<div className="w-14 h-14 bg-primary/5 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
<span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>speed</span>
</div>
<h4 className="font-headline-sm text-headline-sm mb-3">Delay Predictor</h4>
<p className="text-on-surface-variant body-md leading-relaxed mb-6">
                        Advanced machine learning models analyzing signal timings, weather, and traffic to predict delays with 94% accuracy.
                    </p>
<div className="flex items-center gap-2 text-primary font-bold cursor-pointer">
<span>Launch App</span>
<span className="material-symbols-outlined">launch</span>
</div>
</a>
{/* Module Card 2 */}
<a href="/platform" className="bg-white border border-outline-variant p-8 rounded-xl shadow-sm hover:shadow-md transition-all group border-b-4 border-b-primary block">
<div className="w-14 h-14 bg-primary/5 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
<span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
</div>
<h4 className="font-headline-sm text-headline-sm mb-3">PlatformGuard</h4>
<p className="text-on-surface-variant body-md leading-relaxed mb-6">
                        Real-time computer vision monitoring platform edges and crowded areas to prevent accidents and unauthorized access.
                    </p>
<div className="flex items-center gap-2 text-primary font-bold cursor-pointer">
<span>Launch App</span>
<span className="material-symbols-outlined">launch</span>
</div>
</a>
{/* Module Card 3 */}
<a href="/track" className="bg-white border border-outline-variant p-8 rounded-xl shadow-sm hover:shadow-md transition-all group border-b-4 border-b-primary block">
<div className="w-14 h-14 bg-primary/5 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
<span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>detector_status</span>
</div>
<h4 className="font-headline-sm text-headline-sm mb-3">Track Inspector</h4>
<p className="text-on-surface-variant body-md leading-relaxed mb-6">
                        Automated high-speed track inspection detecting fractures, missing fasteners, and gauge variations using mounted sensors.
                    </p>
<div className="flex items-center gap-2 text-primary font-bold cursor-pointer">
<span>Launch App</span>
<span className="material-symbols-outlined">launch</span>
</div>
</a>
</div>
</section>
{/* Bottom Grid (Two Column Focus) */}
<section className="px-gutter pb-12">
<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
{/* CitizenApp Preview Card */}
<div className="relative group bg-inverse-surface rounded-2xl overflow-hidden min-h-[400px]">
<div className="absolute inset-0 opacity-40">
<img className="w-full h-full object-cover" data-alt="A futuristic mobile application interface being used on a smartphone at a high-tech Indian railway station at night. The screen displays real-time train arrivals and safety alerts in a clean, primary blue and white interface. The background shows blurred lights of a modern train station with a high-fidelity cinematic look." src="https://lh3.googleusercontent.com/aida-public/AB6AXuApTMerSIKb6o0t9nTYyIUqRLDTGtADEOsdmAjSFIX4TsC1iyEaX-19m6B-z9e1jf23Yk__oBiCpXAv5HE8xpLbCbS_Yo8sPTnnY9JW6DQAuk5pnuhIRwd2EafKAM9A4NQ_PMUAgg_F-llebThtZC4UpLkRbbIt4QHxNmXM2eP00hvxbIOP0dSxFISuIqtnBj0Wg6QlVLX69b_9ehPkA2a33mlQXMpFNNzwD1XDMVtFHlzsqoPmQap80-PSbuXRm9V9FkxVITl43xLu"/>
</div>
<div className="absolute inset-0 bg-gradient-to-t from-inverse-surface via-inverse-surface/60 to-transparent"></div>
<div className="relative z-10 p-10 flex flex-col h-full">
<div className="mb-auto">
<span className="bg-primary px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-widest">Public Outreach</span>
<h4 className="font-headline-lg text-headline-lg text-white mt-4">CitizenApp Connect</h4>
<p className="text-secondary-fixed text-body-lg mt-2 max-w-md">
                                Empowering passengers with direct access to safety reporting, real-time tracking, and station amenities.
                            </p>
</div>
<div className="mt-8">
<a href="/citizen" className="bg-white text-on-background px-8 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-primary-fixed transition-colors inline-flex w-fit">
                                Preview Interface
                                <span className="material-symbols-outlined">arrow_outward</span>
</a>
</div>
</div>
</div>
{/* Impact Dashboard Preview */}
<div className="bg-white border border-outline-variant rounded-2xl overflow-hidden flex flex-col">
<div className="p-8 border-b border-outline-variant/30 flex justify-between items-center">
<div>
<h4 className="font-headline-sm text-headline-sm">Impact Dashboard</h4>
<p className="text-on-surface-variant font-label-md">Monthly performance &amp; safety metrics</p>
</div>
<div className="flex gap-2">
<div className="px-3 py-1 bg-surface-container rounded font-label-sm">July 2024</div>
</div>
</div>
<div className="p-8 flex-1 flex flex-col gap-6">
{/* Simulated Data Viz */}
<div className="flex-1 flex items-end gap-2 h-48 px-4 border-b border-outline-variant/20">
<div className="flex-1 bg-primary/20 hover:bg-primary rounded-t-sm transition-all h-[40%]" title="40%"></div>
<div className="flex-1 bg-primary/20 hover:bg-primary rounded-t-sm transition-all h-[65%]" title="65%"></div>
<div className="flex-1 bg-primary hover:bg-primary/80 rounded-t-sm transition-all h-[95%]" title="95%"></div>
<div className="flex-1 bg-primary/20 hover:bg-primary rounded-t-sm transition-all h-[55%]" title="55%"></div>
<div className="flex-1 bg-primary/20 hover:bg-primary rounded-t-sm transition-all h-[80%]" title="80%"></div>
<div className="flex-1 bg-primary/20 hover:bg-primary rounded-t-sm transition-all h-[45%]" title="45%"></div>
<div className="flex-1 bg-primary/20 hover:bg-primary rounded-t-sm transition-all h-[70%]" title="70%"></div>
</div>
<div className="grid grid-cols-2 gap-4">
<div className="p-4 bg-surface-container-low rounded-xl">
<span className="text-on-surface-variant text-xs font-bold uppercase block mb-1">Safety Gain</span>
<div className="flex items-center gap-2">
<span className="text-headline-sm text-primary">+{stats.safetyGain}%</span>
<span className="material-symbols-outlined text-primary text-sm">trending_up</span>
</div>
</div>
<div className="p-4 bg-surface-container-low rounded-xl">
<span className="text-on-surface-variant text-xs font-bold uppercase block mb-1">Cost Saved</span>
<div className="flex items-center gap-2">
<span className="text-headline-sm text-primary">${stats.costSaved}M</span>
<span className="material-symbols-outlined text-primary text-sm">payments</span>
</div>
</div>
</div>
<a href="/impact" className="w-full py-4 border border-primary text-primary font-bold rounded-lg hover:bg-primary/5 transition-colors text-center block">
                            Generate Full Audit Report
                        </a>
</div>
</div>
</div>
</section>
</main>
    </div>
  );
}
