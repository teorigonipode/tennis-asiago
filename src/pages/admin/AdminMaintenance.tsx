import { useEffect, useState } from 'react';
import { Plus, Trash2, Wrench, CalendarOff } from 'lucide-react';
import { fetchClosures, createClosure, deleteClosure } from '@/services/settings';
import { fetchCourts } from '@/services/courts';
import { useAuth } from '@/hooks/useAuth';
import { FullSpinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatDateShort } from '@/lib/utils';
import type { CourtClosure, Court } from '@/types';

export function AdminMaintenance() {
  const { user } = useAuth();
  const [closures, setClosures] = useState<CourtClosure[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CourtClosure | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, cr] = await Promise.all([fetchClosures(), fetchCourts(false)]);
      setClosures(c);
      setCourts(cr);
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
      await deleteClosure(deleteTarget.id);
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
          <h1 className="font-display text-2xl font-bold text-forest-900">Manutenzione</h1>
          <p className="text-sm text-cream-500">Chiudi campi per manutenzione o eventi.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Nuova chiusura
        </button>
      </div>

      {closures.length === 0 ? (
        <EmptyState icon={CalendarOff} title="Nessuna chiusura" description="Non ci sono chiusure programmate. I campi sono tutti operativi." />
      ) : (
        <div className="space-y-2">
          {closures.map((c) => {
            const court = courts.find((cr) => cr.id === c.court_id);
            return (
              <div key={c.id} className="card flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                    <Wrench className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-forest-800">{court?.name ?? 'Campo'}</p>
                    <p className="text-sm text-cream-500">
                      {formatDateShort(c.start_at)} → {formatDateShort(c.end_at)}
                    </p>
                    {c.reason && <p className="text-xs text-wood-400">{c.reason}</p>}
                  </div>
                </div>
                <button onClick={() => setDeleteTarget(c)} className="btn-danger" aria-label="Elimina chiusura">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <ClosureFormDialog
          courts={courts}
          userId={user?.id ?? null}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Elimina chiusura"
        description="Rimuovere questa chiusura? Il campo tornerà disponibile."
        confirmLabel="Elimina"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function ClosureFormDialog({
  courts, userId, onClose, onSaved,
}: { courts: Court[]; userId: string | null; onClose: () => void; onSaved: () => void }) {
  const [courtId, setCourtId] = useState(courts[0]?.id ?? '');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    if (!courtId || !startAt || !endAt) { setError('Compila tutti i campi.'); return; }
    if (new Date(endAt) <= new Date(startAt)) { setError('La fine deve essere successiva all\'inizio.'); return; }
    setSaving(true);
    try {
      await createClosure({
        court_id: courtId,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
        reason: reason.trim() || null,
        created_by: userId,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nella creazione.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-forest-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md card p-6 animate-scaleIn">
        <h2 className="font-display text-lg font-bold text-forest-900 mb-4">Nuova chiusura</h2>
        <div className="space-y-4">
          <div>
            <label className="label">Campo *</label>
            <select value={courtId} onChange={(e) => setCourtId(e.target.value)} className="input">
              {courts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Inizio *</label>
            <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Fine *</label>
            <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Motivo</label>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className="input" placeholder="Manutenzione, evento…" />
          </div>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Chiudi</button>
          <button onClick={handleSave} className="btn-primary" disabled={saving}>
            {saving ? 'Creazione…' : 'Crea chiusura'}
          </button>
        </div>
      </div>
    </div>
  );
}
