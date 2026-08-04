import { useEffect, useState } from 'react';
import type { Court } from '@/types';
import { fetchCourts } from '@/services/courts';

export function useCourts(activeOnly = true) {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchCourts(activeOnly)
      .then((data) => {
        if (active) {
          setCourts(data);
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
  }, [activeOnly]);

  return { courts, loading, error };
}
