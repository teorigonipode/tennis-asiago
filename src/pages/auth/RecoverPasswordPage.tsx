import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isValidEmail } from '@/lib/utils';

export function RecoverPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidEmail(email)) { setError('Inserisci un\'email valida.'); return; }
    setLoading(true);
    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nella richiesta.');
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
              <Mail className="h-6 w-6" />
            </div>
            <h1 className="font-display text-2xl font-bold text-ink-900">Recupero password</h1>
            <p className="mt-1 text-sm text-ink-500">Riceverai un link per reimpostare la password.</p>
          </div>

          {success ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-court-100 text-court-600">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <p className="text-sm text-ink-600">
                Se l'email è registrata, riceverai un messaggio con le istruzioni per reimpostare la password.
              </p>
              <Link to="/login" className="btn-secondary mt-6">Torna al login</Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="rp-email" className="label">Email</label>
                  <input id="rp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" required />
                </div>
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'Invio in corso…' : 'Invia link di recupero'}
                </button>
              </form>
              <p className="mt-6 text-center text-sm text-ink-600">
                <Link to="/login" className="link">Torna al login</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
