import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
export default function Login() {
  const [email, setEmail] = useState('admin@railsense.ai');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Invalid email or password');
      }

      const data = await response.json();
      await login(data.access_token);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-primary/5 z-0"></div>
      <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full bg-primary/10 blur-[120px] z-0 pointer-events-none"></div>
      <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-secondary/10 blur-[100px] z-0 pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md p-8 bg-white/80 backdrop-blur-xl border border-outline-variant/50 shadow-2xl rounded-3xl">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <span className="material-symbols-outlined text-white text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>train</span>
          </div>
          <h1 className="font-headline-md text-headline-md font-bold text-on-surface">RailSense AI</h1>
          <p className="text-on-surface-variant font-body-md mt-2">Intelligence Layer Authentication</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-error-container/20 border border-error/30 rounded-xl text-error font-label-md flex items-center gap-2">
            <span className="material-symbols-outlined text-error">error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-on-surface font-label-md mb-2">Operator Email</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">person</span>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                placeholder="admin@railsense.ai"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-on-surface font-label-md mb-2">Secure Passkey</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">lock</span>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                Authenticate <span className="material-symbols-outlined">login</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-on-surface-variant text-sm flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-sm">shield</span>
            Secured by Indian Railways Cyber Cell
          </p>
        </div>
      </div>
    </div>
  );
}
