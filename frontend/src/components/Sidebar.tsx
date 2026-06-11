import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
<aside className="fixed left-0 top-0 h-full w-[280px] bg-secondary dark:bg-on-secondary-fixed border-r border-outline-variant dark:border-outline shadow-sm flex flex-col py-6 z-50">
{/* Brand Identity */}
<div className="px-6 mb-8">
<div className="flex items-center gap-3">
<div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
<span className="material-symbols-outlined text-on-primary" style={{ fontVariationSettings: "'FILL' 1" }}>train</span>
</div>
<div>
<h1 className="font-headline-md text-headline-md font-bold text-on-primary leading-tight">RailSense AI</h1>
<p className="font-label-md text-label-md text-secondary-fixed opacity-70">Intelligence Layer</p>
</div>
</div>
</div>
{/* Navigation Links */}
<nav className="flex-1 space-y-1">
<Link className="flex items-center gap-4 px-6 py-3 border-l-4 border-primary-fixed bg-secondary-fixed-dim/10 text-on-secondary-fixed font-bold hover:bg-secondary-fixed-dim/20 transition-colors duration-150 active:scale-95" to="/">
<span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
<span className="font-label-md text-label-md">Dashboard</span>
</Link>
<Link className="flex items-center gap-4 px-6 py-3 text-secondary-fixed opacity-80 hover:bg-secondary-fixed-dim/20 hover:text-on-secondary-fixed transition-colors duration-150 active:scale-95" to="/delay">
<span className="material-symbols-outlined">schedule</span>
<span className="font-label-md text-label-md">Delay Predictor</span>
</Link>
<Link className="flex items-center gap-4 px-6 py-3 text-secondary-fixed opacity-80 hover:bg-secondary-fixed-dim/20 hover:text-on-secondary-fixed transition-colors duration-150 active:scale-95" to="/platform">
<span className="material-symbols-outlined">security</span>
<span className="font-label-md text-label-md">Platform Guard</span>
</Link>
<Link className="flex items-center gap-4 px-6 py-3 text-secondary-fixed opacity-80 hover:bg-secondary-fixed-dim/20 hover:text-on-secondary-fixed transition-colors duration-150 active:scale-95" to="/track">
<span className="material-symbols-outlined">engineering</span>
<span className="font-label-md text-label-md">Track Inspector</span>
</Link>
<Link className="flex items-center gap-4 px-6 py-3 text-secondary-fixed opacity-80 hover:bg-secondary-fixed-dim/20 hover:text-on-secondary-fixed transition-colors duration-150 active:scale-95" to="/impact">
<span className="material-symbols-outlined">payments</span>
<span className="font-label-md text-label-md">Impact Dashboard</span>
</Link>
<Link className="flex items-center gap-4 px-6 py-3 text-secondary-fixed opacity-80 hover:bg-secondary-fixed-dim/20 hover:text-on-secondary-fixed transition-colors duration-150 active:scale-95" to="/citizen">
<span className="material-symbols-outlined">smartphone</span>
<span className="font-label-md text-label-md">Citizen App</span>
</Link>
</nav>
{/* User Profile */}
<div className="px-6 pt-6 border-t border-outline-variant/20 flex items-center justify-between group">
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
      <span className="material-symbols-outlined text-primary">person</span>
    </div>
    <div className="flex flex-col">
      <span className="font-label-md text-label-md text-on-primary font-bold">
        {user?.full_name || 'Loading...'}
      </span>
      <span className="text-[10px] text-secondary-fixed-dim tracking-wider uppercase">
        {user?.role || 'User'}
      </span>
    </div>
  </div>
  <button 
    onClick={handleLogout}
    className="w-8 h-8 rounded-full hover:bg-error/10 flex items-center justify-center text-on-surface-variant hover:text-error transition-colors"
    title="Logout"
  >
    <span className="material-symbols-outlined text-[20px]">logout</span>
  </button>
</div>
</aside>
  );
}
