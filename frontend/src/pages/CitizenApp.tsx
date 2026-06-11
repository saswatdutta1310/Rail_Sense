import { useState } from 'react';
import { apiCall } from '../api/client';

export default function CitizenApp() {
  const [trainQuery, setTrainQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  const [phone, setPhone] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribeStatus, setSubscribeStatus] = useState<string | null>(null);

  const handleSearch = () => {
    if (!trainQuery.trim()) return;
    setIsSearching(true);
    // Simulate network delay for search
    setTimeout(() => {
      setIsSearching(false);
      setHasSearched(true);
    }, 1200);
  };

  const handleSubscribe = async () => {
    const cleanPhone = phone.replace('+91', '').replace(/\s/g, '').trim();
    if (cleanPhone.length !== 10) {
      setSubscribeStatus('Error: Please enter a valid 10-digit mobile number.');
      return;
    }
    
    setIsSubscribing(true);
    setSubscribeStatus(null);
    try {
      const response = await fetch('http://localhost:8000/api/sms/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          country_code: '+91'
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setSubscribeStatus(`Success: ${data.message}`);
        setPhone('');
      } else {
        setSubscribeStatus(`Error: ${data.message || 'Subscription failed. Please try again.'}`);
      }
    } catch (err) {
      setSubscribeStatus("Error: Failed to subscribe to alerts. Network error.");
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <div className="w-full">
      <main className="flex-grow flex flex-col">
        {/* Hero Section */}
        <section className="relative py-24 px-margin-desktop overflow-hidden bg-on-surface">
          <div className="absolute inset-0 opacity-10">
            <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent"></div>
          </div>
          <div className="max-w-4xl mx-auto relative z-10 text-center">
            <h1 className="font-headline-lg text-headline-lg text-surface-bright mb-6">Real-time Railway Intelligence</h1>
            <p className="font-body-lg text-body-lg text-surface-container-high mb-12 opacity-80">Track live train movements with predictive AI analysis and platform updates.</p>
            {/* Search Bar Container */}
            <div className="relative max-w-2xl mx-auto">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-outline" data-icon="search">search</span>
              </div>
              <input 
                className="w-full pl-14 pr-32 py-5 rounded-full border-none ring-1 ring-outline-variant focus:ring-2 focus:ring-primary-fixed-dim bg-surface-container-lowest text-on-surface font-body-md shadow-2xl transition-all" 
                placeholder="Enter Train Number or Name" 
                type="text"
                value={trainQuery}
                onChange={(e) => setTrainQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button 
                onClick={handleSearch}
                disabled={isSearching}
                className="absolute right-3 inset-y-3 px-8 bg-primary-container text-on-primary-container rounded-full font-label-md text-label-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
            <div className="mt-8 flex justify-center gap-4">
              <span className="text-label-sm font-label-sm text-surface-container-high opacity-60 uppercase tracking-widest">Recent Searches:</span>
              <a className="text-label-sm font-label-sm text-primary-fixed-dim hover:underline" href="#" onClick={(e) => { e.preventDefault(); setTrainQuery("12301"); handleSearch(); }}>12301 - Rajdhani</a>
              <a className="text-label-sm font-label-sm text-primary-fixed-dim hover:underline" href="#" onClick={(e) => { e.preventDefault(); setTrainQuery("12841"); handleSearch(); }}>12841 - Coromandel</a>
            </div>
          </div>
        </section>
        
        {/* Result Section */}
        <section className={`py-16 px-margin-desktop bg-background transition-opacity duration-500 ${hasSearched ? 'opacity-100' : 'opacity-0 pointer-events-none hidden'}`}>
          <div className="max-w-container-max mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Search Result</h2>
              <div className="flex items-center gap-2 text-label-md font-label-md text-outline">
                <span className="material-symbols-outlined text-sm" data-icon="update">update</span>
                Last updated: Just now
              </div>
            </div>
            {/* High Fidelity Status Card */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-outline-variant bg-surface-bright/50">
                <div className="flex flex-col">
                  <span className="text-primary font-label-sm font-label-sm uppercase tracking-widest mb-1">Express Train</span>
                  <h3 className="font-headline-md text-headline-md text-on-surface">{trainQuery || "12301"} - Express</h3>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="px-3 py-1 bg-surface-container-high rounded-lg font-label-md text-label-md text-on-surface flex items-center gap-1">
                      <span className="material-symbols-outlined text-lg" data-icon="train">train</span>
                      Howrah JN (HWH)
                    </span>
                    <span className="material-symbols-outlined text-outline" data-icon="arrow_forward">arrow_forward</span>
                    <span className="px-3 py-1 bg-surface-container-high rounded-lg font-label-md text-label-md text-on-surface flex items-center gap-1">
                      <span className="material-symbols-outlined text-lg" data-icon="location_on">location_on</span>
                      New Delhi (NDLS)
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-start md:items-end gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 bg-error-container text-on-error-container rounded-lg font-headline-sm text-headline-sm">
                    <span className="material-symbols-outlined" data-icon="warning">warning</span>
                    15 min delay predicted
                  </div>
                  <p className="font-body-sm text-body-sm text-outline">AI analysis suggests clearing traffic at Mughal Sarai</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-outline-variant">
                {/* Platform Information */}
                <div className="p-8 flex items-center gap-6">
                  <div className="w-14 h-14 bg-surface-container-high rounded-full flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-3xl" data-icon="deck">deck</span>
                  </div>
                  <div>
                    <p className="font-label-sm text-label-sm text-outline uppercase tracking-wider mb-1">Assigned Platform</p>
                    <p className="font-headline-sm text-headline-sm text-on-surface">Platform 4</p>
                  </div>
                </div>
                {/* Current Status */}
                <div className="p-8 flex items-center gap-6">
                  <div className="w-14 h-14 bg-secondary-container rounded-full flex items-center justify-center text-on-secondary-container">
                    <span className="material-symbols-outlined text-3xl" data-icon="my_location">my_location</span>
                  </div>
                  <div>
                    <p className="font-label-sm text-label-sm text-outline uppercase tracking-wider mb-1">Current Status</p>
                    <p className="font-headline-sm text-headline-sm text-on-secondary-container flex items-center gap-2">
                      In Transit
                      <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary"></span>
                      </span>
                    </p>
                  </div>
                </div>
                {/* Journey Progress */}
                <div className="p-8 flex items-center gap-6">
                  <div className="w-14 h-14 bg-tertiary-fixed rounded-full flex items-center justify-center text-on-tertiary-fixed">
                    <span className="material-symbols-outlined text-3xl" data-icon="speed">speed</span>
                  </div>
                  <div>
                    <p className="font-label-sm text-label-sm text-outline uppercase tracking-wider mb-1">Average Speed</p>
                    <p className="font-headline-sm text-headline-sm text-on-surface">115 km/h</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Subscription Container */}
        <section className="py-16 px-margin-desktop bg-surface-container-low border-t border-outline-variant">
          <div className="max-w-4xl mx-auto">
            <div className="bg-surface-container-lowest rounded-2xl p-10 shadow-xl flex flex-col md:flex-row items-center gap-12 relative overflow-hidden">
              {/* Subtle background decoration */}
              <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
              <div className="flex-1">
                <h2 className="font-headline-md text-headline-md text-on-surface mb-3">Stay Updated</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">Get instant delay predictions and platform changes sent directly to your phone. Never miss a connection with RailSense AI SMS alerts.</p>
              </div>
              <div className="flex-1 w-full space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="font-label-md text-label-md text-on-surface">Phone Number</label>
                  <div className="flex gap-2">
                    <div className="bg-surface-container-high px-4 py-3 rounded-lg flex items-center font-label-md text-on-surface">
                      +91
                    </div>
                    <input 
                      className="flex-grow px-4 py-3 bg-surface-container-low border border-outline-variant rounded-lg font-body-md text-on-surface focus:ring-2 focus:ring-primary focus:outline-none" 
                      placeholder="Enter mobile number" 
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
                {subscribeStatus && (
                  <p className={`font-label-sm text-label-sm ${subscribeStatus.startsWith('Error') || subscribeStatus.startsWith('Failed') ? 'text-error' : 'text-primary'}`}>
                    {subscribeStatus}
                  </p>
                )}
                <button 
                  onClick={handleSubscribe}
                  disabled={isSubscribing || phone.length < 10}
                  className="w-full py-4 bg-primary-container text-on-primary-container hover:brightness-110 active:scale-[0.98] transition-all font-label-md text-label-md rounded-lg shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined" data-icon="sms">sms</span>
                  {isSubscribing ? 'Subscribing...' : 'Subscribe to SMS Alerts'}
                </button>
                <p className="text-center font-label-sm text-label-sm text-outline">Standard messaging rates may apply.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
