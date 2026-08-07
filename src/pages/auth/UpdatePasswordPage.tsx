import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError('La password deve avere almeno 6 caratteri.'); return; }
    if (password !== confirm) { setError('Le password non coincidono.'); return; }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nell\'aggiornamento della password.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="container-page py-12">
        <div className="mx-auto max-w-md">
          <div className="card p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-forest-100 text-forest-600">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h1 className="font-display text-xl font-bold text-forest-900">Password aggiornata</h1>
            <p className="mt-2 text-sm text-forest-600">
              La tua password è stata aggiornata. Sarai reindirizzato al login.
            </p>
            <Link to="/login" className="btn-primary mt-6">Vai al login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-md">
        <div className="card p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-600 text-white">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="font-display text-2xl font-bold text-forest-900">Nuova password</h1>
            <p className="mt-1 text-sm text-cream-500">Imposta la nuova password del tuo account.</p>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="up-pw" className="label">Nuova password</label>
              <input id="up-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" autoComplete="new-password" required />
              <p className="mt-1 text-xs text-wood-400">Minimo 6 caratteri.</p>
            </div>
            <div>
              <label htmlFor="up-cf" className="label">Conferma password</label>
              <input id="up-cf" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input" autoComplete="new-password" required />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Aggiornamento…' : 'Aggiorna password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
