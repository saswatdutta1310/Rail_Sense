import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  label: string;
  href: string;
  icon: string;
  desc: string;
}

const SEARCH_INDEX: SearchResult[] = [
  { label: 'Dashboard', href: '/', icon: 'dashboard', desc: 'Home & overview' },
  { label: 'Delay Predictor', href: '/delay', icon: 'schedule', desc: 'XGBoost delay forecasting' },
  { label: 'Platform Guard', href: '/platform', icon: 'security', desc: 'YOLOv5 crowd & fall detection' },
  { label: 'Track Inspector', href: '/track', icon: 'engineering', desc: 'Gemini AI defect detection' },
  { label: 'Impact Dashboard', href: '/impact', icon: 'bar_chart', desc: 'KPIs & audit reports' },
  { label: 'Citizen App', href: '/citizen', icon: 'smartphone', desc: 'SMS alerts & train tracking' },
];

const NOTIFICATIONS = [
  { id: 1, title: 'Alert: Train 12627 delayed 47min', time: '2m ago', icon: 'schedule', color: 'text-red-500' },
  { id: 2, title: 'Platform Guard: CAM-02 anomaly', time: '8m ago', icon: 'videocam', color: 'text-amber-600' },
  { id: 3, title: 'Track defect flagged at KM 142.5', time: '15m ago', icon: 'engineering', color: 'text-orange-500' },
  { id: 4, title: 'System health: All systems nominal', time: '1h ago', icon: 'verified', color: 'text-green-600' },
];

interface TopNavProps {
  onMenuClick?: () => void;
}

export default function TopNav({ onMenuClick }: TopNavProps) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unread, setUnread] = useState(3);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const filtered = query.trim()
    ? SEARCH_INDEX.filter(
        r =>
          r.label.toLowerCase().includes(query.toLowerCase()) ||
          r.desc.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (href: string) => {
    navigate(href);
    setQuery('');
    setShowResults(false);
  };

  const handleNotifOpen = () => {
    setShowNotifs(v => !v);
    setUnread(0);
  };

  return (
    <header className="fixed top-0 right-0 w-full lg:w-[calc(100%-260px)] h-[60px] bg-white border-b border-gray-100 flex justify-between items-center px-4 lg:px-6 z-40">
      {/* Search */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>
        <div className="relative" ref={searchRef}>
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
        <input
          className="pl-10 pr-4 py-2 bg-[#FAF8F4] border border-gray-200 rounded-lg text-sm w-48 md:w-72 focus:ring-2 focus:ring-orange-200 focus:border-[#F97316] outline-none transition-all"
          placeholder="Search modules, trains, stations…"
          value={query}
          onChange={e => { setQuery(e.target.value); setShowResults(true); }}
          onFocus={() => setShowResults(true)}
        />
        {showResults && filtered.length > 0 && (
          <div className="absolute top-full left-0 mt-1 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
            {filtered.map(r => (
              <button
                key={r.href}
                onClick={() => handleSelect(r.href)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FFF7ED] transition-colors text-left"
              >
                <div className="w-8 h-8 bg-[#FFF7ED] rounded-lg flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#F97316] text-[16px]">{r.icon}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{r.label}</p>
                  <p className="text-xs text-gray-400">{r.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        </div>{/* end search relative */}
      </div>{/* end left flex */}

      {/* Right actions */}
      <div className="flex items-center gap-4">

        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3 py-1">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-xs font-semibold text-green-700">Live</span>
        </div>

        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleNotifOpen}
            className="relative w-9 h-9 rounded-full bg-[#FFF7ED] border border-[#FED7AA] flex items-center justify-center text-[#F97316] hover:bg-[#F97316] hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">notifications</span>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                {unread}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                <h4 className="font-bold text-sm text-gray-900">Notifications</h4>
                <button
                  onClick={() => setShowNotifs(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              {NOTIFICATIONS.map(n => (
                <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-[#FFF7ED] transition-colors border-b border-gray-50 last:border-0 cursor-pointer">
                  <div className="w-8 h-8 bg-[#FFF7ED] rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <span className={`material-symbols-outlined text-[16px] ${n.color}`}>{n.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 leading-snug">{n.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{n.time}</p>
                  </div>
                </div>
              ))}
              <div className="px-4 py-2 bg-gray-50 text-center">
                <button className="text-xs font-bold text-[#F97316] hover:underline">View all alerts</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
