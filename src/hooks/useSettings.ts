import { useEffect, useState } from 'react';
import type { BookingSettings, OpeningHour } from '@/types';
import { fetchSettings, fetchOpeningHours } from '@/services/settings';

export function useSettings() {
  const [settings, setSettings] = useState<BookingSettings | null>(null);
  const [openingHours, setOpeningHours] = useState<OpeningHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([fetchSettings(), fetchOpeningHours()])
      .then(([s, h]) => {
        if (active) {
          setSettings(s);
          setOpeningHours(h);
          setError(null);
        }
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { settings, openingHours, loading, error };
}
