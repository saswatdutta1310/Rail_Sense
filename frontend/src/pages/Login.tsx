import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../api/client';

export default function Login() {
  const [email, setEmail] = useState('admin@railsense.ai');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login, token } = useAuth();

  // Already logged in → redirect
  useEffect(() => {
    if (token) navigate('/', { replace: true });
  }, [token, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Invalid email or password');
      }
      const data = await response.json();
      await login(data.access_token);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F4] flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-[#1A1A1A] p-12 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-1/2 h-full bg-[#F97316] opacity-90"></div>
        <div className="absolute bottom-0 right-0 w-full opacity-10">
          <svg viewBox="0 0 400 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <rect x="10" y="40" width="380" height="90" rx="16" stroke="white" strokeWidth="5"/>
            <rect x="40" y="55" width="55" height="45" rx="5" stroke="white" strokeWidth="4"/>
            <rect x="110" y="55" width="55" height="45" rx="5" stroke="white" strokeWidth="4"/>
            <rect x="180" y="55" width="55" height="45" rx="5" stroke="white" strokeWidth="4"/>
            <rect x="250" y="55" width="55" height="45" rx="5" stroke="white" strokeWidth="4"/>
            <circle cx="60" cy="148" r="18" stroke="white" strokeWidth="5"/>
            <circle cx="280" cy="148" r="18" stroke="white" strokeWidth="5"/>
            <rect x="0" y="135" width="400" height="6" rx="3" fill="white"/>
          </svg>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-[#F97316] rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>train</span>
            </div>
            <span className="text-white font-black text-xl">RailSense AI</span>
          </div>
          <h2 className="text-white font-black text-5xl leading-tight mb-4">
            LET THE<br/>
            <span className="text-[#F97316]">JOURNEY</span><br/>
            BEGIN
          </h2>
          <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
            India's first software-only AI intelligence layer for Indian Railways. Predicting delays, preventing accidents &amp; protecting infrastructure.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-3">
          {[
            { label: 'Accuracy', value: '98.8%' },
            { label: 'Trains Tracked', value: '1,284' },
            { label: 'Incidents Prevented', value: '42/yr' },
            { label: 'Cost Saved', value: '₹1.2Cr' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3">
              <p className="text-[#F97316] font-black text-lg">{s.value}</p>
              <p className="text-gray-400 text-xs">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <div className="w-14 h-14 bg-[#F97316] rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-orange-200">
              <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>train</span>
            </div>
            <h1 className="text-3xl font-black text-gray-900 mb-1">Welcome Back</h1>
            <p className="text-gray-500 text-sm">Sign in to RailSense AI Intelligence Layer</p>
          </div>

          {error && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-gray-700 font-semibold text-sm mb-2">Operator Email</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">person</span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input-field pl-11"
                  placeholder="admin@railsense.ai"
                  required
                  autoComplete="email"
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-700 font-semibold text-sm mb-2">Secure Passkey</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">lock</span>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pl-11"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#F97316] text-white font-bold rounded-xl hover:bg-[#EA6C0B] hover:shadow-lg hover:shadow-orange-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-sm"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <><span>Authenticate</span><span className="material-symbols-outlined text-[18px]">login</span></>
              )}
            </button>
          </form>

          <div className="mt-8 p-4 bg-[#FFF7ED] border border-[#FED7AA] rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[#F97316] text-[16px]">info</span>
              <span className="text-sm font-bold text-gray-700">Demo Credentials</span>
            </div>
            <p className="text-xs text-gray-500">Email: <span className="font-mono text-gray-700">admin@railsense.ai</span></p>
            <p className="text-xs text-gray-500">Password: <span className="font-mono text-gray-700">password123</span></p>
          </div>

          <p className="text-center text-gray-400 text-xs mt-6 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-xs">shield</span>
            Secured by Indian Railways Cyber Cell
          </p>
        </div>
      </div>
    </div>
  );
}
