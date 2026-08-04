import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isValidEmail } from '@/lib/utils';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidEmail(email)) { setError('Inserisci un\'email valida.'); return; }
    if (!password) { setError('Inserisci la password.'); return; }
    setLoading(true);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Credenziali non valide.';
      setError(msg.includes('Invalid login') ? 'Email o password non corretti.' : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-md">
        <div className="card p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-court-600 text-white">
              <LogIn className="h-6 w-6" />
            </div>
            <h1 className="font-display text-2xl font-bold text-ink-900">Accedi</h1>
            <p className="mt-1 text-sm text-ink-500">Entra per gestire le tue prenotazioni.</p>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="label">Email</label>
              <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" autoComplete="email" required />
            </div>
            <div>
              <label htmlFor="login-pw" className="label">Password</label>
              <input id="login-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" autoComplete="current-password" required />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Accesso in corso…' : 'Accedi'}
            </button>
          </form>

          <div className="mt-6 space-y-2 text-center text-sm text-ink-600">
            <p>Non hai un account? <Link to="/registrati" className="link">Registrati</Link></p>
            <p><Link to="/recupero-password" className="link">Password dimenticata?</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
