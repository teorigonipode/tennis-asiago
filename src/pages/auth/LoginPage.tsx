import { useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isValidEmail } from '@/lib/utils';
import { FullSpinner } from '@/components/ui/Spinner';

export function LoginPage() {
  const { signIn, user, isAdmin, authLoading, profileLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (authLoading || profileLoading) return <FullSpinner />;

  if (user && isAdmin) return <Navigate to={from} replace />;

  if (user && !isAdmin) {
    return (
      <div className="container-page py-12">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="font-display text-xl font-bold text-forest-900">Permessi insufficienti</h1>
          <p className="mt-2 text-sm text-forest-600">
            Il tuo account non ha i permessi di amministratore.
          </p>
          <a href="/" className="btn-secondary mt-6">Torna alla home</a>
        </div>
      </div>
    );
  }

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
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-600 text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="font-display text-2xl font-bold text-forest-900">Area amministrativa</h1>
            <p className="mt-1 text-sm text-cream-500">Riservato agli amministratori del circolo.</p>
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

          <div className="mt-6 text-center text-sm text-forest-600">
            <a href="/recupero-password" className="link">Password dimenticata?</a>
          </div>
        </div>
      </div>
    </div>
  );
}
