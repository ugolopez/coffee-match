import { useEffect, useRef, useState } from 'react'
import './App.css'

const initialForm = { firstName: '', lastName: '', email: '' }
const eventId = '46869c0f-21ae-4d70-9865-5f72d87c1153'

function createMatchRows(participants) {
  const shuffled = [...participants]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ]
  }

  if (new Set(shuffled.map((participant) => participant.id)).size !== shuffled.length) {
    throw new Error('Duplicate participant IDs')
  }

  const groups = []
  const trioStart =
    shuffled.length % 2 === 1 ? Math.max(shuffled.length - 3, 0) : shuffled.length

  for (let index = 0; index < trioStart; index += 2) {
    groups.push(shuffled.slice(index, index + 2))
  }

  if (shuffled.length % 2 === 1 && shuffled.length >= 3) {
    groups.push(shuffled.slice(-3))
  }

  return groups.flatMap((group, index) =>
    group.map((participant) => ({
      group_number: index + 1,
      participant_id: participant.id,
    })),
  )
}

function groupPersistedMatches(matchRows, participants) {
  const participantsById = new Map(
    participants.map((participant) => [participant.id, participant]),
  )
  const groups = new Map()

  for (const match of matchRows) {
    const participant = participantsById.get(match.participant_id)
    if (!participant) throw new Error('Match references an unknown participant')

    if (!groups.has(match.group_number)) {
      groups.set(match.group_number, [])
    }

    groups.get(match.group_number).push(participant)
  }

  return [...groups.entries()]
    .sort(([groupNumberA], [groupNumberB]) => groupNumberA - groupNumberB)
    .map(([groupNumber, groupParticipants]) => ({
      groupNumber,
      participants: groupParticipants,
    }))
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

function SignupForm({
  isClosed,
  isEventReady,
  isEventLoading,
  participants,
  onSignup,
}) {
  const [form, setForm] = useState(initialForm)
  const [message, setMessage] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
    setMessage(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (isClosed || !isEventReady || isSubmitting) return

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

    setIsSubmitting(true)

    try {
      const { supabase } = await import('./lib/supabase.js')
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('registration_open, matching_completed')
        .eq('id', '46869c0f-21ae-4d70-9865-5f72d87c1153')
        .maybeSingle()

      if (eventError) {
        setMessage({
          type: 'error',
          text: 'Non è stato possibile verificare lo stato delle iscrizioni. Riprova.',
        })
        return
      }

      if (!eventData) {
        setMessage({
          type: 'error',
          text: 'L’evento Coffee Match non è disponibile per le iscrizioni.',
        })
        return
      }

      if (
        eventData.registration_open !== true ||
        eventData.matching_completed !== false
      ) {
        setMessage({
          type: 'error',
          text: 'Le iscrizioni a questo evento sono chiuse.',
        })
        return
      }

      const { error: insertError } = await supabase
        .from('participants')
        .insert({
          event_id: '46869c0f-21ae-4d70-9865-5f72d87c1153',
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          email: form.email.trim(),
        })

      if (insertError) {
        setMessage({
          type: 'error',
          text:
            insertError.code === '23505'
              ? 'Questa email risulta già iscritta al Coffee Match.'
              : 'Non è stato possibile completare l’iscrizione. Riprova.',
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
    } catch {
      setMessage({
        type: 'error',
        text: 'Non è stato possibile collegarsi per completare l’iscrizione. Riprova.',
      })
    } finally {
      setIsSubmitting(false)
    }
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
            <strong>Le iscrizioni sono chiuse.</strong>
          </div>
        </div>
      ) : (
        <form className="signup-form" onSubmit={handleSubmit}>
          {!isEventReady && (
            <p className="form-message error" role="status">
              {isEventLoading
                ? 'Verifica dello stato delle iscrizioni…'
                : 'Non è stato possibile verificare lo stato delle iscrizioni.'}
            </p>
          )}
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
          <button
            className="button button-primary signup-button"
            disabled={isSubmitting || !isEventReady}
            type="submit"
          >
            {isSubmitting
              ? 'Iscrizione in corso...'
              : isEventLoading
                ? 'Verifica iscrizioni...'
                : 'Iscriviti al Coffee Match'}
            {!isSubmitting && isEventReady && <span aria-hidden="true">→</span>}
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

function OrganizerLogin({ message, onLogin, onClearMessage }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    await onLogin({ email: email.trim(), password })
    setIsSubmitting(false)
  }

  return (
    <main className="organizer-page auth-page">
      <section className="signup-card auth-card">
        <div className="section-eyebrow">Accesso riservato</div>
        <h1>Area organizzatore</h1>
        <p className="card-intro">
          Accedi con l&apos;account organizzatore per gestire questo evento.
        </p>
        <form className="signup-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              autoComplete="username"
              onChange={(event) => {
                setEmail(event.target.value)
                onClearMessage()
              }}
              required
              type="email"
              value={email}
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              autoComplete="current-password"
              onChange={(event) => {
                setPassword(event.target.value)
                onClearMessage()
              }}
              required
              type="password"
              value={password}
            />
          </label>
          {message && (
            <p className="form-message error" role="alert">
              {message}
            </p>
          )}
          <button
            className="button button-primary signup-button"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>
      </section>
    </main>
  )
}

function OrganizerAccessStatus({ message }) {
  return (
    <main className="organizer-page auth-page">
      <section className="signup-card auth-card" role="status">
        <div className="section-eyebrow">Area organizzatore</div>
        <p className="auth-status-message">{message}</p>
      </section>
    </main>
  )
}

function OrganizerView({
  eventStatus,
  isRegistrationOpen,
  matchingCompleted,
  onResetEvent,
  isResettingEvent,
  resetMessage,
  resetVerificationMessage,
  onLogout,
  onCloseRegistrations,
  isClosingRegistrations,
  closureMessage,
  canGenerateMatches,
  isGeneratingMatches,
  onGenerateMatches,
  matchGroups,
  matchesLoad,
  matchMessage,
  participants,
  participantsLoad,
}) {
  const participantsCount =
    participantsLoad.status === 'loaded'
      ? participants.length
      : participantsLoad.status === 'loading'
        ? '…'
        : '—'

  return (
    <main className="organizer-page">
      <div className="organizer-header">
        <div>
          <div className="section-eyebrow">Dietro le quinte</div>
          <h1>Area organizzatore</h1>
          <p>Gestisci le iscrizioni e prepara gli incontri dell&apos;evento.</p>
        </div>
        <div className="organizer-header-actions">
          <button
            className="button button-quiet"
            disabled={isResettingEvent}
            onClick={onResetEvent}
            type="button"
          >
            <span aria-hidden="true">↻</span>
            {isResettingEvent ? 'Reset in corso...' : 'Nuovo evento / Reset'}
          </button>
          <button className="button button-quiet" onClick={onLogout} type="button">
            Esci
          </button>
        </div>
      </div>

      {resetMessage && (
        <p
          className={`form-message ${resetMessage.type}`}
          role={resetMessage.type === 'error' ? 'alert' : 'status'}
        >
          {resetMessage.text}
        </p>
      )}
      {resetVerificationMessage && (
        <p className="form-message error" role="alert">
          {resetVerificationMessage}
        </p>
      )}

      <div className="organizer-stats">
        <article className="stat-card">
          <span className="stat-label">Partecipanti iscritti</span>
          <strong className="stat-number">{participantsCount}</strong>
          <span className="stat-caption">per questo evento</span>
        </article>
        <article className="stat-card status-stat">
          <span className="stat-label">Stato iscrizioni</span>
          <strong className={`status-pill ${isRegistrationOpen ? 'open' : 'closed'}`}>
            <span className="status-dot" />
            {eventStatus === 'loading'
              ? 'Verifica…'
              : eventStatus === 'error'
                ? 'Non disponibili'
                : isRegistrationOpen
                  ? 'Aperte'
                  : 'Chiuse'}
          </strong>
          <span className="stat-caption">
            {eventStatus === 'loading'
              ? 'Verifica dello stato evento in corso'
              : eventStatus === 'error'
                ? 'Ritorna alla pagina pubblica per riprovare'
                : isRegistrationOpen
                  ? 'Pronte ad accogliere nuovi partecipanti'
                  : 'Non è possibile aggiungere partecipanti'}
          </span>
        </article>
        <article className="stat-card">
          <span className="stat-label">Stato Coffee Match</span>
          <strong className="stat-number stat-number-label">
            {eventStatus !== 'loaded'
              ? 'Verifica…'
              : matchingCompleted
                ? 'Completato'
                : 'Non generati'}
          </strong>
          <span className="stat-caption">
            {matchingCompleted
              ? 'Gli abbinamenti sono stati salvati'
              : 'Gli abbinamenti non sono ancora stati generati'}
          </span>
        </article>
      </div>
      <section className="participants-section">
        <div className="organizer-section-heading">
          <div>
            <div className="section-eyebrow">La community</div>
            <h3>Partecipanti</h3>
          </div>
          <span className="participant-count">
            {participantsLoad.status === 'loaded'
              ? `${participants.length} iscritti`
              : participantsLoad.status === 'loading'
                ? 'Caricamento…'
                : 'Non disponibile'}
          </span>
        </div>
        {participantsLoad.status === 'loading' ? (
          <div className="empty-state" role="status">
            <strong>Caricamento partecipanti…</strong>
          </div>
        ) : participantsLoad.status === 'error' ? (
          <div className="empty-matches" role="alert">
            Non è stato possibile caricare i partecipanti.
          </div>
        ) : participants.length === 0 ? (
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

      {eventStatus === 'loaded' && isRegistrationOpen && (
        <div className="matching-panel">
          <div className="matching-copy">
            <span className="matching-icon" aria-hidden="true">✳</span>
            <div>
              <strong>Pronto a chiudere le iscrizioni?</strong>
              <p>Dopo la chiusura non sarà possibile registrare nuovi partecipanti.</p>
            </div>
          </div>
          <button
            className="button button-primary"
            disabled={isClosingRegistrations}
            onClick={onCloseRegistrations}
            type="button"
          >
            {isClosingRegistrations ? 'Chiusura in corso…' : 'Chiudi iscrizioni'}
          </button>
        </div>
      )}
      {closureMessage && (
        <p
          className={`form-message ${closureMessage.type}`}
          role={closureMessage.type === 'error' ? 'alert' : 'status'}
        >
          {closureMessage.text}
        </p>
      )}
      {matchingCompleted || matchGroups.length > 0 ? (
        <div className="matching-results">
          <div className="organizer-section-heading">
            <div>
              <div className="section-eyebrow">Gli incontri di oggi</div>
              <h3>
                {matchingCompleted
                  ? 'Coffee Match generati'
                  : 'Coffee Match già presenti'}
              </h3>
            </div>
            {matchesLoad.status === 'loaded' && (
              <span className="match-count">
                {matchGroups.length} {matchGroups.length === 1 ? 'gruppo' : 'gruppi'}
              </span>
            )}
          </div>
          {matchesLoad.status === 'loading' ||
          matchesLoad.status === 'idle' ? (
            <div className="empty-state" role="status">
              <strong>Caricamento Coffee Match…</strong>
            </div>
          ) : matchesLoad.status === 'error' ? (
            <div className="empty-matches" role="alert">
              Non è stato possibile caricare i Coffee Match.
            </div>
          ) : (
            <div className="match-grid">
              {matchGroups.map((group) => (
                <article className="match-card" key={group.groupNumber}>
                  <div className="match-card-top">
                    <span className="match-number">
                      {String(group.groupNumber).padStart(2, '0')}
                    </span>
                    <span className="match-coffee" aria-hidden="true">☕</span>
                  </div>
                  <div className="match-people">
                    {group.participants.map((participant) => (
                      <div className="match-person" key={participant.id}>
                        <strong>{participant.firstName} {participant.lastName}</strong>
                      </div>
                    ))}
                  </div>
                  {group.participants.length === 3 && (
                    <span className="group-note">Un tavolo da tre</span>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      ) : (
        eventStatus === 'loaded' &&
        !isRegistrationOpen &&
        !matchingCompleted && (
          <div className="matching-panel">
            <div className="matching-copy">
              <span className="matching-icon" aria-hidden="true">✳</span>
              <div>
                <strong>Coffee Match</strong>
                <p>
                  {participantsLoad.status === 'loaded' &&
                  participants.length < 2
                    ? 'Servono almeno due partecipanti per generare i match.'
                    : 'Le iscrizioni sono chiuse. È possibile preparare gli abbinamenti.'}
                </p>
              </div>
            </div>
            {canGenerateMatches &&
              matchesLoad.status !== 'loaded' &&
              matchGroups.length === 0 && (
              <button
                className="button button-primary"
                disabled={isGeneratingMatches}
                onClick={onGenerateMatches}
                type="button"
              >
                {isGeneratingMatches
                  ? 'Generazione in corso…'
                  : 'Genera Coffee Match'}
              </button>
            )}
          </div>
        )
      )}
      {matchMessage && (
        <p
          className={`form-message ${matchMessage.type}`}
          role={matchMessage.type === 'error' ? 'alert' : 'status'}
        >
          {matchMessage.text}
        </p>
      )}
    </main>
  )
}

function App() {
  const [participants, setParticipants] = useState([])
  const [participantsLoad, setParticipantsLoad] = useState({
    userId: null,
    status: 'idle',
  })
  const [matchGroups, setMatchGroups] = useState([])
  const [matchesLoad, setMatchesLoad] = useState({
    userId: null,
    status: 'idle',
  })
  const [isGeneratingMatches, setIsGeneratingMatches] = useState(false)
  const [matchMessage, setMatchMessage] = useState(null)
  const [isOrganizerView, setIsOrganizerView] = useState(false)
  const [supabaseClient, setSupabaseClient] = useState(null)
  const [eventState, setEventState] = useState({
    status: 'loading',
    registrationOpen: null,
    matchingCompleted: null,
  })
  const [isClosingRegistrations, setIsClosingRegistrations] = useState(false)
  const [closureMessage, setClosureMessage] = useState(null)
  const [isResettingEvent, setIsResettingEvent] = useState(false)
  const [resetMessage, setResetMessage] = useState(null)
  const [resetVerificationMessage, setResetVerificationMessage] = useState('')
  const [authSession, setAuthSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [authSetupError, setAuthSetupError] = useState(false)
  const [ownerCheck, setOwnerCheck] = useState({
    userId: null,
    status: 'idle',
  })
  const [authNotice, setAuthNotice] = useState('')
  const [supabaseDiagnostic, setSupabaseDiagnostic] = useState({
    type: 'loading',
    message: 'Verifica connessione...',
  })
  const isClosingRegistrationsRef = useRef(false)
  const isGeneratingMatchesRef = useRef(false)
  const isResettingEventRef = useRef(false)

  useEffect(() => {
    let active = true
    let subscription

    async function initializeAuth() {
      try {
        const { supabase } = await import('./lib/supabase.js')
        if (!active) return

        setSupabaseClient(supabase)
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!active) return
          setAuthSession(session)
          setAuthReady(true)
          if (!session) {
            setOwnerCheck({ userId: null, status: 'idle' })
            setMatchGroups([])
            setMatchesLoad({ userId: null, status: 'idle' })
            setMatchMessage(null)
          }
        })
        subscription = data.subscription

        const { data: sessionData, error } = await supabase.auth.getSession()
        if (!active) return

        if (error) {
          setAuthSetupError(true)
          setAuthReady(true)
          return
        }

        setAuthSession(sessionData.session)
        setAuthReady(true)
      } catch {
        if (!active) return
        setAuthSetupError(true)
        setAuthReady(true)
      }
    }

    initializeAuth()

    return () => {
      active = false
      subscription?.unsubscribe()
    }
  }, [])

  const authenticatedUserId = authSession?.user?.id
  const ownerStatus = authenticatedUserId
    ? ownerCheck.userId === authenticatedUserId
      ? ownerCheck.status
      : 'checking'
    : 'idle'

  useEffect(() => {
    if (!supabaseClient || !authenticatedUserId) return

    let active = true

    async function verifyEventOwner() {
      const { data, error } = await supabaseClient
        .from('events')
        .select('owner_id')
        .eq('id', '46869c0f-21ae-4d70-9865-5f72d87c1153')
        .maybeSingle()

      if (!active) return

      if (error || !data) {
        await denyEventAccess(
          'Non è stato possibile verificare l’autorizzazione per questo evento.',
        )
        return
      }

      if (data.owner_id !== authenticatedUserId) {
        await denyEventAccess('Non sei autorizzato a gestire questo evento.')
        return
      }

      setAuthNotice('')
      setOwnerCheck({ userId: authenticatedUserId, status: 'authorized' })
      setParticipants([])
      setParticipantsLoad({ userId: authenticatedUserId, status: 'loading' })
      setMatchGroups([])
      setMatchesLoad({ userId: authenticatedUserId, status: 'idle' })
      setMatchMessage(null)

      try {
        const { data: participantRows, error: participantsError } =
          await supabaseClient
            .from('participants')
            .select('id, first_name, last_name, email, created_at')
            .eq('event_id', '46869c0f-21ae-4d70-9865-5f72d87c1153')
            .order('created_at', { ascending: true })

        if (!active) return

        if (participantsError) {
          setParticipantsLoad({
            userId: authenticatedUserId,
            status: 'error',
          })
          return
        }

        setParticipants(
          participantRows.map((participant) => ({
            id: participant.id,
            firstName: participant.first_name,
            lastName: participant.last_name,
            email: participant.email,
            createdAt: participant.created_at,
          })),
        )
        setParticipantsLoad({ userId: authenticatedUserId, status: 'loaded' })
      } catch {
        if (!active) return
        setParticipantsLoad({
          userId: authenticatedUserId,
          status: 'error',
        })
      }
    }

    async function denyEventAccess(message) {
      if (!active) return
      setOwnerCheck({ userId: authenticatedUserId, status: 'denied' })
      setAuthNotice(message)

      try {
        const { error } = await supabaseClient.auth.signOut()
        if (error && active) {
          setAuthNotice(
            `${message} La sessione non è stata terminata; riprova a uscire.`,
          )
        }
      } catch {
        if (active) {
          setAuthNotice(
            `${message} La sessione non è stata terminata; riprova a uscire.`,
          )
        }
      }
    }

    verifyEventOwner().catch(() => {
      denyEventAccess(
        'Non è stato possibile verificare l’autorizzazione per questo evento.',
      )
    })

    return () => {
      active = false
    }
  }, [supabaseClient, authenticatedUserId])

  useEffect(() => {
    if (!supabaseClient) return
    let active = true

    async function loadEventState() {
      try {
        const { data, error } = await supabaseClient
          .from('events')
          .select('id, name, registration_open, matching_completed')
          .eq('id', '46869c0f-21ae-4d70-9865-5f72d87c1153')
          .maybeSingle()

        if (!active) return

        if (error) {
          setEventState({
            status: 'error',
            registrationOpen: null,
            matchingCompleted: null,
          })
          setSupabaseDiagnostic({
            type: 'error',
            message:
              'Lettura dell’evento non riuscita. Verifica connessione e permessi.',
          })
          return
        }

        if (!data) {
          setEventState({
            status: 'error',
            registrationOpen: null,
            matchingCompleted: null,
          })
          setSupabaseDiagnostic({
            type: 'error',
            message: 'Evento Coffee Match non trovato.',
          })
          return
        }

        setEventState({
          status: 'loaded',
          registrationOpen: data.registration_open,
          matchingCompleted: data.matching_completed,
        })
        setSupabaseDiagnostic({
          type:
            data.registration_open === true &&
            data.matching_completed === false
              ? 'success'
              : 'error',
          message:
            data.registration_open === true &&
            data.matching_completed === false
            ? 'Supabase connesso - Coffee Match - Iscrizioni aperte'
            : 'Connessione stabilita, ma le iscrizioni per Coffee Match sono chiuse.',
        })
      } catch {
        if (!active) return
        setEventState({
          status: 'error',
          registrationOpen: null,
          matchingCompleted: null,
        })
        setSupabaseDiagnostic({
          type: 'error',
          message:
            'Connessione Supabase non riuscita. Verifica la configurazione richiesta.',
        })
      }
    }

    loadEventState()

    return () => {
      active = false
    }
  }, [supabaseClient, isOrganizerView])

  useEffect(() => {
    if (
      !supabaseClient ||
      !authenticatedUserId ||
      ownerStatus !== 'authorized' ||
      ownerCheck.userId !== authenticatedUserId ||
      eventState.status !== 'loaded' ||
      eventState.matchingCompleted !== true ||
      participantsLoad.userId !== authenticatedUserId ||
      participantsLoad.status !== 'loaded' ||
      isGeneratingMatchesRef.current ||
      (matchesLoad.userId === authenticatedUserId &&
        matchesLoad.status !== 'idle')
    ) {
      return
    }

    let active = true

    async function loadPersistedMatches() {
      try {
        const { data, error } = await supabaseClient
          .from('matches')
          .select('id, group_number, participant_id, created_at')
          .eq('event_id', eventId)
          .order('group_number', { ascending: true })
          .order('created_at', { ascending: true })

        if (!active) return

        if (error || !data || data.length === 0) {
          setMatchesLoad({ userId: authenticatedUserId, status: 'error' })
          setMatchMessage({
            type: 'error',
            text: 'Non è stato possibile caricare i Coffee Match.',
          })
          return
        }

        try {
          setMatchGroups(groupPersistedMatches(data, participants))
          setMatchesLoad({ userId: authenticatedUserId, status: 'loaded' })
          setMatchMessage(null)
        } catch {
          setMatchesLoad({ userId: authenticatedUserId, status: 'error' })
          setMatchMessage({
            type: 'error',
            text: 'Non è stato possibile caricare i Coffee Match.',
          })
        }
      } catch {
        if (!active) return
        setMatchesLoad({ userId: authenticatedUserId, status: 'error' })
        setMatchMessage({
          type: 'error',
          text: 'Non è stato possibile caricare i Coffee Match.',
        })
      }
    }

    loadPersistedMatches()

    return () => {
      active = false
    }
  }, [
    supabaseClient,
    authenticatedUserId,
    ownerStatus,
    ownerCheck.userId,
    eventState.status,
    eventState.matchingCompleted,
    participantsLoad.userId,
    participantsLoad.status,
    matchesLoad.userId,
    matchesLoad.status,
    participants,
  ])

  function handleSignup(participant) {
    setParticipants((currentParticipants) => [...currentParticipants, participant])
  }

  async function handleResetEvent() {
    if (
      isResettingEventRef.current ||
      !supabaseClient ||
      !authSession ||
      !authenticatedUserId ||
      ownerStatus !== 'authorized' ||
      ownerCheck.userId !== authenticatedUserId
    ) {
      return
    }

    const confirmed = window.confirm(
      'ATTENZIONE: questa operazione cancellerà definitivamente tutti i partecipanti e tutti i Coffee Match dell’evento corrente. L’evento tornerà ad accettare nuove iscrizioni. Vuoi continuare?',
    )
    if (!confirmed) return

    isResettingEventRef.current = true
    setIsResettingEvent(true)
    setResetMessage(null)
    setResetVerificationMessage('')

    try {
      const { error } = await supabaseClient.rpc('reset_coffee_event', {
        p_event_id: eventId,
      })

      if (error) {
        setResetMessage({
          type: 'error',
          text: 'Non è stato possibile resettare l’evento.',
        })
        return
      }

      setParticipants([])
      setParticipantsLoad({ userId: authenticatedUserId, status: 'loading' })
      setMatchGroups([])
      setMatchesLoad({ userId: authenticatedUserId, status: 'loading' })
      setMatchMessage(null)
      setClosureMessage(null)
      setEventState({
        status: 'loaded',
        registrationOpen: true,
        matchingCompleted: false,
      })
      setResetMessage({
        type: 'success',
        text: 'Evento resettato. Le iscrizioni sono nuovamente aperte.',
      })

      try {
        const [eventResult, participantsResult, matchesResult] =
          await Promise.all([
            supabaseClient
              .from('events')
              .select('registration_open, matching_completed')
              .eq('id', eventId)
              .maybeSingle(),
            supabaseClient
              .from('participants')
              .select('id, first_name, last_name, email, created_at')
              .eq('event_id', eventId)
              .order('created_at', { ascending: true }),
            supabaseClient
              .from('matches')
              .select('id, group_number, participant_id, created_at')
              .eq('event_id', eventId)
              .order('group_number', { ascending: true })
              .order('created_at', { ascending: true }),
          ])

        let verificationFailed = false

        if (eventResult.error || !eventResult.data) {
          setEventState({
            status: 'error',
            registrationOpen: null,
            matchingCompleted: null,
          })
          verificationFailed = true
        } else {
          setEventState({
            status: 'loaded',
            registrationOpen: eventResult.data.registration_open,
            matchingCompleted: eventResult.data.matching_completed,
          })
        }

        if (participantsResult.error || !participantsResult.data) {
          setParticipantsLoad({
            userId: authenticatedUserId,
            status: 'error',
          })
          verificationFailed = true
        } else {
          const refreshedParticipants = participantsResult.data.map(
            (participant) => ({
              id: participant.id,
              firstName: participant.first_name,
              lastName: participant.last_name,
              email: participant.email,
              createdAt: participant.created_at,
            }),
          )
          setParticipants(refreshedParticipants)
          setParticipantsLoad({ userId: authenticatedUserId, status: 'loaded' })

          if (matchesResult.error || !matchesResult.data) {
            setMatchGroups([])
            setMatchesLoad({ userId: authenticatedUserId, status: 'error' })
            verificationFailed = true
          } else {
            try {
              setMatchGroups(
                groupPersistedMatches(
                  matchesResult.data,
                  refreshedParticipants,
                ),
              )
              setMatchesLoad({ userId: authenticatedUserId, status: 'loaded' })
            } catch {
              setMatchGroups([])
              setMatchesLoad({ userId: authenticatedUserId, status: 'error' })
              verificationFailed = true
            }
          }
        }

        if (participantsResult.error || !participantsResult.data) {
          setMatchGroups([])
          setMatchesLoad({ userId: authenticatedUserId, status: 'error' })
        }

        if (verificationFailed) {
          setResetVerificationMessage(
            'Reset completato, ma non è stato possibile verificare tutti i dati aggiornati.',
          )
        }
      } catch {
        setEventState({
          status: 'error',
          registrationOpen: null,
          matchingCompleted: null,
        })
        setParticipantsLoad({ userId: authenticatedUserId, status: 'error' })
        setParticipants([])
        setMatchGroups([])
        setMatchesLoad({ userId: authenticatedUserId, status: 'error' })
        setResetVerificationMessage(
          'Reset completato, ma non è stato possibile verificare tutti i dati aggiornati.',
        )
      }
    } catch {
      setResetMessage({
        type: 'error',
        text: 'Non è stato possibile resettare l’evento.',
      })
    } finally {
      isResettingEventRef.current = false
      setIsResettingEvent(false)
    }
  }

  async function handleCloseRegistrations() {
    if (
      isClosingRegistrationsRef.current ||
      !supabaseClient ||
      !authenticatedUserId ||
      ownerStatus !== 'authorized' ||
      ownerCheck.userId !== authenticatedUserId ||
      eventState.status !== 'loaded' ||
      eventState.registrationOpen !== true ||
      eventState.matchingCompleted !== false
    ) {
      return
    }

    const confirmed = window.confirm(
      'Vuoi chiudere le iscrizioni? Dopo la chiusura non sarà possibile registrare nuovi partecipanti.',
    )
    if (!confirmed) return

    isClosingRegistrationsRef.current = true
    setIsClosingRegistrations(true)
    setClosureMessage(null)

    try {
      const { data, error } = await supabaseClient
        .from('events')
        .update({ registration_open: false })
        .eq('id', '46869c0f-21ae-4d70-9865-5f72d87c1153')
        .eq('owner_id', authenticatedUserId)
        .select('id')
        .maybeSingle()

      if (error || !data) {
        setClosureMessage({
          type: 'error',
          text: 'Non è stato possibile chiudere le iscrizioni.',
        })
        return
      }

      setEventState((current) => ({
        ...current,
        status: 'loaded',
        registrationOpen: false,
        matchingCompleted: false,
      }))
      setSupabaseDiagnostic({
        type: 'error',
        message: 'Connessione stabilita, ma le iscrizioni per Coffee Match sono chiuse.',
      })
      setClosureMessage({
        type: 'success',
        text: 'Iscrizioni chiuse.',
      })
    } catch {
      setClosureMessage({
        type: 'error',
        text: 'Non è stato possibile chiudere le iscrizioni.',
      })
    } finally {
      isClosingRegistrationsRef.current = false
      setIsClosingRegistrations(false)
    }
  }

  async function handleGenerateMatches() {
    if (
      isGeneratingMatchesRef.current ||
      !supabaseClient ||
      !authenticatedUserId ||
      ownerStatus !== 'authorized' ||
      ownerCheck.userId !== authenticatedUserId ||
      eventState.status !== 'loaded' ||
      eventState.registrationOpen !== false ||
      eventState.matchingCompleted !== false ||
      participantsLoad.userId !== authenticatedUserId ||
      participantsLoad.status !== 'loaded' ||
      participants.length < 2
    ) {
      return
    }

    isGeneratingMatchesRef.current = true
    const confirmed = window.confirm(
      'Vuoi generare i Coffee Match? Gli abbinamenti verranno salvati e non potranno essere rigenerati accidentalmente.',
    )
    if (!confirmed) {
      isGeneratingMatchesRef.current = false
      return
    }

    setIsGeneratingMatches(true)
    setMatchMessage(null)
    setMatchGroups([])
    setMatchesLoad({ userId: authenticatedUserId, status: 'loading' })

    try {
      const { data: participantRows, error: participantsError } =
        await supabaseClient
          .from('participants')
          .select('id, first_name, last_name')
          .eq('event_id', eventId)

      if (participantsError || !participantRows || participantRows.length < 2) {
        setMatchMessage({
          type: 'error',
          text: 'Non è stato possibile generare i Coffee Match.',
        })
        setMatchesLoad({ userId: authenticatedUserId, status: 'error' })
        return
      }

      const matchingParticipants = participantRows.map((participant) => ({
        id: participant.id,
        firstName: participant.first_name,
        lastName: participant.last_name,
      }))

      const { data: existingMatches, error: existingMatchesError } =
        await supabaseClient
          .from('matches')
          .select('id, group_number, participant_id, created_at')
          .eq('event_id', eventId)
          .order('group_number', { ascending: true })
          .order('created_at', { ascending: true })

      if (existingMatchesError || !existingMatches) {
        setMatchMessage({
          type: 'error',
          text: 'Non è stato possibile generare i Coffee Match.',
        })
        setMatchesLoad({ userId: authenticatedUserId, status: 'error' })
        return
      }

      if (existingMatches.length > 0) {
        setMatchGroups(
          groupPersistedMatches(existingMatches, matchingParticipants),
        )
        setMatchesLoad({ userId: authenticatedUserId, status: 'loaded' })
        setMatchMessage({
          type: 'info',
          text: 'Esistono già Coffee Match per questo evento. Sono stati caricati senza rigenerarli.',
        })
        return
      }

      const matchRows = createMatchRows(matchingParticipants)
      if (matchRows.length !== matchingParticipants.length) {
        setMatchMessage({
          type: 'error',
          text: 'Non è stato possibile generare i Coffee Match.',
        })
        setMatchesLoad({ userId: authenticatedUserId, status: 'error' })
        return
      }

      const { error: rpcError } = await supabaseClient.rpc(
        'save_coffee_matches',
        {
          p_event_id: eventId,
          p_matches: matchRows,
        },
      )

      if (rpcError) {
        setMatchMessage({
          type: 'error',
          text: 'Non è stato possibile generare i Coffee Match.',
        })
        setMatchesLoad({ userId: authenticatedUserId, status: 'error' })
        return
      }

      setEventState((current) => ({
        ...current,
        matchingCompleted: true,
      }))

      const { data: savedMatches, error: savedMatchesError } =
        await supabaseClient
          .from('matches')
          .select('id, group_number, participant_id, created_at')
          .eq('event_id', eventId)
          .order('group_number', { ascending: true })
          .order('created_at', { ascending: true })

      if (savedMatchesError || !savedMatches || savedMatches.length === 0) {
        setMatchesLoad({ userId: authenticatedUserId, status: 'error' })
        setMatchMessage({
          type: 'error',
          text: 'Coffee Match generati, ma non è stato possibile caricarli.',
        })
        return
      }

      setMatchGroups(groupPersistedMatches(savedMatches, matchingParticipants))
      setMatchesLoad({ userId: authenticatedUserId, status: 'loaded' })
      setMatchMessage({
        type: 'success',
        text: 'Coffee Match generati e salvati.',
      })
    } catch {
      setMatchMessage({
        type: 'error',
        text: 'Non è stato possibile generare i Coffee Match.',
      })
      setMatchesLoad({ userId: authenticatedUserId, status: 'error' })
    } finally {
      isGeneratingMatchesRef.current = false
      setIsGeneratingMatches(false)
    }
  }

  async function handleOrganizerLogin(credentials) {
    if (!supabaseClient || authSetupError) {
      setAuthNotice('Accesso non disponibile al momento. Riprova più tardi.')
      return
    }

    setAuthNotice('')
    try {
      const { error } =
        await supabaseClient.auth.signInWithPassword(credentials)
      if (error) setAuthNotice('Email o password non corretti.')
    } catch {
      setAuthNotice('Email o password non corretti.')
    }
  }

  async function handleLogout() {
    if (!supabaseClient) return

    try {
      const { error } = await supabaseClient.auth.signOut()
      if (error) {
        setAuthNotice('Non è stato possibile completare il logout. Riprova.')
        return
      }

      setAuthNotice('')
      setEventState((current) => ({ ...current, status: 'loading' }))
      setIsOrganizerView(false)
    } catch {
      setAuthNotice('Non è stato possibile completare il logout. Riprova.')
    }
  }

  const isRegistrationOpen =
    eventState.status === 'loaded' &&
    eventState.registrationOpen === true &&
    eventState.matchingCompleted === false
  const isEventClosed =
    eventState.status === 'loaded' &&
    (eventState.registrationOpen === false ||
      eventState.matchingCompleted === true)
  const currentMatchesLoad =
    matchesLoad.userId === authenticatedUserId
      ? matchesLoad
      : { userId: authenticatedUserId, status: 'idle' }
  const currentMatchGroups =
    matchesLoad.userId === authenticatedUserId ? matchGroups : []
  const canGenerateMatches =
    Boolean(authSession) &&
    ownerStatus === 'authorized' &&
    ownerCheck.userId === authenticatedUserId &&
    eventState.status === 'loaded' &&
    eventState.registrationOpen === false &&
    eventState.matchingCompleted === false &&
    participantsLoad.userId === authenticatedUserId &&
    participantsLoad.status === 'loaded' &&
    participants.length >= 2 &&
    currentMatchesLoad.status !== 'loaded'

  function handleViewToggle() {
    setEventState((current) => ({ ...current, status: 'loading' }))
    setClosureMessage(null)
    setIsOrganizerView((current) => !current)
  }

  function handleReturnToPublic(event) {
    event.preventDefault()
    setEventState((current) => ({ ...current, status: 'loading' }))
    setClosureMessage(null)
    setIsOrganizerView(false)
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a
          aria-label="Coffee Match, pagina principale"
          className="brand"
          href="#"
          onClick={handleReturnToPublic}
        >
          <CoffeeMark />
          <span>coffee<span className="brand-accent">match</span></span>
        </a>
        <div className="header-right">
          <span className="event-label">
            <span className={`status-dot ${isEventClosed ? 'dot-closed' : ''}`} />
            {isEventClosed ? 'Evento concluso' : 'Evento in corso'}
          </span>
          <button
            aria-pressed={isOrganizerView}
            className={`organizer-toggle ${isOrganizerView ? 'selected' : ''}`}
            onClick={handleViewToggle}
            type="button"
          >
            {isOrganizerView ? 'Torna alla pagina' : 'Area organizzatore'}
            <span aria-hidden="true">{isOrganizerView ? '↗' : '→'}</span>
          </button>
        </div>
      </header>

      <aside
        aria-live="polite"
        className={`connection-diagnostic ${supabaseDiagnostic.type}`}
      >
        <strong>Connessione Supabase</strong>
        <span>{supabaseDiagnostic.message}</span>
      </aside>

      {isOrganizerView ? (
        !authReady ? (
          <OrganizerAccessStatus message="Verifica della sessione in corso..." />
        ) : authSession ? (
          ownerStatus === 'authorized' &&
          ownerCheck.userId === authenticatedUserId ? (
            <OrganizerView
              eventStatus={eventState.status}
              isRegistrationOpen={isRegistrationOpen}
              matchingCompleted={eventState.matchingCompleted === true}
              onResetEvent={handleResetEvent}
              isResettingEvent={isResettingEvent}
              resetMessage={resetMessage}
              resetVerificationMessage={resetVerificationMessage}
              onLogout={handleLogout}
              onCloseRegistrations={handleCloseRegistrations}
              isClosingRegistrations={isClosingRegistrations}
              closureMessage={closureMessage}
              canGenerateMatches={canGenerateMatches}
              isGeneratingMatches={isGeneratingMatches}
              onGenerateMatches={handleGenerateMatches}
              matchGroups={currentMatchGroups}
              matchesLoad={currentMatchesLoad}
              matchMessage={matchMessage}
              participants={participants}
              participantsLoad={
                participantsLoad.userId === authenticatedUserId
                  ? participantsLoad
                  : { userId: authenticatedUserId, status: 'loading' }
              }
            />
          ) : (
            <OrganizerAccessStatus
              message={
                ownerStatus === 'checking'
                  ? 'Verifica dell’autorizzazione in corso...'
                  : authNotice || 'Verifica dell’autorizzazione non riuscita.'
              }
            />
          )
        ) : (
          <OrganizerLogin
            message={
              authNotice ||
              (authSetupError
                ? 'Accesso non disponibile al momento. Riprova più tardi.'
                : '')
            }
            onClearMessage={() => setAuthNotice('')}
            onLogin={handleOrganizerLogin}
          />
        )
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
            isClosed={isEventClosed}
            isEventReady={isRegistrationOpen}
            isEventLoading={eventState.status === 'loading'}
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
