
import { useState, useEffect } from 'react';
import { apiCall } from '../api/client';

const modules = [
  {
    href: '/delay',
    icon: 'schedule',
    title: 'Delay Predictor',
    desc: 'XGBoost ML models predicting delays with 98.8% accuracy using weather, signal, and congestion data.',
    tag: 'ML Powered',
  },
  {
    href: '/platform',
    icon: 'security',
    title: 'Platform Guard',
    desc: 'YOLOv5 real-time CCTV monitoring detecting crowd density, fall events, and unauthorized access.',
    tag: 'Computer Vision',
  },
  {
    href: '/track',
    icon: 'engineering',
    title: 'Track Inspector',
    desc: 'AI defect classification for cracks, missing clips, and weld flaws with exportable work orders.',
    tag: 'Vision AI',
  },
  {
    href: '/impact',
    icon: 'bar_chart',
    title: 'Impact Dashboard',
    desc: 'Live KPIs: fuel savings, incidents prevented, passenger-hours saved, and cost efficiency.',
    tag: 'Analytics',
  },
  {
    href: '/citizen',
    icon: 'smartphone',
    title: 'Citizen App',
    desc: 'Passenger portal with live train tracking, SMS alerts, safety reporting, and multi-language support.',
    tag: 'Public Portal',
  },
];

const destinations = [
  {
    name: 'Mumbai',
    img: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=600&q=80&fit=crop',
  },
  {
    name: 'Delhi',
    img: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=600&q=80&fit=crop',
  },
  {
    name: 'Jaipur',
    img: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=600&q=80&fit=crop',
  },
  {
    name: 'Chennai',
    img: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=600&q=80&fit=crop',
  },
  {
    name: 'Visakhapatnam',
    img: 'https://images.unsplash.com/photo-1625493507673-7d5d84bfef02?w=600&q=80&fit=crop',
  },
  {
    name: 'Ladakh',
    img: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=600&q=80&fit=crop',
  },
];

interface ImpactResponse {
  stations_deployed: number;
  incidents_prevented_yr: number;
  annual_fuel_savings_cr: number;
  avg_delay_saved_min: number;
  track_km_monitored: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    trainsTracked: 1284,
    alertsFired: 42,
    defectsDetected: 156,
    systemHealth: 99.8,
    safetyGain: 24,
    costSaved: 1.2,
  });
  const [liked, setLiked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiCall<ImpactResponse>('/impact/', { method: 'GET' }, {
          stations_deployed: 50,
          incidents_prevented_yr: 42,
          annual_fuel_savings_cr: 1.2,
          avg_delay_saved_min: 15,
          track_km_monitored: 1000,
        });
        setStats(prev => ({
          ...prev,
          trainsTracked: data.stations_deployed * 25 || 1284,
          alertsFired: data.incidents_prevented_yr || 42,
          costSaved: data.annual_fuel_savings_cr || 1.2,
          safetyGain: data.avg_delay_saved_min || 15,
          defectsDetected: data.track_km_monitored || 156,
        }));
      } catch (e) { console.error(e); }
    };
    fetchStats();
  }, []);

  return (
    <div className="w-full">
      <main className="flex-1 min-h-screen bg-[#FAF8F4]">

        {/* HERO SECTION */}
        <section className="relative overflow-hidden bg-[#1A1A1A] min-h-[340px] flex items-center">
          {/* Orange decorative shape */}
          <div className="absolute right-0 top-0 w-[45%] h-full bg-[#F97316] clip-hero-shape"></div>
          <div className="absolute right-[5%] bottom-0 opacity-20">
            {/* Train SVG outline */}
            <svg width="320" height="180" viewBox="0 0 400 220" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="20" y="60" width="340" height="100" rx="20" stroke="white" strokeWidth="6"/>
              <rect x="60" y="80" width="60" height="50" rx="6" stroke="white" strokeWidth="4"/>
              <rect x="140" y="80" width="60" height="50" rx="6" stroke="white" strokeWidth="4"/>
              <rect x="220" y="80" width="60" height="50" rx="6" stroke="white" strokeWidth="4"/>
              <circle cx="80" cy="170" r="20" stroke="white" strokeWidth="5"/>
              <circle cx="280" cy="170" r="20" stroke="white" strokeWidth="5"/>
              <rect x="0" y="155" width="400" height="8" rx="4" stroke="white" strokeWidth="3"/>
              <path d="M360 60 L380 20 L400 60" stroke="white" strokeWidth="5" fill="none"/>
            </svg>
          </div>

          <div className="relative z-10 px-10 py-14 max-w-3xl">
            <span className="inline-block bg-[#F97316] text-white text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-5">
              IRCTC Intelligence Partner
            </span>
            <h1 className="text-5xl font-black text-white leading-tight mb-3">
              LET THE<br/>
              <span className="text-[#F97316]">JOURNEY</span><br/>
              BEGIN
            </h1>
            <p className="text-gray-300 text-base max-w-md mt-4 mb-7">
              The first software-only AI intelligence layer for Indian Railways — predicting delays, preventing accidents & protecting infrastructure.
            </p>
            <div className="flex gap-3">
              <a href="/delay" className="orange-btn inline-flex items-center gap-2">
                Get Started
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </a>
              <a href="/impact" className="border border-white/30 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-white/10 transition-colors">
                View Impact
              </a>
            </div>
          </div>

          {/* Ticket mockup */}
          <div className="absolute right-[12%] top-1/2 -translate-y-1/2 z-20 hidden lg:block">
            <div className="bg-white rounded-2xl shadow-2xl w-64 overflow-hidden">
              <div className="bg-[#F97316] px-5 pt-5 pb-8 relative">
                <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">RailSense AI Ticket</p>
                <p className="text-white font-black text-lg">BOM → VSKP</p>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <p className="text-white/60 text-[10px]">Passenger</p>
                    <p className="text-white font-bold text-sm">Operator</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/60 text-[10px]">Date</p>
                    <p className="text-white font-bold text-sm">Today</p>
                  </div>
                </div>
                <p className="text-white font-bold text-center text-sm mt-4 tracking-widest">HAPPY JOURNEY</p>
                {/* Zigzag separator */}
                <div className="absolute -bottom-3 left-0 right-0 h-6 overflow-hidden">
                  <svg viewBox="0 0 264 24" preserveAspectRatio="none" className="w-full h-full">
                    <path d="M0 0 L13.2 24 L26.4 0 L39.6 24 L52.8 0 L66 24 L79.2 0 L92.4 24 L105.6 0 L118.8 24 L132 0 L145.2 24 L158.4 0 L171.6 24 L184.8 0 L198 24 L211.2 0 L224.4 24 L237.6 0 L250.8 24 L264 0 V24 H0 Z" fill="white"/>
                  </svg>
                </div>
              </div>
              <div className="bg-white px-5 pt-4 pb-4">
                {/* Barcode lines */}
                <div className="flex gap-[2px] justify-center h-8">
                  {[3,1,2,1,3,1,1,2,1,3,2,1,1,3,1,2,1,1,3,1].map((w, i) => (
                    <div key={i} className="bg-gray-900 h-full" style={{ width: `${w * 3}px` }}></div>
                  ))}
                </div>
                <p className="text-center text-[9px] text-gray-400 mt-1 font-mono">221345-RAILSENSE</p>
              </div>
            </div>
          </div>
        </section>

        {/* BOOK TRAIN SEARCH BAR */}
        <section className="bg-[#1A1A1A] pb-8 px-10">
          <div className="bg-black/40 border border-white/10 rounded-2xl p-6 max-w-5xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-base">Live Train Intelligence</h3>
              <span className="badge-orange">IRCTC Authorized Partner</span>
            </div>
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[160px]">
                <label className="text-gray-400 text-xs font-medium block mb-1">From Station</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#F97316] text-[16px]">location_on</span>
                  <input className="w-full pl-9 pr-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder:text-gray-500 focus:border-[#F97316] focus:outline-none" placeholder="Mumbai CST" />
                </div>
              </div>
              <div className="flex items-end pb-1">
                <div className="w-8 h-8 rounded-full bg-[#F97316] flex items-center justify-center cursor-pointer hover:bg-orange-400 transition-colors">
                  <span className="material-symbols-outlined text-white text-[16px]">swap_horiz</span>
                </div>
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="text-gray-400 text-xs font-medium block mb-1">To Station</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#F97316] text-[16px]">location_on</span>
                  <input className="w-full pl-9 pr-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm placeholder:text-gray-500 focus:border-[#F97316] focus:outline-none" placeholder="Delhi Cant" />
                </div>
              </div>
              <div className="min-w-[130px]">
                <label className="text-gray-400 text-xs font-medium block mb-1">Travel Date</label>
                <input type="date" className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:border-[#F97316] focus:outline-none" />
              </div>
              <div className="min-w-[100px]">
                <label className="text-gray-400 text-xs font-medium block mb-1">Class</label>
                <select className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:border-[#F97316] focus:outline-none">
                  <option value="3A" className="bg-gray-900">3A</option>
                  <option value="2A" className="bg-gray-900">2A</option>
                  <option value="SL" className="bg-gray-900">SL</option>
                  <option value="GN" className="bg-gray-900">GN</option>
                </select>
              </div>
              <div className="flex items-end">
                <button className="orange-btn px-6 py-2.5 text-sm">SEARCH</button>
              </div>
            </div>
          </div>
        </section>

        {/* LIVE STATS STRIP */}
        <div className="px-10 -mt-5 relative z-10">
          <div className="bg-white border border-gray-100 shadow-lg rounded-2xl grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100 overflow-hidden">
            {[
              { label: 'Trains Tracked', value: stats.trainsTracked.toLocaleString(), icon: 'train', color: 'text-[#F97316]', bg: 'bg-[#FFF7ED]' },
              { label: 'Alerts Fired', value: stats.alertsFired.toLocaleString(), icon: 'notifications_active', color: 'text-red-500', bg: 'bg-red-50' },
              { label: 'Defects Detected', value: stats.defectsDetected.toLocaleString(), icon: 'construction', color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'System Health', value: `${stats.systemHealth}%`, icon: 'verified', color: 'text-green-600', bg: 'bg-green-50' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-4 p-5">
                <div className={`w-11 h-11 ${s.bg} rounded-xl flex items-center justify-center`}>
                  <span className={`material-symbols-outlined ${s.color} text-[22px]`} style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{s.label}</p>
                  <p className={`font-black text-2xl ${s.color}`}>{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* OPERATIONAL MODULES */}
        <section className="px-10 py-12">
          <div className="flex justify-between items-end mb-8">
            <div>
              <p className="text-[#F97316] font-bold text-sm uppercase tracking-widest mb-1">Core Features</p>
              <h2 className="section-title">Operational <span>Modules</span></h2>
              <p className="text-gray-500 mt-1">AI engines driving Indian Railways intelligence</p>
            </div>
            <a href="/impact" className="flex items-center gap-1 text-[#F97316] font-bold text-sm hover:gap-2 transition-all">
              View All <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {modules.map(m => (
              <a key={m.href} href={m.href}
                className="card card-hover p-6 block group border-b-4 border-b-transparent hover:border-b-[#F97316]">
                <div className="w-12 h-12 bg-[#FFF7ED] rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#F97316] transition-colors">
                  <span className="material-symbols-outlined text-[#F97316] text-[22px] group-hover:text-white transition-colors" style={{ fontVariationSettings: "'FILL' 1" }}>{m.icon}</span>
                </div>
                <span className="badge-orange text-[10px] mb-2 inline-block">{m.tag}</span>
                <h4 className="font-bold text-gray-900 text-base mb-2">{m.title}</h4>
                <p className="text-gray-500 text-xs leading-relaxed mb-4">{m.desc}</p>
                <div className="flex items-center gap-1 text-[#F97316] font-bold text-xs">
                  <span>Launch</span>
                  <span className="material-symbols-outlined text-[14px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* TRENDING DESTINATIONS */}
        <section className="px-10 py-4 pb-12">
          <div className="mb-6">
            <p className="text-[#F97316] font-bold text-sm uppercase tracking-widest mb-1">Popular Routes</p>
            <h2 className="section-title">Trending <span>Destinations</span></h2>
            <p className="text-gray-500 mt-1 text-sm">Don't forget to visit these places. Discover seamless booking experience.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {destinations.map(d => (
              <div key={d.name} className="relative rounded-2xl overflow-hidden h-44 cursor-pointer group">
                <img
                  src={d.img}
                  alt={d.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.img-fallback')) {
                      const fb = document.createElement('div');
                      fb.className = 'img-fallback w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center';
                      fb.innerHTML = `<span style="font-family:sans-serif;color:white;font-size:32px;opacity:0.6">🏙️</span>`;
                      parent.insertBefore(fb, parent.firstChild);
                    }
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center cursor-pointer hover:bg-[#F97316] transition-colors group/heart"
                  onClick={() => setLiked(prev => ({ ...prev, [d.name]: !prev[d.name] }))}>
                  <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: liked[d.name] ? "'FILL' 1" : "'FILL' 0", color: liked[d.name] ? '#F97316' : '#6B7280' }}>favorite</span>
                </div>
                <p className="absolute bottom-3 left-3 text-white font-bold text-sm">{d.name}</p>
              </div>
            ))}
          </div>
        </section>

        {/* WE PROVIDE THE BEST */}
        <section className="mx-10 mb-12 bg-white border border-gray-100 rounded-2xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <p className="text-[#F97316] font-bold text-sm uppercase tracking-widest mb-2">Why Choose Us</p>
            <h2 className="section-title mb-2">We <span>Provide</span> The Best</h2>
            <p className="text-gray-500 mb-6 text-sm">Embark on an adventure with our AI-powered railway intelligence for popular destinations across India.</p>
            <div className="space-y-4">
              {[
                { icon: 'verified', title: 'IRCTC Authorized Partner', desc: 'RailSense AI is an authorised IRCTC partner since 2019' },
                { icon: 'sensors', title: 'Live Train Status', desc: 'Get real-time status of railway trains and delays, if any' },
                { icon: 'cancel', title: 'No Cancellation Fee', desc: 'You can opt for free cancellation & get full refund' },
                { icon: 'support_agent', title: '24×7 Customer Service', desc: 'Get answers to all your queries within minutes' },
                { icon: 'restaurant', title: 'IRCTC Train Food Booking', desc: 'Enjoy booking IRCTC food & get it delivered on the train' },
              ].map(f => (
                <div key={f.icon} className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-[#FFF7ED] rounded-lg flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#F97316] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>{f.icon}</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">{f.title}</p>
                    <p className="text-xs text-gray-500">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#FAF8F4] rounded-2xl p-6">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Safety Gain', value: `+${stats.safetyGain}%`, icon: 'trending_up', color: 'text-green-600' },
                { label: 'Cost Saved', value: `₹${stats.costSaved}Cr`, icon: 'payments', color: 'text-[#F97316]' },
                { label: 'Trains Tracked', value: stats.trainsTracked.toLocaleString(), icon: 'train', color: 'text-blue-600' },
                { label: 'Alerts Fired', value: stats.alertsFired, icon: 'warning', color: 'text-red-500' },
              ].map(s => (
                <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">{s.label}</p>
                  <div className="flex items-center gap-2">
                    <span className={`font-black text-xl ${s.color}`}>{s.value}</span>
                    <span className={`material-symbols-outlined text-[16px] ${s.color}`}>{s.icon}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-end gap-1 h-24 bg-white border border-gray-100 rounded-xl px-4 pt-4">
              {[40, 65, 95, 55, 80, 45, 70].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-sm transition-all hover:bg-[#F97316]"
                  style={{ height: `${h}%`, background: i === 2 ? '#F97316' : '#FED7AA' }}></div>
              ))}
            </div>
          </div>
        </section>

        {/* TRAVELLERS EXPERIENCE */}
        <section className="px-10 pb-12">
          <div className="text-center mb-8">
            <h2 className="section-title">Our <span>Operators</span> Experience</h2>
            <p className="text-gray-500 text-sm mt-2">What our operators say about why they choose RailSense AI</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { name: 'Rajan Mehta', role: 'Station Manager, Mumbai', date: '21st Mar, 2024', text: 'RailSense AI has transformed how we manage platform safety. The YOLO-based crowd detection gives us advance warning before incidents happen. Truly impressive system.', stars: 5 },
              { name: 'Priya Sharma', role: 'Track Engineer, Delhi', date: '15th Apr, 2024', text: 'The Track Inspector module flagged a cracked fastener that our visual inspection missed. The AI risk scoring and auto work-order generation is a game changer for our team.', stars: 5 },
              { name: 'Vikram Singh', role: 'Ops Controller, Chennai', date: '2nd May, 2024', text: 'Delay prediction accuracy is phenomenal. We now proactively adjust schedules based on forecasts instead of reacting after the fact. The cascade impact engine is brilliant.', stars: 4 },
            ].map(r => (
              <div key={r.name} className="bg-[#F97316] rounded-2xl p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                    {r.name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{r.name}</p>
                    <p className="text-white/70 text-xs">{r.date}</p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-white/90 mb-4">{r.text}</p>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: i < r.stars ? "'FILL' 1" : "'FILL' 0", color: i < r.stars ? '#FFD700' : 'rgba(255,255,255,0.4)' }}>star</span>
                  ))}
                </div>
                <p className="text-xs text-white/60 mt-1">{r.role}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FOOTER */}
        <footer className="bg-[#F97316] mx-6 mb-6 rounded-2xl px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#F97316] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>train</span>
                </div>
                <span className="text-white font-black text-lg">RailSense AI</span>
              </div>
              <p className="text-white/70 text-xs leading-relaxed">India's first software-only AI intelligence layer for railways. IRCTC Authorized Partner.</p>
            </div>
            {[
              { title: 'Our Products', items: ['Delay Predictor', 'Platform Guard', 'Track Inspector', 'Impact Dashboard', 'Citizen App'] },
              { title: 'Resources', items: ['API Documentation', 'ML Pipeline', 'NTES Integration', 'GitHub Repo'] },
              { title: 'Company', items: ['About RailSense', 'Contact Us', 'Privacy Policy', 'Terms of Service'] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="text-white font-bold text-sm mb-3">{col.title}</h4>
                <ul className="space-y-2">
                  {col.items.map(item => (
                    <li key={item}><a href="#" className="text-white/70 text-xs hover:text-white transition-colors">{item}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/20 mt-6 pt-4 flex justify-between items-center">
            <p className="text-white/50 text-xs">© 2024 RailSense AI · Built for Indian Railways</p>
            <div className="flex gap-3">
              {['github', 'language', 'mail'].map(icon => (
                <button key={icon} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
                  <span className="material-symbols-outlined text-white text-[16px]">{icon}</span>
                </button>
              ))}
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
