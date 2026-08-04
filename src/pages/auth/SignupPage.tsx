import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isValidEmail, isValidPhone } from '@/lib/utils';

export function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!firstName.trim() || !lastName.trim()) { setError('Inserisci nome e cognome.'); return; }
    if (!isValidEmail(email)) { setError('Inserisci un\'email valida.'); return; }
    if (phone && !isValidPhone(phone)) { setError('Numero di telefono non valido.'); return; }
    if (password.length < 6) { setError('La password deve avere almeno 6 caratteri.'); return; }
    if (!privacyConsent) { setError('Devi accettare l\'informativa privacy.'); return; }

    setLoading(true);
    try {
      await signUp(email, password, firstName.trim(), lastName.trim(), phone.trim());
      setSuccess(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore durante la registrazione.';
      setError(msg.includes('already') ? 'Esiste già un account con questa email.' : msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="container-page py-12">
        <div className="mx-auto max-w-md">
          <div className="card p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-court-100 text-court-600">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h1 className="font-display text-xl font-bold text-ink-900">Registrazione completata</h1>
            <p className="mt-2 text-sm text-ink-600">
              Il tuo account è stato creato. Puoi ora accedere e prenotare i tuoi campi.
            </p>
            <button onClick={() => navigate('/login')} className="btn-primary mt-6">
              Vai al login
            </button>
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
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-court-600 text-white">
              <UserPlus className="h-6 w-6" />
            </div>
            <h1 className="font-display text-2xl font-bold text-ink-900">Registrati</h1>
            <p className="mt-1 text-sm text-ink-500">Crea il tuo account per prenotare.</p>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="su-fn" className="label">Nome *</label>
                <input id="su-fn" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="input" required />
              </div>
              <div>
                <label htmlFor="su-ln" className="label">Cognome *</label>
                <input id="su-ln" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="input" required />
              </div>
            </div>
            <div>
              <label htmlFor="su-email" className="label">Email *</label>
              <input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" autoComplete="email" required />
            </div>
            <div>
              <label htmlFor="su-phone" className="label">Telefono</label>
              <input id="su-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="+39 333 1234567" />
            </div>
            <div>
              <label htmlFor="su-pw" className="label">Password *</label>
              <input id="su-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" autoComplete="new-password" required />
              <p className="mt-1 text-xs text-ink-400">Minimo 6 caratteri.</p>
            </div>
            <label className="flex items-start gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                checked={privacyConsent}
                onChange={(e) => setPrivacyConsent(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-ink-300 text-court-600 focus:ring-court-500"
              />
              <span>
                Ho letto e accetto l'<Link to="/privacy" className="link" target="_blank">informativa privacy</Link>. *
              </span>
            </label>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Registrazione…' : 'Crea account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-600">
            Hai già un account? <Link to="/login" className="link">Accedi</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
