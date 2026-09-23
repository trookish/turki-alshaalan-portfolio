import { useState, type FormEvent } from 'react'
import { useI18n } from '../i18n/LanguageContext'
import { Section } from '../components/Section'
import { profile } from '../data/profile'

type Status = 'idle' | 'sending' | 'ok' | 'err'

interface Item {
  labelKey: 'contact_email' | 'contact_phone' | 'contact_location' | 'contact_linkedin' | 'contact_github' | 'contact_itch'
  value: string
  href?: string
  icon: 'mail' | 'phone' | 'pin' | 'in' | 'git' | 'itch'
}

const items: Item[] = [
  { labelKey: 'contact_email', value: profile.email, href: `mailto:${profile.email}`, icon: 'mail' },
  { labelKey: 'contact_phone', value: profile.phone, href: profile.phoneHref, icon: 'phone' },
  { labelKey: 'contact_location', value: profile.location.en, icon: 'pin' },
  { labelKey: 'contact_linkedin', value: 'linkedin.com/in/turki-alshaalan', href: profile.linkedin, icon: 'in' },
  { labelKey: 'contact_github', value: 'github.com/trookish', href: profile.github, icon: 'git' },
  { labelKey: 'contact_itch', value: 'trookish.itch.io', href: profile.itch, icon: 'itch' },
]

function Icon({ name }: { name: Item['icon'] }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, 'aria-hidden': true } as const
  switch (name) {
    case 'mail':
      return (
        <svg {...common}>
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-10 6L2 7" />
        </svg>
      )
    case 'phone':
      return (
        <svg {...common}>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      )
    case 'pin':
      return (
        <svg {...common}>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      )
    case 'in':
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM10 9h3.8v1.7h.05c.53-.95 1.83-1.95 3.76-1.95C21.4 8.75 22 11.06 22 14.06V21h-4v-6.2c0-1.48-.03-3.38-2.06-3.38-2.07 0-2.39 1.6-2.39 3.27V21h-4z" />
        </svg>
      )
    case 'git':
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M12 2C6.48 2 2 6.58 2 12.23c0 4.51 2.87 8.34 6.84 9.69.5.09.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.45-1.19-1.11-1.51-1.11-1.51-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.57 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.93c.85 0 1.71.12 2.51.35 1.9-1.33 2.74-1.05 2.74-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49A10.02 10.02 0 0 0 22 12.23C22 6.58 17.52 2 12 2z" />
        </svg>
      )
    case 'itch':
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M3.12 1.34C2.08 1.96.02 4.33 0 4.95v1.03c0 1.3 1.22 2.45 2.33 2.45 1.33 0 2.44-1.1 2.44-2.41 0 1.31 1.07 2.41 2.4 2.41 1.33 0 2.36-1.1 2.36-2.41 0 1.31 1.14 2.41 2.47 2.41h.02c1.33 0 2.47-1.1 2.47-2.41 0 1.31 1.03 2.41 2.36 2.41 1.33 0 2.4-1.1 2.4-2.41 0 1.31 1.1 2.41 2.43 2.41C22.78 8.43 24 7.28 24 5.98V4.95c-.02-.62-2.08-2.99-3.13-3.61-3.25-.11-5.51-.13-8.87-.13-3.36 0-5.61.02-8.87.13zM12 12.71l-2.52 2.66 1.4-.06v1.22c0 .06.56.03 1.12 0 .56-.03 1.12.05 1.12-.01v-1.22l1.4.06C14.14 14.68 12 12.71 12 12.71z" />
        </svg>
      )
  }
}

async function sendViaFormSubmit(payload: {
  name: string
  email: string
  subject: string
  message: string
}) {
  const endpoint = `https://formsubmit.co/ajax/${encodeURIComponent(profile.email)}`
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      _subject: `[portfolio] ${payload.subject}`,
      _template: 'table',
      _captcha: 'false',
      Name: payload.name,
      Email: payload.email,
      Subject: payload.subject,
      Message: payload.message,
    }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = (await res.json().catch(() => ({}))) as { success?: string | boolean }
  if (data.success === 'false' || data.success === false) throw new Error('submit rejected')
}

function buildMailto(name: string, email: string, subject: string, message: string) {
  const body = [
    message,
    '',
    '—',
    `From: ${name}`,
    `Reply-to: ${email}`,
  ].join('\n')
  return `mailto:${profile.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export function Contact() {
  const { t, b } = useI18n()
  const [copied, setCopied] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(profile.email)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  const openMailApp = () => {
    window.location.href = buildMailto(name.trim(), email.trim(), subject.trim(), message.trim())
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (status === 'sending') return
    if (honeypot) return

    const payload = {
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim() || 'Portfolio contact',
      message: message.trim(),
    }
    if (!payload.name || !payload.email || !payload.message) {
      setStatus('err')
      return
    }

    setStatus('sending')
    try {
      await sendViaFormSubmit(payload)
      setStatus('ok')
      setName('')
      setEmail('')
      setSubject('')
      setMessage('')
    } catch {
      setStatus('err')
    }
  }

  const localizedItems = items.map((item) =>
    item.labelKey === 'contact_location' ? { ...item, value: b(profile.location) } : item,
  )

  return (
    <Section id="contact" num="08" titleKey="contact_title" subtitleKey="contact_subtitle">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="window">
          <div className="window-bar">
            <span className="window-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="window-title">{t('contact_details')}</span>
          </div>
          <div className="grid gap-0 sm:grid-cols-2">
            {localizedItems.map((item) => (
              <div
                key={item.labelKey}
                className="contact-item flex items-start gap-3 border-b border-line p-4 last:border-b-0 sm:odd:border-e"
              >
                <span className="mt-0.5 text-green">
                  <Icon name={item.icon} />
                </span>
                <div className="min-w-0">
                  <div className="font-mono text-[0.68rem] uppercase tracking-wider text-ink3">
                    {t(item.labelKey)}
                  </div>
                  {item.href ? (
                    <a
                      href={item.href}
                      target={item.href.startsWith('http') ? '_blank' : undefined}
                      rel="noopener noreferrer"
                      className="block truncate font-mono text-sm text-ink hover:text-green"
                    >
                      {item.value}
                    </a>
                  ) : (
                    <span className="block font-mono text-sm text-ink">{item.value}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 border-t border-line p-4">
            <a href={profile.cv} download={profile.cvDownloadName} className="btn btn-primary">
              ⤓ {t('contact_download_cv')}
            </a>
            <button type="button" className="btn" onClick={copyEmail}>
              {copied ? t('contact_copied') : `⧉ ${t('contact_copy_email')}`}
            </button>
          </div>
        </div>

        <div className="window contact-form-window">
          <div className="window-bar">
            <span className="window-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="window-title">{t('contact_form_title')}</span>
          </div>
          <form className="contact-form" onSubmit={onSubmit} noValidate={false}>
            <div className="form-row">
              <div className="field">
                <label htmlFor="cf-name">{t('contact_form_name')}</label>
                <input
                  id="cf-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ada Lovelace"
                />
              </div>
              <div className="field">
                <label htmlFor="cf-email">{t('contact_form_email')}</label>
                <input
                  id="cf-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={200}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="cf-subject">{t('contact_form_subject')}</label>
              <input
                id="cf-subject"
                name="subject"
                type="text"
                required
                maxLength={200}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Project inquiry"
              />
            </div>

            <div className="field">
              <label htmlFor="cf-message">{t('contact_form_message')}</label>
              <textarea
                id="cf-message"
                name="message"
                required
                maxLength={5000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="…"
              />
            </div>

            <div className="sr-only-field" aria-hidden="true">
              <label htmlFor="cf-website">Website</label>
              <input
                id="cf-website"
                name="_gotcha"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={status === 'sending'}>
                {status === 'sending' ? t('contact_form_sending') : t('contact_form_send')}
              </button>
              <button type="button" className="btn" onClick={openMailApp}>
                ✉ {t('contact_form_mail')}
              </button>
            </div>

            <p className="form-hint">{t('contact_form_alt')}</p>

            {status === 'ok' && (
              <p className="form-status ok" role="status">
                ✓ {t('contact_form_ok')}
              </p>
            )}
            {status === 'err' && (
              <p className="form-status err" role="alert">
                ✕ {t('contact_form_err')}
              </p>
            )}
          </form>
        </div>
      </div>
    </Section>
  )
}
