import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Clock, ShieldAlert, Wrench, Smartphone, BarChart3 } from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Delay Predictor', path: '/delay', icon: Clock },
  { name: 'PlatformGuard', path: '/platform', icon: ShieldAlert },
  { name: 'Track Inspector', path: '/track', icon: Wrench },
  { name: 'CitizenApp', path: '/citizen', icon: Smartphone },
  { name: 'Impact Dashboard', path: '/impact', icon: BarChart3 },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-screen fixed left-0 top-16 pt-6 overflow-y-auto z-10 shadow-sm hidden md:block">
      <nav className="flex flex-col space-y-2 px-4">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors font-medium ${
                isActive
                  ? 'bg-accentBlue text-primary'
                  : 'text-neutralDark hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-slate-400'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
