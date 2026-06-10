import { Link } from 'react-router-dom';
import { User, Train } from 'lucide-react';

export default function TopNav() {
  return (
    <nav className="h-16 bg-navy text-white flex items-center justify-between px-6 shadow-md fixed w-full z-30">
      <div className="flex items-center space-x-3">
        <Train className="w-8 h-8 text-primary-fixed" />
        <Link to="/" className="text-xl font-bold tracking-wide">
          RailSense <span className="text-primary-fixed">AI</span>
        </Link>
      </div>
      <div className="flex items-center space-x-4">
        <button className="flex items-center space-x-2 bg-primary hover:bg-primary-container px-4 py-2 rounded-md transition-colors text-sm font-semibold text-white">
          <User className="w-4 h-4" />
          <span>Admin Login</span>
        </button>
      </div>
    </nav>
  );
}
