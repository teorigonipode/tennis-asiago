import { useState, useEffect } from 'react';
import { User, AlertCircle, CheckCircle2, Save } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { upsertProfile } from '@/services/profiles';
import { isValidEmail, isValidPhone } from '@/lib/utils';

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name ?? '');
      setLastName(profile.last_name ?? '');
      setEmail(profile.email ?? user?.email ?? '');
      setPhone(profile.phone ?? '');
    }
  }, [profile, user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!user) return;
    if (phone && !isValidPhone(phone)) { setError('Numero di telefono non valido.'); return; }
    setSaving(true);
    try {
      await upsertProfile({
        id: user.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      await refreshProfile();
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel salvataggio.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <h1 className="font-display text-3xl font-bold text-ink-900">Il mio profilo</h1>
          <p className="mt-2 text-ink-600">Aggiorna i tuoi dati personali.</p>
        </header>

        <div className="card p-6">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-court-100 text-court-600">
              <User className="h-8 w-8" />
            </div>
            <div>
              <p className="font-display text-lg font-bold text-ink-900">
                {[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Utente'}
              </p>
              <p className="text-sm text-ink-500">{profile?.email ?? user.email}</p>
              {profile?.role === 'admin' && (
                <span className="badge bg-court-100 text-court-800 mt-1">Amministratore</span>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-court-50 p-3 text-sm text-court-800" role="status">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> Profilo aggiornato con successo.
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="pf-fn" className="label">Nome</label>
                <input id="pf-fn" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="input" />
              </div>
              <div>
                <label htmlFor="pf-ln" className="label">Cognome</label>
                <input id="pf-ln" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="input" />
              </div>
            </div>
            <div>
              <label htmlFor="pf-email" className="label">Email</label>
              <input id="pf-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
            </div>
            <div>
              <label htmlFor="pf-phone" className="label">Telefono</label>
              <input id="pf-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="+39 333 1234567" />
            </div>
            <button type="submit" className="btn-primary" disabled={saving}>
              <Save className="h-4 w-4" /> {saving ? 'Salvataggio…' : 'Salva modifiche'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
