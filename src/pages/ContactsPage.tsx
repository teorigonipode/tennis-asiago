import { MapPin, Phone, Mail, Clock, Car, Navigation } from 'lucide-react';

const CONTACTS = [
  { icon: MapPin, label: 'Indirizzo', value: 'Via Campo Sportivo 1, 36012 Asiago (VI)' },
  { icon: Phone, label: 'Telefono', value: '+39 0424 000 000' },
  { icon: Mail, label: 'Email', value: 'info@tennisasiago.it' },
  { icon: Clock, label: 'Orari', value: 'Lun – Ven: 8:00 – 21:00 · Sab – Dom: 9:00 – 18:00' },
];

export function ContactsPage() {
  return (
    <div className="container-page py-12">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold text-ink-900">Contatti e posizione</h1>
        <p className="mt-2 text-ink-600">Come raggiungere i campi da tennis di Asiago.</p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <div className="card p-6">
            <h2 className="font-display text-lg font-bold text-ink-900 mb-4">Informazioni di contatto</h2>
            <ul className="space-y-4">
              {CONTACTS.map((c, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-court-50 text-court-600">
                    <c.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-ink-500">{c.label}</p>
                    <p className="text-sm font-medium text-ink-800">{c.value}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="card mt-4 p-6">
            <h2 className="font-display text-lg font-bold text-ink-900 mb-3 flex items-center gap-2">
              <Car className="h-5 w-5 text-court-600" /> Parcheggio
            </h2>
            <p className="text-sm text-ink-600">
              Ampio parcheggio gratuito disponibile a pochi passi dai campi. Accessibile direttamente dalla strada principale.
            </p>
          </div>

          <div className="card mt-4 p-6">
            <h2 className="font-display text-lg font-bold text-ink-900 mb-3 flex items-center gap-2">
              <Navigation className="h-5 w-5 text-court-600" /> Come raggiungerci
            </h2>
            <p className="text-sm text-ink-600">
              Da Vicenza: SS 47 della Valsugana fino a Thiene, poi SR 350 per Asiago. La struttura si trova all'ingresso del paese, sulla destra.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl shadow-card">
          <iframe
            title="Mappa Tennis Asiago"
            src="https://www.openstreetmap.org/export/embed.html?bbox=11.5%2C45.88%2C11.58%2C45.92&layer=mapnik&marker=45.9%2C11.5167"
            className="h-full min-h-[500px] w-full border-0"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}
