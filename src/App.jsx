import { useState } from 'react'
import './App.css'

const initialForm = { firstName: '', lastName: '', email: '' }

function shuffleParticipants(participants) {
  const shuffled = [...participants]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ]
  }

  const matches = []
  const trioStart =
    shuffled.length % 2 === 1 ? Math.max(shuffled.length - 3, 0) : shuffled.length

  for (let index = 0; index < trioStart; index += 2) {
    matches.push(shuffled.slice(index, index + 2))
  }

  if (shuffled.length % 2 === 1 && shuffled.length >= 3) {
    matches.push(shuffled.slice(-3))
  }

  return matches
}

function CoffeeMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none">
        <path d="M7 12h16v8a7 7 0 0 1-7 7h-2a7 7 0 0 1-7-7v-8Z" />
        <path d="M23 15h2a3.5 3.5 0 0 1 0 7h-3M12 5c0 2 2 2 2 4m5-4c0 2-2 2-2 4" />
      </svg>
    </span>
  )
}

function SignupForm({ isClosed, participants, onSignup }) {
  const [form, setForm] = useState(initialForm)
  const [message, setMessage] = useState(null)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
    setMessage(null)
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (isClosed) return

    const normalizedEmail = form.email.trim().toLowerCase()
    const emailExists = participants.some(
      (participant) => participant.email.toLowerCase() === normalizedEmail,
    )

    if (emailExists) {
      setMessage({
        type: 'error',
        text: 'Questo indirizzo email è già iscritto al Coffee Match.',
      })
      return
    }

    onSignup({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: normalizedEmail,
    })
    setForm(initialForm)
    setMessage({
      type: 'success',
      text: 'Iscrizione completata! Ci vediamo al Coffee Match.',
    })
  }

  return (
    <section className="signup-card" id="iscrizione">
      <div className="section-eyebrow">
        <span className="eyebrow-dot" />
        {isClosed ? 'Iscrizioni chiuse' : 'Un posto al tavolo'}
      </div>
      <h2>Un caffè può essere l&apos;inizio di qualcosa.</h2>
      <p className="card-intro">
        Lascia i tuoi dati: al termine dell&apos;evento ti abbineremo a un altro
        partecipante per un caffè offerto a vicenda.
      </p>

      {isClosed ? (
        <div className="closed-notice" role="status">
          <span className="notice-icon" aria-hidden="true">✓</span>
          <div>
            <strong>Le iscrizioni sono chiuse</strong>
            <p>Gli abbinamenti sono in preparazione. A presto!</p>
          </div>
        </div>
      ) : (
        <form className="signup-form" onSubmit={handleSubmit}>
          <div className="field-row">
            <label className="field">
              <span>Nome</span>
              <input
                autoComplete="given-name"
                name="firstName"
                onChange={handleChange}
                placeholder="Il tuo nome"
                required
                value={form.firstName}
              />
            </label>
            <label className="field">
              <span>Cognome</span>
              <input
                autoComplete="family-name"
                name="lastName"
                onChange={handleChange}
                placeholder="Il tuo cognome"
                required
                value={form.lastName}
              />
            </label>
          </div>
          <label className="field">
            <span>Email</span>
            <input
              autoComplete="email"
              name="email"
              onChange={handleChange}
              placeholder="nome@email.com"
              required
              type="email"
              value={form.email}
            />
          </label>
          {message && (
            <p className={`form-message ${message.type}`} role="status">
              {message.text}
            </p>
          )}
          <button className="button button-primary signup-button" type="submit">
            Iscriviti al Coffee Match
            <span aria-hidden="true">→</span>
          </button>
          <p className="privacy-note">
            I tuoi dati servono solo per organizzare gli abbinamenti di questo
            evento.
          </p>
        </form>
      )}
      {!isClosed && message?.type === 'success' && (
        <span className="sr-only" aria-live="polite">
          {message.text}
        </span>
      )}
    </section>
  )
}

function MatchResults({ matches }) {
  if (matches.length === 0) {
    return (
      <div className="empty-matches">
        Non ci sono ancora partecipanti sufficienti per creare un match.
        Servono almeno due persone.
      </div>
    )
  }

  return (
    <section className="matches-section">
      <div className="organizer-section-heading">
        <div>
          <div className="section-eyebrow">Gli incontri di oggi</div>
          <h3>Coffee Match</h3>
        </div>
        <span className="match-count">
          {matches.length} {matches.length === 1 ? 'match' : 'match'}
        </span>
      </div>
      <div className="match-grid">
        {matches.map((match, index) => (
          <article className="match-card" key={match.map((person) => person.email).join('-')}>
            <div className="match-card-top">
              <span className="match-number">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="match-coffee" aria-hidden="true">☕</span>
            </div>
            <div className="match-people">
              {match.map((person, personIndex) => (
                <div className="match-person" key={person.email}>
                  {personIndex > 0 && (
                    <span className="match-connector" aria-hidden="true">
                      &
                    </span>
                  )}
                  <strong>{person.firstName} {person.lastName}</strong>
                  <span>{person.email}</span>
                </div>
              ))}
            </div>
            {match.length === 3 && (
              <span className="group-note">Un tavolo da tre</span>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}

function OrganizerView({
  isClosed,
  matches,
  onCloseAndMatch,
  onReset,
  participants,
}) {
  function handleReset() {
    const confirmed = window.confirm(
      'Vuoi iniziare un nuovo evento? Tutti gli iscritti e i match attuali verranno cancellati.',
    )

    if (confirmed) onReset()
  }

  return (
    <main className="organizer-page">
      <div className="organizer-header">
        <div>
          <div className="section-eyebrow">Dietro le quinte</div>
          <h1>Area organizzatore</h1>
          <p>Gestisci le iscrizioni e prepara gli incontri dell&apos;evento.</p>
        </div>
        <button className="button button-quiet" onClick={handleReset} type="button">
          <span aria-hidden="true">↻</span>
          Nuovo evento / Reset
        </button>
      </div>

      <div className="organizer-stats">
        <article className="stat-card">
          <span className="stat-label">Partecipanti iscritti</span>
          <strong className="stat-number">{participants.length}</strong>
          <span className="stat-caption">per questo evento</span>
        </article>
        <article className="stat-card status-stat">
          <span className="stat-label">Stato iscrizioni</span>
          <strong className={`status-pill ${isClosed ? 'closed' : 'open'}`}>
            <span className="status-dot" />
            {isClosed ? 'Chiuse' : 'Aperte'}
          </strong>
          <span className="stat-caption">
            {isClosed ? 'Non è possibile aggiungere partecipanti' : 'Pronte ad accogliere nuovi partecipanti'}
          </span>
        </article>
        <article className="stat-card">
          <span className="stat-label">Coffee Match</span>
          <strong className="stat-number">
            {matches ? matches.length : '—'}
          </strong>
          <span className="stat-caption">incontri generati</span>
        </article>
      </div>

      <section className="participants-section">
        <div className="organizer-section-heading">
          <div>
            <div className="section-eyebrow">La community</div>
            <h3>Partecipanti</h3>
          </div>
          <span className="participant-count">{participants.length} iscritti</span>
        </div>
        {participants.length === 0 ? (
          <div className="empty-state">
            <span className="empty-cup" aria-hidden="true">☕</span>
            <strong>La lista è ancora vuota</strong>
            <p>I partecipanti che si iscrivono appariranno qui.</p>
          </div>
        ) : (
          <div className="participant-list">
            <div className="participant-list-header">
              <span>Nome e cognome</span>
              <span>Email</span>
              <span>Stato</span>
            </div>
            {participants.map((participant, index) => (
              <div className="participant-row" key={participant.email}>
                <span className="participant-name">
                  <span className="avatar">{participant.firstName[0]}{participant.lastName[0]}</span>
                  <span>{participant.firstName} {participant.lastName}</span>
                </span>
                <span className="participant-email">{participant.email}</span>
                <span>
                  <span className="participant-status">
                    <span className="status-dot" />
                    Iscritto
                  </span>
                </span>
                <span className="sr-only">Partecipante {index + 1}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="matching-panel">
        <div className="matching-copy">
          <span className="matching-icon" aria-hidden="true">✳</span>
          <div>
            <strong>Pronto a far incontrare la community?</strong>
            <p>Chiudi le iscrizioni e crea abbinamenti casuali in un clic.</p>
          </div>
        </div>
        <button
          className="button button-primary"
          disabled={isClosed}
          onClick={onCloseAndMatch}
          type="button"
        >
          {matches ? 'Match generati' : 'Chiudi iscrizioni e genera i match'}
          {!matches && <span aria-hidden="true">→</span>}
        </button>
      </div>
      {participants.length < 2 && !isClosed && (
        <p className="matching-hint">
          {participants.length === 0
            ? 'Potrai generare i match dopo le prime iscrizioni.'
            : 'Con un solo partecipante non è possibile creare abbinamenti validi.'}
        </p>
      )}

      {matches && <MatchResults matches={matches} />}
    </main>
  )
}

function App() {
  const [participants, setParticipants] = useState([])
  const [isClosed, setIsClosed] = useState(false)
  const [matches, setMatches] = useState(null)
  const [isOrganizerView, setIsOrganizerView] = useState(false)

  function handleSignup(participant) {
    setParticipants((currentParticipants) => [...currentParticipants, participant])
  }

  function handleCloseAndMatch() {
    if (isClosed) return
    setMatches(shuffleParticipants(participants))
    setIsClosed(true)
  }

  function handleReset() {
    setParticipants([])
    setIsClosed(false)
    setMatches(null)
    setIsOrganizerView(false)
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a
          aria-label="Coffee Match, pagina principale"
          className="brand"
          href="#"
          onClick={() => setIsOrganizerView(false)}
        >
          <CoffeeMark />
          <span>coffee<span className="brand-accent">match</span></span>
        </a>
        <div className="header-right">
          <span className="event-label">
            <span className={`status-dot ${isClosed ? 'dot-closed' : ''}`} />
            {isClosed ? 'Evento concluso' : 'Evento in corso'}
          </span>
          <button
            aria-pressed={isOrganizerView}
            className={`organizer-toggle ${isOrganizerView ? 'selected' : ''}`}
            onClick={() => setIsOrganizerView((current) => !current)}
            type="button"
          >
            {isOrganizerView ? 'Torna alla pagina' : 'Area organizzatore'}
            <span aria-hidden="true">{isOrganizerView ? '↗' : '→'}</span>
          </button>
        </div>
      </header>

      {isOrganizerView ? (
        <OrganizerView
          isClosed={isClosed}
          matches={matches}
          onCloseAndMatch={handleCloseAndMatch}
          onReset={handleReset}
          participants={participants}
        />
      ) : (
        <main className="public-page">
          <section className="hero-section">
            <div className="hero-copy">
              <div className="hero-kicker">
                <span className="kicker-line" />
                CONNESSIONI CHE INIZIANO DAVANTI A UN CAFFÈ
              </div>
              <h1>
                Le belle idee
                <br />
                <span>iniziano</span> con un caffè.
              </h1>
              <p className="hero-description">
                Un incontro casuale, una conversazione autentica, un caffè
                offerto a vicenda. La tua conferenza è l&apos;occasione giusta
                per conoscere qualcuno di nuovo.
              </p>
              <div className="hero-highlights">
                <div>
                  <span className="highlight-icon" aria-hidden="true">01</span>
                  <span>Iscriviti in un momento</span>
                </div>
                <span className="highlight-divider" />
                <div>
                  <span className="highlight-icon" aria-hidden="true">02</span>
                  <span>Incontra il tuo match</span>
                </div>
              </div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="art-glow" />
              <div className="art-circle art-circle-one" />
              <div className="art-circle art-circle-two" />
              <div className="art-sparkle sparkle-one">✳</div>
              <div className="art-sparkle sparkle-two">✦</div>
              <div className="art-card art-card-back">
                <span>una pausa,</span>
                <strong>due storie.</strong>
              </div>
              <div className="coffee-cup">
                <div className="steam steam-one" />
                <div className="steam steam-two" />
                <div className="cup-rim" />
                <div className="cup-body"><span>cm</span></div>
                <div className="cup-handle" />
                <div className="cup-saucer" />
              </div>
              <div className="art-note">
                <span className="note-dot" />
                <span>Good things brew together</span>
              </div>
              <span className="art-caption">IL CASO FA INCONTRARE.<br />IL CAFFÈ FA IL RESTO.</span>
            </div>
          </section>

          <div className="public-divider">
            <span />
            <span className="divider-icon" aria-hidden="true">✳</span>
            <span />
          </div>

          <section className="how-it-works">
            <div>
              <span className="section-eyebrow">Semplice, come un buon caffè</span>
              <h2>Come funziona</h2>
            </div>
            <div className="steps">
              <article className="step">
                <span className="step-number">01</span>
                <div>
                  <h3>Ci sei?</h3>
                  <p>Lascia il tuo nome e la tua email per partecipare.</p>
                </div>
              </article>
              <article className="step">
                <span className="step-number">02</span>
                <div>
                  <h3>Lasciati sorprendere</h3>
                  <p>A fine conferenza ti abbineremo a un partecipante.</p>
                </div>
              </article>
              <article className="step">
                <span className="step-number">03</span>
                <div>
                  <h3>Il prossimo caffè, insieme</h3>
                  <p>Incontratevi e offritevi un caffè a vicenda.</p>
                </div>
              </article>
            </div>
          </section>

          <SignupForm
            isClosed={isClosed}
            onSignup={handleSignup}
            participants={participants}
          />
        </main>
      )}

      <footer className="site-footer">
        <a aria-label="Coffee Match, pagina principale" className="footer-brand" href="#">
          <CoffeeMark />
          <span>coffee<span className="brand-accent">match</span></span>
        </a>
        <span>Un caffè alla volta, connessioni migliori.</span>
        <span className="footer-note">FATTO PER INCONTRARSI <span aria-hidden="true">✳</span></span>
      </footer>
    </div>
  )
}

export default App
