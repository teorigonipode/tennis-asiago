import { useEffect, useState } from 'react';
import { Settings, Save, Clock } from 'lucide-react';
import { fetchSettings, updateSettings, fetchOpeningHours, updateOpeningHour } from '@/services/settings';
import { FullSpinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { WEEKDAYS } from '@/lib/utils';
import type { BookingSettings, OpeningHour } from '@/types';

export function AdminSettings() {
  const [settings, setSettings] = useState<BookingSettings | null>(null);
  const [hours, setHours] = useState<OpeningHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, h] = await Promise.all([fetchSettings(), fetchOpeningHours()]);
      setSettings(s);
      setHours(h);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore di caricamento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    setError(null);
    try {
      await updateSettings(settings.id, settings);
      setSuccessMsg('Impostazioni salvate.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel salvataggio.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveHours = async () => {
    setSavingHours(true);
    setError(null);
    try {
      await Promise.all(hours.map((h) => updateOpeningHour(h.id, h)));
      setSuccessMsg('Orari salvati.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel salvataggio.');
    } finally {
      setSavingHours(false);
    }
  };

  if (loading) return <FullSpinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!settings) return <ErrorState message="Impostazioni non trovate." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Impostazioni</h1>
        <p className="text-sm text-ink-500">Configura orari, durata slot e regole di prenotazione.</p>
      </div>

      {successMsg && (
        <div className="rounded-xl bg-court-50 p-3 text-sm text-court-800" role="status">
          {successMsg}
        </div>
      )}

      {/* Booking settings */}
      <div className="card p-6">
        <h2 className="font-display text-lg font-bold text-ink-900 mb-4 flex items-center gap-2">
          <Settings className="h-5 w-5 text-court-600" /> Regole di prenotazione
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="label">Durata slot (minuti)</label>
            <input type="number" min="30" step="30" value={settings.slot_duration_minutes}
              onChange={(e) => setSettings({ ...settings, slot_duration_minutes: Number(e.target.value) })} className="input" />
          </div>
          <div>
            <label className="label">Anticipo massimo (giorni)</label>
            <input type="number" min="1" value={settings.maximum_advance_days}
              onChange={(e) => setSettings({ ...settings, maximum_advance_days: Number(e.target.value) })} className="input" />
          </div>
          <div>
            <label className="label">Anticipo minimo (minuti)</label>
            <input type="number" min="0" value={settings.minimum_advance_minutes}
              onChange={(e) => setSettings({ ...settings, minimum_advance_minutes: Number(e.target.value) })} className="input" />
          </div>
          <div>
            <label className="label">Limite annullamento (ore)</label>
            <input type="number" min="0" value={settings.cancellation_limit_hours}
              onChange={(e) => setSettings({ ...settings, cancellation_limit_hours: Number(e.target.value) })} className="input" />
          </div>
          <div>
            <label className="label">Max prenotazioni attive</label>
            <input type="number" min="1" value={settings.maximum_active_bookings}
              onChange={(e) => setSettings({ ...settings, maximum_active_bookings: Number(e.target.value) })} className="input" />
          </div>
          <div>
            <label className="label">Prenotazione ospite</label>
            <select value={settings.guest_booking_enabled ? '1' : '0'}
              onChange={(e) => setSettings({ ...settings, guest_booking_enabled: e.target.value === '1' })} className="input">
              <option value="1">Abilitata</option>
              <option value="0">Disabilitata</option>
            </select>
          </div>
        </div>
        <button onClick={handleSaveSettings} className="btn-primary mt-4" disabled={savingSettings}>
          <Save className="h-4 w-4" /> {savingSettings ? 'Salvataggio…' : 'Salva impostazioni'}
        </button>
      </div>

      {/* Opening hours */}
      <div className="card p-6">
        <h2 className="font-display text-lg font-bold text-ink-900 mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-court-600" /> Orari di apertura
        </h2>
        <div className="space-y-2">
          {hours.map((h, i) => (
            <div key={h.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-ink-50 p-3">
              <span className="w-24 text-sm font-semibold text-ink-800">{WEEKDAYS[h.day_of_week]}</span>
              <label className="flex items-center gap-2 text-sm text-ink-600">
                <input type="checkbox" checked={!h.is_closed}
                  onChange={(e) => setHours(hours.map((x, j) => j === i ? { ...x, is_closed: !e.target.checked } : x))}
                  className="h-4 w-4 rounded border-ink-300 text-court-600" />
                {h.is_closed ? 'Chiuso' : 'Aperto'}
              </label>
              {!h.is_closed && (
                <div className="flex items-center gap-2">
                  <input type="time" value={h.opening_time.slice(0, 5)}
                    onChange={(e) => setHours(hours.map((x, j) => j === i ? { ...x, opening_time: e.target.value + ':00' } : x))}
                    className="input py-2" />
                  <span className="text-ink-400">–</span>
                  <input type="time" value={h.closing_time.slice(0, 5)}
                    onChange={(e) => setHours(hours.map((x, j) => j === i ? { ...x, closing_time: e.target.value + ':00' } : x))}
                    className="input py-2" />
                </div>
              )}
            </div>
          ))}
        </div>
        <button onClick={handleSaveHours} className="btn-primary mt-4" disabled={savingHours}>
          <Save className="h-4 w-4" /> {savingHours ? 'Salvataggio…' : 'Salva orari'}
        </button>
      </div>
    </div>
  );
}
