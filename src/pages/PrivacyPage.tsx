import { Shield, Info } from 'lucide-react';
import { CLUB } from '@/lib/clubConfig';

export function PrivacyPage() {
  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest-50 text-forest-600">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="font-display text-3xl font-bold text-forest-900">Informativa privacy</h1>
        </div>

        <div className="card p-8 space-y-6 text-sm leading-relaxed text-forest-700">
          <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            <Info className="h-5 w-5 shrink-0" />
            <p>
              Questa informativa è provvisoria e sarà completata con i dati ufficiali del titolare del trattamento
              quando confermati dal gestore.
            </p>
          </div>

          <section>
            <h2 className="font-display text-lg font-bold text-forest-900 mb-2">1. Titolare del trattamento</h2>
            <p>
              Il titolare del trattamento dei dati è {CLUB.name}, con sede a {CLUB.contacts.address.value}.
              I contatti ufficiali saranno pubblicati appena confermati.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-forest-900 mb-2">2. Dati raccolti</h2>
            <p>
              Raccogliamo i dati necessari alla gestione delle prenotazioni: nome, cognome, email, telefono.
              Non raccogliamo dati di pagamento: il pagamento, dove previsto, avviene presso la struttura.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-forest-900 mb-2">3. Finalità del trattamento</h2>
            <p>
              I dati sono utilizzati esclusivamente per gestire le prenotazioni, inviare conferme e comunicazioni
              relative al servizio. Non cediamo i tuoi dati a terzi.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-forest-900 mb-2">4. Base giuridica</h2>
            <p>
              Il trattamento avviene sulla base del consenso esplicito fornito in fase di prenotazione
              e dell'adempimento contrattuale.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-forest-900 mb-2">5. Conservazione dei dati</h2>
            <p>
              I dati relativi alle prenotazioni sono conservati per il tempo strettamente necessario
              alla gestione del servizio. I termini esatti di conservazione saranno definiti dal titolare del trattamento.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-forest-900 mb-2">6. I tuoi diritti</h2>
            <p>
              Hai diritto di accedere ai tuoi dati, rettificarli, richiederne la cancellazione,
              opporti al trattamento e revocare il consenso in qualsiasi momento.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-forest-900 mb-2">7. Sicurezza</h2>
            <p>
              I dati sono protetti tramite controlli di accesso. La gestione delle prenotazioni avviene
              tramite codice prenotazione ed email. L'accesso ai dati completi è limitato agli amministratori autorizzati.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-forest-900 mb-2">8. Analytics</h2>
            <p>
              Il sito utilizza Vercel Analytics per raccogliere statistiche aggregate sugli accessi.
              Non vengono registrati dati personali, codici prenotazione o indirizzi email.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
