import { MapPin, Phone, Mail, Clock, Navigation, Info } from 'lucide-react';
import { CLUB } from '@/lib/clubConfig';
import { OpeningHoursSummary } from '@/components/common/OpeningHoursSummary';

export function ContactsPage() {
  return (
    <div className="container-page py-12">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold text-forest-900">Contatti e posizione</h1>
        <p className="mt-2 text-forest-600">Come raggiungere il Tennis Club Asiago.</p>
      </header>

      <div className="mb-6 flex items-start gap-3 rounded-2xl bg-cream-100 p-4 text-sm text-wood-600">
        <Info className="h-5 w-5 shrink-0 text-wood-400" />
        <p>
          Alcuni dati del circolo sono in fase di conferma. Le informazioni riportate
          sono provvisorie e verranno aggiornate appena disponibili.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <div className="card p-6">
            <h2 className="font-display text-lg font-bold text-forest-900 mb-4">Informazioni di contatto</h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-600">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-wood-500">{CLUB.contacts.address.label}</p>
                  <p className="text-sm font-medium text-forest-800">{CLUB.contacts.address.value}</p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-600">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-wood-500">{CLUB.contacts.phone.label}</p>
                  <a href={`tel:${CLUB.contacts.phone.value.replace(/\s/g, '')}`} className="text-sm font-medium text-forest-800 hover:underline">
                    {CLUB.contacts.phone.value}
                  </a>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-600">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-wood-500">{CLUB.contacts.email.label}</p>
                  <a href={`mailto:${CLUB.contacts.email.value}`} className="text-sm font-medium text-forest-800 hover:underline">
                    {CLUB.contacts.email.value}
                  </a>
                </div>
              </li>
            </ul>
          </div>

          <div className="card mt-4 p-6">
            <h2 className="font-display text-lg font-bold text-forest-900 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-forest-600" /> Orari di apertura
            </h2>
            <OpeningHoursSummary variant="full" />
          </div>

          <div className="card mt-4 p-6">
            <h2 className="font-display text-lg font-bold text-forest-900 mb-3 flex items-center gap-2">
              <Navigation className="h-5 w-5 text-forest-600" /> Come raggiungerci
            </h2>
            <p className="text-sm text-forest-600">
              Il circolo si trova nel Parco Millepini ad Asiago.
              Le indicazioni stradali saranno pubblicate appena confermate.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl shadow-card">
          <iframe
            title="Mappa Tennis Club Asiago"
            src={CLUB.mapEmbedUrl}
            className="h-full min-h-[500px] w-full border-0"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}
