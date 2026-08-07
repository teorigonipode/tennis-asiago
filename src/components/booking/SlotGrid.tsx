import { Lock, Check, Clock } from 'lucide-react';
import type { TimeSlot } from '@/types';
import { formatTime, cn } from '@/lib/utils';

interface SlotGridProps {
  slots: TimeSlot[];
  selected?: string;
  onSelect: (slot: TimeSlot) => void;
}

export function SlotGrid({ slots, selected, onSelect }: SlotGridProps) {
  if (slots.length === 0) {
    return (
      <p className="rounded-xl bg-cream-50 p-4 text-sm text-wood-500">
        Nessuno slot disponibile per questa data. Seleziona un altro giorno.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4" role="listbox" aria-label="Slot orari disponibili">
      {slots.map((slot) => {
        const isSelected = selected === slot.start;
        return (
          <button
            key={slot.start}
            type="button"
            disabled={!slot.available}
            role="option"
            aria-selected={isSelected}
            onClick={() => onSelect(slot)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-sm font-medium transition-all',
              isSelected && 'border-forest-600 bg-forest-600 text-white shadow-soft',
              !isSelected && slot.available && 'border-cream-200 bg-white text-forest-800 hover:border-forest-500 hover:bg-forest-50 active:scale-[0.97]',
              !slot.available && 'cursor-not-allowed border-cream-100 bg-cream-50 text-wood-400',
            )}
          >
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatTime(slot.start)} – {formatTime(slot.end)}
            </span>
            {!slot.available && (
              <span className="flex items-center gap-1 text-[11px] font-normal">
                <Lock className="h-3 w-3" /> {slot.reason}
              </span>
            )}
            {isSelected && (
              <span className="flex items-center gap-1 text-[11px] font-normal">
                <Check className="h-3 w-3" /> Selezionato
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
