import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', icon: 'dashboard', label: 'Dashboard' },
  { to: '/delay', icon: 'schedule', label: 'Delay Predictor' },
  { to: '/platform', icon: 'security', label: 'Platform Guard' },
  { to: '/track', icon: 'engineering', label: 'Track Inspector' },
  { to: '/impact', icon: 'bar_chart', label: 'Impact Dashboard' },
  { to: '/citizen', icon: 'smartphone', label: 'Citizen App' },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ open = true, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNav = () => {
    if (onClose) onClose();
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-full w-[260px] bg-white border-r border-gray-100 shadow-sm flex flex-col py-6 z-50
        transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
    >
      {/* Brand */}
      <div className="px-5 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#F97316] rounded-xl flex items-center justify-center shadow-md shrink-0">
            <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>train</span>
          </div>
          <div>
            <h1 className="font-bold text-[17px] text-gray-900 leading-tight">RailSense AI</h1>
            <p className="text-[11px] text-gray-400 font-medium tracking-wide uppercase">Intelligence Layer</p>
          </div>
        </div>
        {/* Close button on mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={handleNav}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* System Status */}
      <div className="mx-3 mb-4 p-3 bg-[#FFF7ED] rounded-xl border border-[#FED7AA]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0"></div>
          <span className="text-xs font-semibold text-gray-600">All Systems Nominal</span>
        </div>
        <p className="text-[10px] text-gray-400 mt-1 ml-4">IRCTC connection active</p>
      </div>

      {/* User Profile */}
      <div className="px-3 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#FFF7ED] border-2 border-[#F97316] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[#F97316] text-[18px]">person</span>
            </div>
            <div className="min-w-0">
              <span className="text-sm font-bold text-gray-900 block truncate">{user?.full_name || 'Operator'}</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">{user?.role || 'Admin'}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors shrink-0"
            title="Logout"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
