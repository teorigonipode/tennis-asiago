import { Shield } from 'lucide-react';

export function PrivacyPage() {
  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-court-50 text-court-600">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="font-display text-3xl font-bold text-ink-900">Informativa privacy</h1>
        </div>

        <div className="card p-8 space-y-6 text-sm leading-relaxed text-ink-700">
          <section>
            <h2 className="font-display text-lg font-bold text-ink-900 mb-2">1. Titolare del trattamento</h2>
            <p>
              Il titolare del trattamento dei dati è Tennis Asiago, con sede in Via Campo Sportivo 1, 36012 Asiago (VI).
              Per qualsiasi richiesta relativa ai tuoi dati puoi scrivere a info@tennisasiago.it.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-ink-900 mb-2">2. Dati raccolti</h2>
            <p>
              Raccogliamo i dati necessari alla gestione delle prenotazioni: nome, cognome, email, telefono.
              I dati di pagamento non sono trattati dal sistema: il pagamento avviene presso la struttura.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-ink-900 mb-2">3. Finalità del trattamento</h2>
            <p>
              I dati sono utilizzati esclusivamente per gestire le prenotazioni, inviare conferme e promemoria,
              e per comunicazioni relative al servizio. Non cediamo i tuoi dati a terzi.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-ink-900 mb-2">4. Base giuridica</h2>
            <p>
              Il trattamento avviene sulla base del consenso esplicito fornito in fase di prenotazione
              e dell'adempimento contrattuale.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-ink-900 mb-2">5. Conservazione dei dati</h2>
            <p>
              I dati relativi alle prenotazioni sono conservati per il tempo strettamente necessario
              alla gestione del servizio e comunque non oltre i termini di legge.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-ink-900 mb-2">6. I tuoi diritti</h2>
            <p>
              Hai diritto di accedere ai tuoi dati, rettificarli, richiederne la cancellazione,
              opporti al trattamento e revocare il consenso in qualsiasi momento.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-ink-900 mb-2">7. Sicurezza</h2>
            <p>
              I dati sono protetti tramite crittografia e controlli di accesso. L'accesso alle prenotazioni
              è limitato al titolare della prenotazione e agli amministratori autorizzati.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
