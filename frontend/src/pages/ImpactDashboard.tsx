import { useState, useEffect } from 'react';
import { Settings2, Clock, Droplets, Target, ShieldCheck } from 'lucide-react';

export default function ImpactDashboard() {
  const [stations, setStations] = useState(50);
  const [trackKm, setTrackKm] = useState(1000);
  const [delaySaved, setDelaySaved] = useState(15);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    fetchMetrics();
  }, [stations, trackKm, delaySaved]);

  const fetchMetrics = async () => {
    try {
      const res = await fetch(`/api/impact?stations=${stations}&track_km=${trackKm}&delay_saved=${delaySaved}`);
      if (res.ok) {
        setMetrics(await res.json());
      } else {
        throw new Error('API Error');
      }
    } catch {
      // Mock Fallback
      setMetrics({
        passenger_hours_saved_day: Math.floor((stations * 100 * delaySaved * 50000) / 60),
        annual_fuel_savings_cr: ((100 * delaySaved * 365 * 1000) / 10000000).toFixed(2),
        animal_lives_saved_yr: Math.floor((trackKm / 100) * 2),
        incidents_prevented_yr: Math.floor(stations / 5)
      });
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">
      {/* Left Panel - Controls */}
      <div className="w-full md:w-1/3 bg-surface-container-lowest p-6 rounded-lg shadow-sm border border-outline-variant">
        <div className="flex items-center gap-2 mb-6 text-on-surface">
            <Settings2 className="w-6 h-6" />
            <h2 className="text-xl font-semibold">Scale Projections</h2>
        </div>
        
        <div className="space-y-8">
          <div>
            <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-on-surface-variant">Stations Deployed</label>
                <span className="font-bold text-primary">{stations}</span>
            </div>
            <input 
              type="range" min="1" max="500" 
              value={stations} onChange={(e) => setStations(parseInt(e.target.value))}
              className="w-full accent-primary" 
            />
          </div>

          <div>
             <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-on-surface-variant">Track Monitored (KM)</label>
                <span className="font-bold text-primary">{trackKm}</span>
            </div>
            <input 
              type="range" min="100" max="10000" step="100"
              value={trackKm} onChange={(e) => setTrackKm(parseInt(e.target.value))}
              className="w-full accent-primary" 
            />
          </div>

          <div>
             <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-on-surface-variant">Avg Delay Saved (Min)</label>
                <span className="font-bold text-primary">{delaySaved}</span>
            </div>
            <input 
              type="range" min="1" max="60" 
              value={delaySaved} onChange={(e) => setDelaySaved(parseInt(e.target.value))}
              className="w-full accent-primary" 
            />
          </div>
        </div>
      </div>

      {/* Right Panel - Metrics */}
      <div className="w-full md:w-2/3 space-y-6">
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm border border-outline-variant flex flex-col items-center justify-center text-center">
                <Clock className="w-10 h-10 text-primary mb-3" />
                <h3 className="text-sm font-bold text-outline uppercase tracking-wide mb-2">Passenger Hours Saved</h3>
                <div className="text-4xl font-black text-on-surface">
                    {metrics.passenger_hours_saved_day.toLocaleString()} <span className="text-lg text-outline font-medium">/ day</span>
                </div>
            </div>

            <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm border border-outline-variant flex flex-col items-center justify-center text-center">
                <Droplets className="w-10 h-10 text-success mb-3" />
                <h3 className="text-sm font-bold text-outline uppercase tracking-wide mb-2">Fuel Savings</h3>
                <div className="text-4xl font-black text-on-surface">
                    ₹{metrics.annual_fuel_savings_cr} <span className="text-lg text-outline font-medium">Cr / yr</span>
                </div>
            </div>

            <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm border border-outline-variant flex flex-col items-center justify-center text-center">
                <Target className="w-10 h-10 text-warning mb-3" />
                <h3 className="text-sm font-bold text-outline uppercase tracking-wide mb-2">Animal Lives Saved</h3>
                <div className="text-4xl font-black text-on-surface">
                    {metrics.animal_lives_saved_yr.toLocaleString()} <span className="text-lg text-outline font-medium">/ yr</span>
                </div>
            </div>

            <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm border border-outline-variant flex flex-col items-center justify-center text-center">
                <ShieldCheck className="w-10 h-10 text-primary-fixed mb-3" />
                <h3 className="text-sm font-bold text-outline uppercase tracking-wide mb-2">Incidents Prevented</h3>
                <div className="text-4xl font-black text-on-surface">
                    {metrics.incidents_prevented_yr.toLocaleString()} <span className="text-lg text-outline font-medium">/ yr</span>
                </div>
            </div>
          </div>
        )}

        {/* Comparison Table */}
        <div className="bg-surface-container-lowest p-6 rounded-lg shadow-sm border border-outline-variant">
            <h2 className="text-lg font-semibold text-on-surface mb-4">Architecture Comparison</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="px-4 py-3 text-sm font-semibold text-outline">Feature</th>
                    <th className="px-4 py-3 text-sm font-bold text-primary">RailSense AI</th>
                    <th className="px-4 py-3 text-sm font-semibold text-outline">NTES (CRIS)</th>
                    <th className="px-4 py-3 text-sm font-semibold text-outline">Project Gajraj</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-surface-container-highest">
                    <td className="px-4 py-3 text-sm font-medium">Hardware Required</td>
                    <td className="px-4 py-3 text-sm text-success font-bold">Zero (Software Only)</td>
                    <td className="px-4 py-3 text-sm text-outline">GPS Trackers</td>
                    <td className="px-4 py-3 text-sm text-error">Optical Fiber Cables</td>
                  </tr>
                  <tr className="border-b border-surface-container-highest">
                    <td className="px-4 py-3 text-sm font-medium">Predictive Capabilities</td>
                    <td className="px-4 py-3 text-sm text-success font-bold">Yes (ML-driven)</td>
                    <td className="px-4 py-3 text-sm text-error">No (Reactive)</td>
                    <td className="px-4 py-3 text-sm text-error">No (Reactive)</td>
                  </tr>
                  <tr className="border-b border-surface-container-highest">
                    <td className="px-4 py-3 text-sm font-medium">Citizen Accessible</td>
                    <td className="px-4 py-3 text-sm text-success font-bold">Yes (SMS & Web)</td>
                    <td className="px-4 py-3 text-sm text-success font-bold">Yes</td>
                    <td className="px-4 py-3 text-sm text-error">No</td>
                  </tr>
                </tbody>
              </table>
            </div>
        </div>
      </div>
    </div>
  );
}
