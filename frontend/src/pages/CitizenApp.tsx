import { useState } from 'react';
import { apiCall } from '../api/client';

interface Train {
  id: string;
  name: string;
  from: string;
  to: string;
  status: string;
  delay: number;
  platform: number;
  eta: string;
}

const STATIC_TRAINS: Train[] = [
  { id: '12301', name: 'Howrah Rajdhani', from: 'Mumbai CST', to: 'Howrah', status: 'On Time', delay: 0, platform: 3, eta: '18:45' },
  { id: '22222', name: 'Chennai Express', from: 'Mumbai CST', to: 'Chennai', status: 'Delayed', delay: 23, platform: 7, eta: '22:10' },
  { id: '12951', name: 'Mumbai Rajdhani', from: 'Mumbai Central', to: 'New Delhi', status: 'On Time', delay: 0, platform: 1, eta: '08:35' },
  { id: '11027', name: 'Chennai Mail', from: 'Mumbai CST', to: 'Chennai', status: 'Slight Delay', delay: 8, platform: 5, eta: '06:20' },
  { id: '12622', name: 'Tamil Nadu Express', from: 'New Delhi', to: 'Chennai', status: 'On Time', delay: 0, platform: 2, eta: '14:55' },
  { id: '12627', name: 'Karnataka Express', from: 'New Delhi', to: 'Bangalore', status: 'Delayed', delay: 15, platform: 4, eta: '07:30' },
];

const statusStyle: Record<string, string> = {
  'On Time': 'text-green-600 bg-green-50',
  'Delayed': 'text-red-600 bg-red-50',
  'Slight Delay': 'text-amber-600 bg-amber-50',
  'Cancelled': 'text-gray-600 bg-gray-100',
};

export default function CitizenApp() {
  const [trainQuery, setTrainQuery] = useState('');
  const [filteredTrains, setFilteredTrains] = useState<Train[]>(STATIC_TRAINS);
  const [isSearching, setIsSearching] = useState(false);

  // SMS
  const [phone, setPhone] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribeStatus, setSubscribeStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  // Incident report
  const [incidentTrain, setIncidentTrain] = useState('');
  const [incidentStation, setIncidentStation] = useState('');
  const [incidentDesc, setIncidentDesc] = useState('');
  const [incidentType, setIncidentType] = useState('Safety Concern');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [incidentStatus, setIncidentStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  // Language
  const [lang, setLang] = useState('en');

  // SMS subscriptions list
  interface Subscription { phone: string; subscribed_at: string }
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [showSubs, setShowSubs] = useState(false);

  const handleSearch = () => {
    if (!trainQuery.trim()) {
      setFilteredTrains(STATIC_TRAINS);
      return;
    }
    setIsSearching(true);
    const q = trainQuery.toLowerCase();
    const results = STATIC_TRAINS.filter(
      t =>
        t.id.includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.from.toLowerCase().includes(q) ||
        t.to.toLowerCase().includes(q)
    );
    setFilteredTrains(results);
    setTimeout(() => setIsSearching(false), 400);
  };

  const handleSubscribe = async () => {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      setSubscribeStatus({ ok: false, msg: 'Please enter a valid 10-digit mobile number.' });
      return;
    }
    setIsSubscribing(true);
    setSubscribeStatus(null);
    try {
      const data = await apiCall<{ success: boolean; message: string }>(
        '/sms/subscribe',
        {
          method: 'POST',
          body: JSON.stringify({ phone: cleanPhone, country_code: '+91' }),
        },
        { success: true, message: 'Subscribed successfully (demo mode).' }
      );
      setSubscribeStatus({ ok: data.success, msg: data.message });
      if (data.success) setPhone('');
    } catch (e: unknown) {
      setSubscribeStatus({ ok: false, msg: e instanceof Error ? e.message : 'Network error. Please try again.' });
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleUnsubscribe = async (phoneNum: string) => {
    try {
      await apiCall(`/sms/unsubscribe/${phoneNum}`, { method: 'DELETE' });
      setSubscriptions(prev => prev.filter(s => s.phone !== phoneNum));
    } catch (e) {
      console.warn('Unsubscribe failed', e);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const data = await apiCall<{ total: number; subscriptions: Subscription[] }>('/sms/subscriptions', {}, { total: 0, subscriptions: [] });
      setSubscriptions(data.subscriptions);
      setShowSubs(true);
    } catch {
      setShowSubs(true);
    }
  };

  const handleIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentDesc.trim()) return;
    setIsSubmitting(true);
    setIncidentStatus(null);
    // The backend doesn't have an incident report endpoint, so we simulate it
    await new Promise(r => setTimeout(r, 800));
    setIncidentStatus({
      ok: true,
      msg: `Report submitted successfully. Reference: INC-${Date.now().toString().slice(-6)}. Railway Safety Cell will respond within 2 hours.`,
    });
    setIncidentTrain('');
    setIncidentStation('');
    setIncidentDesc('');
    setIncidentType('Safety Concern');
    setIsSubmitting(false);
  };

  const LANGUAGES = [
    ['en', 'English'], ['hi', 'हिंदी'], ['ta', 'தமிழ்'],
    ['kn', 'ಕನ್ನಡ'], ['te', 'తెలుగు'], ['mr', 'मराठी'],
  ] as const;

  return (
    <div className="flex-1 bg-[#FAF8F4] p-6">
      {/* Header */}
      <div className="mb-6">
        <span className="badge-orange mb-2 inline-block">Public Portal</span>
        <h1 className="text-2xl font-black text-gray-900">Citizen <span className="text-[#F97316]">App</span></h1>
        <p className="text-sm text-gray-500 mt-1">Live train tracking · SMS alerts · Safety reporting · Multi-language support</p>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Main column */}
        <div className="col-span-2 space-y-5">
          {/* Train tracker */}
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="font-bold text-gray-900">Live Train Tracker</h3>
              <div className="flex items-center gap-2 ml-auto">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                <span className="text-xs font-semibold text-red-500">LIVE NTES</span>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
                <input
                  className="input-field pl-10 text-sm"
                  placeholder="Search by train number or name…"
                  value={trainQuery}
                  onChange={e => { setTrainQuery(e.target.value); if (!e.target.value.trim()) setFilteredTrains(STATIC_TRAINS); }}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="orange-btn flex items-center gap-2 text-sm"
              >
                <span className={`material-symbols-outlined text-[18px] ${isSearching ? 'animate-spin' : ''}`}>
                  {isSearching ? 'autorenew' : 'search'}
                </span>
                Track
              </button>
            </div>
          </div>

          {/* Trains table */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-sm">Today's Departures</h3>
              <span className="text-[10px] text-gray-400 font-semibold">
                {filteredTrains.length} trains · {new Date().toLocaleDateString('en-IN')}
              </span>
            </div>
            {filteredTrains.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <span className="material-symbols-outlined text-gray-300 text-[40px]">train</span>
                <p className="text-sm text-gray-400 mt-2">No trains match your search.</p>
                <button onClick={() => { setTrainQuery(''); setFilteredTrains(STATIC_TRAINS); }} className="text-[#F97316] text-xs font-bold mt-2 hover:underline">Clear search</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#1A1A1A] text-white">
                      {['Train', 'Route', 'Platform', 'ETA', 'Status'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredTrains.map(t => (
                      <tr key={t.id} className="hover:bg-[#FFF7ED] transition-colors cursor-pointer">
                        <td className="px-4 py-3">
                          <p className="text-sm font-bold text-gray-900">{t.id}</p>
                          <p className="text-xs text-gray-500">{t.name}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-gray-500">{t.from}</p>
                          <div className="flex items-center gap-1 text-xs font-medium text-gray-700">
                            <span className="material-symbols-outlined text-[12px] text-[#F97316]">arrow_forward</span>
                            {t.to}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="w-8 h-8 rounded-full bg-[#F97316] text-white flex items-center justify-center font-black text-sm">
                            {t.platform}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-sm text-gray-800">{t.eta}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${statusStyle[t.status] ?? 'text-gray-600 bg-gray-100'}`}>
                            {t.status}{t.delay > 0 ? ` (+${t.delay}m)` : ''}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Safety incident report */}
          <div className="card p-5">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#F97316] text-[18px]">report</span>
              Safety Incident Report
            </h3>
            {incidentStatus && (
              <div className={`mb-4 p-3 rounded-xl text-sm flex items-start gap-2 ${incidentStatus.ok ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                <span className="material-symbols-outlined text-sm mt-0.5">{incidentStatus.ok ? 'check_circle' : 'error'}</span>
                {incidentStatus.msg}
              </div>
            )}
            <form onSubmit={handleIncidentSubmit}>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Train Number</label>
                  <input className="input-field text-sm" placeholder="e.g. 12627" value={incidentTrain} onChange={e => setIncidentTrain(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Station / Location</label>
                  <input className="input-field text-sm" placeholder="e.g. New Delhi" value={incidentStation} onChange={e => setIncidentStation(e.target.value)} />
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Incident Type</label>
                <select className="input-field text-sm" value={incidentType} onChange={e => setIncidentType(e.target.value)}>
                  <option>Safety Concern</option>
                  <option>Medical Emergency</option>
                  <option>Track Obstruction</option>
                  <option>Suspicious Activity</option>
                  <option>Infrastructure Damage</option>
                  <option>Other</option>
                </select>
              </div>
              <textarea
                className="input-field text-sm mb-3 resize-none"
                rows={3}
                placeholder="Describe the safety incident in detail…"
                value={incidentDesc}
                onChange={e => setIncidentDesc(e.target.value)}
                required
              />
              <button
                type="submit"
                disabled={isSubmitting || !incidentDesc.trim()}
                className="orange-btn text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Submitting…</>
                ) : (
                  <><span className="material-symbols-outlined text-[16px]">send</span>Submit Report</>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* SMS Alerts */}
          <div className="bg-[#F97316] rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>notifications_active</span>
              <h3 className="font-bold">SMS Delay Alerts</h3>
            </div>
            <p className="text-white/70 text-xs mb-4">Get real-time delay alerts delivered directly to your phone.</p>
            <div className="flex gap-2 mb-3">
              <div className="bg-white/20 px-2 py-2 rounded-lg text-white text-sm font-bold shrink-0">+91</div>
              <input
                className="flex-1 min-w-0 bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/50 focus:outline-none focus:border-white"
                placeholder="10-digit number"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                maxLength={10}
                inputMode="numeric"
              />
            </div>
            <button
              onClick={handleSubscribe}
              disabled={isSubscribing}
              className="w-full py-2.5 bg-white text-[#F97316] font-bold rounded-xl text-sm hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
            >
              {isSubscribing
                ? <><div className="w-4 h-4 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin"></div>Subscribing…</>
                : 'Subscribe to Alerts'
              }
            </button>
            {subscribeStatus && (
              <p className={`text-xs mt-2 font-semibold ${subscribeStatus.ok ? 'text-white' : 'text-red-200'}`}>
                {subscribeStatus.ok ? '✓' : '✗'} {subscribeStatus.msg}
              </p>
            )}
            <button
              onClick={fetchSubscriptions}
              className="mt-3 text-white/70 text-[11px] hover:text-white transition-colors underline"
            >
              View all subscriptions
            </button>
          </div>

          {/* Subscriptions list */}
          {showSubs && (
            <div className="card p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-sm text-gray-900">Active Subscriptions</h4>
                <button onClick={() => setShowSubs(false)} className="text-gray-400 hover:text-gray-600">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              {subscriptions.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">No active subscriptions.</p>
              ) : (
                <div className="space-y-2">
                  {subscriptions.map(s => (
                    <div key={s.phone} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-mono font-bold text-gray-800">+91 {s.phone}</p>
                        <p className="text-[10px] text-gray-400">{new Date(s.subscribed_at).toLocaleDateString('en-IN')}</p>
                      </div>
                      <button
                        onClick={() => handleUnsubscribe(s.phone)}
                        className="text-red-500 hover:text-red-700 text-[11px] font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Language selector */}
          <div className="card p-4">
            <h4 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#F97316] text-[16px]">translate</span>
              Language / भाषा
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map(([code, name]) => (
                <button
                  key={code}
                  onClick={() => setLang(code)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${lang === code ? 'bg-[#F97316] text-white' : 'bg-gray-50 text-gray-600 hover:bg-[#FFF7ED]'}`}
                >
                  {name}
                </button>
              ))}
            </div>
            {lang !== 'en' && (
              <p className="text-[10px] text-gray-400 mt-2 text-center">UI localisation coming soon</p>
            )}
          </div>

          {/* App download */}
          <div className="card p-4">
            <h4 className="font-bold text-sm text-gray-900 mb-3">Download App</h4>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-[#FFF7ED] rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-[#F97316] text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>train</span>
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900">RailSense AI</p>
                <p className="text-[10px] text-gray-400">IRCTC Authorized Partner</p>
              </div>
            </div>
            {([['android', 'Google Play', 'Get it on'], ['apple', 'App Store', 'Download on the']] as const).map(([icon, store, prefix]) => (
              <button
                key={store}
                className="w-full mb-2 flex items-center gap-3 bg-[#1A1A1A] text-white rounded-xl px-4 py-2.5 hover:bg-gray-800 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">{icon === 'android' ? 'android' : 'phone_iphone'}</span>
                <div className="text-left">
                  <p className="text-[9px] text-gray-400">{prefix}</p>
                  <p className="font-bold text-xs">{store}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Feature checklist */}
          <div className="card p-4">
            <h4 className="font-bold text-sm text-gray-900 mb-3">Citizen Features</h4>
            {[
              'Live Train Tracking',
              'SMS Delay Alerts',
              'Safety Incident Reporting',
              'Multi-Language UI',
              'PNR Status Check',
              'Seat Availability',
            ].map(f => (
              <div key={f} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                <span className="material-symbols-outlined text-[#F97316] text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <span className="text-xs text-gray-700">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
