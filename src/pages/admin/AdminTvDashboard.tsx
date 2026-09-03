import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tv, Maximize, Minimize, LogOut, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Court, Booking } from '@/types';

type CourtStatus = 'free' | 'ongoing' | 'upcoming' | 'closed' | 'stale';

interface CourtDisplay {
  court: Court;
  status: CourtStatus;
  currentBooking?: Booking;
  nextBooking?: Booking;
  minutesRemaining?: number;
  minutesToNext?: number;
}

const ROME_TZ = 'Europe/Rome';

function nowInRome(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: ROME_TZ }));
}

function romeDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function privacyName(fullName: string | null): string {
  if (!fullName) return '—';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function statusLabel(status: CourtStatus): string {
  switch (status) {
    case 'free': return 'Libero';
    case 'ongoing': return 'In corso';
    case 'upcoming': return 'Prossima';
    case 'closed': return 'Non disponibile';
    case 'stale': return 'Dati non aggiornati';
  }
}

function statusColor(status: CourtStatus): string {
  switch (status) {
    case 'free': return 'bg-forest-100 text-forest-800 border-forest-300';
    case 'ongoing': return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'upcoming': return 'bg-sky-100 text-sky-800 border-sky-300';
    case 'closed': return 'bg-red-100 text-red-700 border-red-300';
    case 'stale': return 'bg-cream-200 text-cream-700 border-cream-400';
  }
}

export function AdminTvDashboard() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const [courts, setCourts] = useState<Court[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [clock, setClock] = useState(new Date());
  const [cursorVisible, setCursorVisible] = useState(true);
  const [syncError, setSyncError] = useState(false);

  const cursorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dayCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastDayRef = useRef<string>(romeDateStr(nowInRome()));
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async (showSpinner: boolean) => {
    if (showSpinner) setLoading(true);
    setSyncError(false);
    try {
      const [courtsRes, bookingsRes] = await Promise.all([
        supabase.from('courts').select('*').eq('is_active', true).order('display_order'),
        supabase.from('bookings')
          .select('id,court_id,booking_date,start_time,end_time,customer_name,status,created_at,updated_at')
          .eq('booking_date', romeDateStr(nowInRome()))
          .in('status', ['confirmed', 'pending']),
      ]);
      if (courtsRes.error) throw courtsRes.error;
      if (bookingsRes.error) throw bookingsRes.error;
      if (!isMountedRef.current) return;
      setCourts((courtsRes.data as unknown as Court[]) ?? []);
      setBookings((bookingsRes.data as unknown as Booking[]) ?? []);
      setLastSync(new Date());
    } catch {
      if (isMountedRef.current) setSyncError(true);
    } finally {
      if (showSpinner && isMountedRef.current) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    isMountedRef.current = true;
    fetchData(true);
    return () => {
      isMountedRef.current = false;
      if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      if (clockTimerRef.current) clearInterval(clockTimerRef.current);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (dayCheckRef.current) clearInterval(dayCheckRef.current);
    };
  }, [fetchData]);

  // Clock timer: every 30 seconds
  useEffect(() => {
    setClock(new Date());
    clockTimerRef.current = setInterval(() => setClock(new Date()), 30_000);
    return () => { if (clockTimerRef.current) clearInterval(clockTimerRef.current); };
  }, []);

  // Safety refresh: every 15 minutes
  useEffect(() => {
    refreshTimerRef.current = setTimeout(() => fetchData(false), 15 * 60 * 1000);
    return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current); };
  }, [fetchData, lastSync]);

  // Day change check at midnight Europe/Rome
  useEffect(() => {
    dayCheckRef.current = setInterval(() => {
      const today = romeDateStr(nowInRome());
      if (today !== lastDayRef.current) {
        lastDayRef.current = today;
        fetchData(false);
      }
    }, 60_000);
    return () => { if (dayCheckRef.current) clearInterval(dayCheckRef.current); };
  }, [fetchData]);

  // Realtime subscription: one subscription on bookings
  useEffect(() => {
    const channel = supabase
      .channel('tv-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          if (!isMountedRef.current) return;
          if (payload.eventType === 'DELETE') {
            setBookings((prev) => prev.filter((b) => b.id !== (payload.old as Booking).id));
          } else {
            const newBooking = payload.new as Booking;
            setBookings((prev) => {
              const idx = prev.findIndex((b) => b.id === newBooking.id);
              if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = newBooking;
                return copy;
              }
              return [...prev, newBooking];
            });
          }
          setLastSync(new Date());
        }, 500);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Fullscreen handling
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Fallback: no-op, user can use F11
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Cursor hide on inactivity
  useEffect(() => {
    const onMove = () => {
      setCursorVisible(true);
      if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current);
      cursorTimerRef.current = setTimeout(() => setCursorVisible(false), 5000);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchstart', onMove);
    cursorTimerRef.current = setTimeout(() => setCursorVisible(false), 5000);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchstart', onMove);
      if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current);
    };
  }, []);

  // Compute court displays
  const courtDisplays = useMemo<CourtDisplay[]>(() => {
    const now = nowInRome();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const todayStr = romeDateStr(now);

    return courts.map((court) => {
      const courtBookings = bookings
        .filter((b) => b.court_id === court.id && b.booking_date === todayStr)
        .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

      const ongoing = courtBookings.find(
        (b) => timeToMinutes(b.start_time) <= nowMin && timeToMinutes(b.end_time) > nowMin
      );
      const upcoming = courtBookings.find((b) => timeToMinutes(b.start_time) > nowMin);

      if (ongoing) {
        const remaining = timeToMinutes(ongoing.end_time) - nowMin;
        return {
          court,
          status: 'ongoing' as CourtStatus,
          currentBooking: ongoing,
          minutesRemaining: remaining,
          minutesToNext: upcoming ? timeToMinutes(upcoming.start_time) - nowMin : undefined,
          nextBooking: upcoming,
        };
      }

      if (upcoming) {
        const toNext = timeToMinutes(upcoming.start_time) - nowMin;
        return {
          court,
          status: 'upcoming' as CourtStatus,
          nextBooking: upcoming,
          minutesToNext: toNext,
        };
      }

      return { court, status: 'free' as CourtStatus };
    });
  }, [courts, bookings, clock]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const romeDate = nowInRome();
  const dateLabel = romeDate.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: ROME_TZ,
  });
  const timeLabel = clock.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: ROME_TZ,
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-forest-950 text-white">
        <RefreshCw className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-forest-950 text-white ${cursorVisible ? '' : 'cursor-none'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-600">
            <Tv className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold lg:text-2xl">Tennis Asiago</h1>
            <p className="text-xs text-forest-300">Dashboard Campi</p>
          </div>
        </div>

        <div className="flex items-center gap-4 lg:gap-6">
          {/* Live indicator */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
            </span>
            <span className="text-sm font-semibold text-red-300">LIVE</span>
          </div>

          {/* Clock + Date */}
          <div className="text-right">
            <div className="font-display text-3xl font-bold tabular-nums lg:text-4xl">{timeLabel}</div>
            <div className="text-sm capitalize text-forest-300">{dateLabel}</div>
          </div>

          {/* Last sync */}
          <div className="hidden text-right text-xs text-forest-400 lg:block">
            {syncError ? (
              <span className="text-amber-400">Sincronizzazione errore</span>
            ) : lastSync ? (
              <>Ultima sincronizzazione: {lastSync.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</>
            ) : (
              'In attesa…'
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchData(false)}
              className="rounded-lg p-2 text-forest-300 transition-colors hover:bg-forest-800 hover:text-white"
              title="Aggiorna"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="rounded-lg p-2 text-forest-300 transition-colors hover:bg-forest-800 hover:text-white"
              title={isFullscreen ? 'Esci fullscreen' : 'Entra fullscreen'}
            >
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
            <button
              onClick={handleSignOut}
              className="rounded-lg p-2 text-forest-300 transition-colors hover:bg-forest-800 hover:text-white"
              title="Esci"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Court cards grid */}
      <div className="grid grid-cols-1 gap-4 px-6 pb-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:px-10 lg:gap-6">
        {courtDisplays.map((display) => {
          const isStale = lastSync && (Date.now() - lastSync.getTime() > 5 * 60 * 1000);
          const effectiveStatus = isStale ? 'stale' : display.status;

          return (
            <div
              key={display.court.id}
              className={`rounded-2xl border-2 p-5 transition-all ${statusColor(effectiveStatus)}`}
            >
              {/* Court name */}
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold lg:text-xl">{display.court.name}</h2>
                <span className="rounded-full bg-white/60 px-3 py-1 text-xs font-bold uppercase">
                  {statusLabel(effectiveStatus)}
                </span>
              </div>

              {/* Content based on status */}
              {effectiveStatus === 'ongoing' && display.currentBooking && (
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium">In campo</span>
                    <span className="text-sm">
                      {formatTime(display.currentBooking.start_time)}–{formatTime(display.currentBooking.end_time)}
                    </span>
                  </div>
                  <p className="text-lg font-bold lg:text-xl">{privacyName(display.currentBooking.customer_name)}</p>
                  <div className="flex items-baseline justify-between border-t border-current/20 pt-2">
                    <span className="text-sm">Tempo rimanente</span>
                    <span className="font-display text-2xl font-bold tabular-nums lg:text-3xl">
                      {display.minutesRemaining} min
                    </span>
                  </div>
                  {display.nextBooking && (
                    <div className="flex items-baseline justify-between border-t border-current/20 pt-2 text-sm">
                      <span>Prossima tra</span>
                      <span className="font-semibold">{display.minutesToNext} min</span>
                    </div>
                  )}
                </div>
              )}

              {effectiveStatus === 'upcoming' && display.nextBooking && (
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium">Prossima prenotazione</span>
                    <span className="text-sm">
                      {formatTime(display.nextBooking.start_time)}–{formatTime(display.nextBooking.end_time)}
                    </span>
                  </div>
                  <p className="text-lg font-bold lg:text-xl">{privacyName(display.nextBooking.customer_name)}</p>
                  <div className="flex items-baseline justify-between border-t border-current/20 pt-2">
                    <span className="text-sm">Inizia tra</span>
                    <span className="font-display text-2xl font-bold tabular-nums lg:text-3xl">
                      {display.minutesToNext} min
                    </span>
                  </div>
                </div>
              )}

              {effectiveStatus === 'free' && (
                <div className="flex items-center justify-center py-8">
                  <p className="text-lg font-semibold lg:text-xl">Campo libero</p>
                </div>
              )}

              {effectiveStatus === 'closed' && (
                <div className="flex items-center justify-center py-8">
                  <p className="text-lg font-semibold lg:text-xl">Non disponibile</p>
                </div>
              )}

              {effectiveStatus === 'stale' && (
                <div className="flex items-center justify-center py-8">
                  <p className="text-lg font-semibold lg:text-xl">Dati non aggiornati</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer info */}
      <div className="px-6 pb-4 text-center text-xs text-forest-500 lg:px-10">
        Tennis Asiago · Dashboard TV · Aggiornamento automatico ogni 30 secondi
      </div>
    </div>
  );
}

function formatTime(t: string): string {
  return t.slice(0, 5);
}
