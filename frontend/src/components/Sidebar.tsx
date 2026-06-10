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
    <>
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-surface-container-lowest border-r border-outline-variant h-screen fixed left-0 top-16 pt-6 overflow-y-auto z-10 shadow-sm hidden md:block">
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
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-on-secondary-container' : 'text-outline'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-surface-container-lowest border-t border-outline-variant flex justify-around items-center h-16 z-40 pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          // Use shortened names for mobile if needed, or rely on text-[10px]
          const shortName = item.name === 'Delay Predictor' ? 'Delay' : 
                            item.name === 'Track Inspector' ? 'Track' : 
                            item.name === 'Impact Dashboard' ? 'Impact' : item.name;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-primary' : 'text-outline hover:text-on-surface-variant'
              }`}
            >
              <div className={`${isActive ? 'bg-primary-container text-on-primary-container px-4 py-0.5 rounded-full' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'text-on-primary-container' : ''}`} />
              </div>
              <span className={`text-[10px] font-medium tracking-wide ${isActive ? 'text-on-surface' : ''}`}>
                {shortName}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
