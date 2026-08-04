import { useEffect, useState } from 'react';
import { Plus, Edit, Save, X, Home } from 'lucide-react';
import { fetchCourts, createCourt, updateCourt, deleteCourt } from '@/services/courts';
import { FullSpinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatPrice } from '@/lib/utils';
import type { Court } from '@/types';

const EMPTY_COURT: Partial<Court> = {
  name: '',
  description: '',
  surface: 'Cemento',
  is_indoor: false,
  has_lighting: true,
  image_url: '',
  hourly_price: 25,
  is_active: true,
};

export function AdminCourts() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Court | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Court | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCourts(false);
      setCourts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore di caricamento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCourt(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante l\'eliminazione.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <FullSpinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Campi</h1>
          <p className="text-sm text-ink-500">Aggiungi, modifica o disattiva i campi.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Nuovo campo
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courts.map((court) => (
          <div key={court.id} className="card overflow-hidden">
            {court.image_url && (
              <div className="h-32 overflow-hidden">
                <img src={court.image_url} alt={court.name} className="h-full w-full object-cover" />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between">
                <h3 className="font-display text-base font-bold text-ink-900">{court.name}</h3>
                <span className={`badge ${court.is_active ? 'bg-court-100 text-court-800' : 'bg-ink-100 text-ink-500'}`}>
                  {court.is_active ? 'Attivo' : 'Disattivato'}
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-500">{court.surface} · {court.is_indoor ? 'Coperto' : 'Scoperto'}</p>
              <p className="mt-2 text-sm font-semibold text-court-700">{formatPrice(court.hourly_price)}/ora</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => setEditTarget(court)} className="btn-secondary flex-1">
                  <Edit className="h-4 w-4" /> Modifica
                </button>
                <button onClick={() => setDeleteTarget(court)} className="btn-danger" aria-label="Elimina">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {courts.length === 0 && (
        <div className="card p-8 text-center text-ink-500">
          <Home className="mx-auto mb-2 h-8 w-8 text-ink-300" />
          Nessun campo configurato.
        </div>
      )}

      {(editTarget || showCreate) && (
        <CourtFormDialog
          court={editTarget ?? undefined}
          onClose={() => { setEditTarget(null); setShowCreate(false); }}
          onSaved={() => { setEditTarget(null); setShowCreate(false); load(); }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Elimina campo"
        description={`Eliminare definitivamente "${deleteTarget?.name}"? Verranno cancellate anche le prenotazioni associate.`}
        confirmLabel="Elimina"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function CourtFormDialog({
  court, onClose, onSaved,
}: { court?: Court; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Court>>(court ?? EMPTY_COURT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    if (!form.name?.trim()) { setError('Il nome è obbligatorio.'); return; }
    setSaving(true);
    try {
      if (court) {
        await updateCourt(court.id, form);
      } else {
        await createCourt(form);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel salvataggio.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg card p-6 animate-scaleIn max-h-[90vh] overflow-y-auto">
        <h2 className="font-display text-lg font-bold text-ink-900 mb-4">
          {court ? 'Modifica campo' : 'Nuovo campo'}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input type="text" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">Descrizione</label>
            <textarea value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input min-h-[80px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Superficie</label>
              <select value={form.surface} onChange={(e) => setForm({ ...form, surface: e.target.value })} className="input">
                <option value="Terra rossa">Terra rossa</option>
                <option value="Cemento">Cemento</option>
                <option value="Sintetico">Sintetico</option>
                <option value="Erba">Erba</option>
              </select>
            </div>
            <div>
              <label className="label">Prezzo orario (€)</label>
              <input type="number" step="0.5" min="0" value={form.hourly_price ?? 0} onChange={(e) => setForm({ ...form, hourly_price: Number(e.target.value) })} className="input" />
            </div>
          </div>
          <div>
            <label className="label">URL immagine</label>
            <input type="text" value={form.image_url ?? ''} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="input" placeholder="https://…" />
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input type="checkbox" checked={form.is_indoor ?? false} onChange={(e) => setForm({ ...form, is_indoor: e.target.checked })} className="h-4 w-4 rounded border-ink-300 text-court-600" />
              Campo coperto
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input type="checkbox" checked={form.has_lighting ?? true} onChange={(e) => setForm({ ...form, has_lighting: e.target.checked })} className="h-4 w-4 rounded border-ink-300 text-court-600" />
              Illuminazione
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input type="checkbox" checked={form.is_active ?? true} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-ink-300 text-court-600" />
              Attivo
            </label>
          </div>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Chiudi</button>
          <button onClick={handleSave} className="btn-primary" disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? 'Salvataggio…' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  );
}
