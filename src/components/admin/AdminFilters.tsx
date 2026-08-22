import { Search, Filter } from 'lucide-react';

export interface AdminFilterState {
  search: string;
  courtId: string;
  status: string;
  date: string;
}

interface AdminFiltersProps {
  filters: AdminFilterState;
  onChange: (filters: AdminFilterState) => void;
  courts: { id: string; name: string }[];
}

export function AdminFilters({ filters, onChange, courts }: AdminFiltersProps) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-forest-700 mb-3">
        <Filter className="h-4 w-4" />
        <span className="text-sm font-semibold">Filtri</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="f-search" className="label">Cerca</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-wood-400" />
            <input
              id="f-search"
              type="text"
              value={filters.search}
              onChange={(e) => onChange({ ...filters, search: e.target.value })}
              placeholder="Nome o email"
              className="input pl-10"
            />
          </div>
        </div>
        <div>
          <label htmlFor="f-court" className="label">Campo</label>
          <select
            id="f-court"
            value={filters.courtId}
            onChange={(e) => onChange({ ...filters, courtId: e.target.value })}
            className="input"
          >
            <option value="">Tutti i campi</option>
            {courts.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-status" className="label">Stato</label>
          <select
            id="f-status"
            value={filters.status}
            onChange={(e) => onChange({ ...filters, status: e.target.value })}
            className="input"
          >
            <option value="">Tutti gli stati</option>
            <option value="pending">In attesa</option>
            <option value="confirmed">Confermata</option>
            <option value="cancelled">Annullata</option>
            <option value="completed">Completata</option>
            <option value="no_show">Non presentato</option>
          </select>
        </div>
        <div>
          <label htmlFor="f-date" className="label">Data</label>
          <input
            id="f-date"
            type="date"
            value={filters.date}
            onChange={(e) => onChange({ ...filters, date: e.target.value })}
            className="input"
          />
        </div>
      </div>
    </div>
  );
}
