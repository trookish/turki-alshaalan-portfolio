import { useI18n } from '../i18n/LanguageContext'
import { LinkedInBtn, Section } from '../components/Section'
import { useOverlay } from '../ui/OverlayContext'
import { certifications } from '../data/certifications'
import { linkedinDetails } from '../data/site'

export function Certifications() {
  const { t, b } = useI18n()
  const { openCert } = useOverlay()

  return (
    <Section id="certifications" num="06" titleKey="certs_title" subtitleKey="certs_subtitle">
      <div className="certs-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {certifications.map((cert) => (
          <article key={cert.id} className="cert-card window flex flex-col overflow-hidden">
            <div className="cert-media aspect-[16/10] overflow-hidden border-b border-line bg-inset">
              <img src={cert.image} alt={b(cert.title)} loading="lazy" />
            </div>
            <div className="flex flex-1 flex-col gap-1 p-3.5">
              <h3 className="font-mono text-sm font-bold leading-snug text-ink">{b(cert.title)}</h3>
              <p className="font-mono text-xs text-green">{b(cert.issuer)}</p>
              <p className="font-mono text-xs text-ink3">{b(cert.date)}</p>
              <div className="cert-actions mt-auto pt-3">
                <button type="button" className="btn w-full !py-2 !text-xs" onClick={() => openCert(cert)}>
                  👁 {t('cert_view')}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <LinkedInBtn href={linkedinDetails('certifications')} labelKey="linkedin_certs" />
    </Section>
  )
}
