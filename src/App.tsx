import { useEffect, useMemo } from 'react'
import { LanguageProvider, useI18n } from './i18n/LanguageContext'
import { ThemeProvider } from './theme/ThemeProvider'
import { SoundProvider } from './features/sound/SoundProvider'
import { OverlayProvider, useOverlay } from './ui/OverlayContext'
import { NavBar } from './components/NavBar'
import { StatusBar } from './components/StatusBar'
import { CommandPalette } from './components/CommandPalette'
import { ShowcaseModal } from './components/ShowcaseModal'
import { CertModal } from './components/CertModal'
import { ImageViewer } from './components/ImageViewer'
import { SoundFab } from './components/SoundFab'
import { Hero } from './sections/Hero'
import { About } from './sections/About'
import { Projects } from './sections/Projects'
import { Experience } from './sections/Experience'
import { Skills } from './sections/Skills'
import { Education } from './sections/Education'
import { Certifications } from './sections/Certifications'
import { Achievements } from './sections/Achievements'
import { Contact } from './sections/Contact'
import { Footer } from './sections/Footer'
import { GameModal } from './features/game/GameModal'
import { useReveal } from './hooks/usePage'

function Pages() {
  const overlay = useOverlay()
  useReveal([])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        overlay.setPaletteOpen(!overlay.paletteOpen)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [overlay])

  return (
    <>
      <NavBar onOpenPalette={() => overlay.setPaletteOpen(true)} onPlayGame={() => overlay.setGameOpen(true)} />
      <main>
        <Hero />
        <About />
        <Projects />
        <Experience />
        <Skills />
        <Education />
        <Certifications />
        <Achievements />
        <Contact />
        <Footer />
      </main>
      <StatusBar onOpenPalette={() => overlay.setPaletteOpen(true)} />
      <SoundFab />
      {overlay.paletteOpen && <CommandPalette />}
      <ShowcaseModal />
      <CertModal />
      <ImageViewer />
      <GameModal />
    </>
  )
}

function LocalizedShell() {
  const { b, t } = useI18n()

  const linkLabels = useMemo(
    () => ({
      repo: t('view_project'),
      play: t('play_game'),
      release: t('latest_release'),
    }),
    [t],
  )

  return (
    <OverlayProvider pick={(s) => b(s)} linkLabels={linkLabels} teamDefault={t('team_members')}>
      <Pages />
    </OverlayProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <SoundProvider>
          <LocalizedShell />
        </SoundProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
