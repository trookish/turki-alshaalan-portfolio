import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Achievement, Certification, Project, Slide } from '../data/types'

export interface ShowcaseTeam {
  label?: string
  members: { name: string; role: string }[]
}

export interface ShowcaseState {
  title: string
  description: string
  slides: Slide[]
  tech: string[]
  tags: string[]
  teams: ShowcaseTeam[]
  links: { label: string; href: string }[]
  note?: string
}

export interface ImageViewState {
  src: string
  title?: string
  desc?: string
}

interface OverlayValue {
  showcase: ShowcaseState | null
  openProject: (p: Project) => void
  openAchievement: (a: Achievement) => void
  closeShowcase: () => void
  cert: Certification | null
  openCert: (c: Certification) => void
  closeCert: () => void
  imageView: ImageViewState | null
  openImageView: (v: ImageViewState) => void
  closeImageView: () => void
  gameOpen: boolean
  setGameOpen: (v: boolean) => void
  paletteOpen: boolean
  setPaletteOpen: (v: boolean) => void
  closePalette: () => void
}

const OverlayContext = createContext<OverlayValue | null>(null)

interface ProviderProps {
  children: ReactNode
  pick: (s: { en: string; ar: string }) => string
  linkLabels: { repo: string; play: string; release: string }
  teamDefault: string
}

export function OverlayProvider({ children, pick, linkLabels, teamDefault }: ProviderProps) {
  const [showcase, setShowcase] = useState<ShowcaseState | null>(null)
  const [cert, setCert] = useState<Certification | null>(null)
  const [imageView, setImageView] = useState<ImageViewState | null>(null)
  const [gameOpen, setGameOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  const openProject = useCallback(
    (p: Project) => {
      const slides: Slide[] =
        p.gallery && p.gallery.length > 0
          ? p.gallery
          : [{ type: 'image', src: p.cover, title: p.title, desc: p.description }]
      setShowcase({
        title: pick(p.title),
        description: pick(p.description),
        slides,
        tech: p.tags.map(pick),
        tags: p.disciplines.map((d) => d.toUpperCase()),
        teams: (p.teams ?? []).map((g) => ({
          label: g.label ? pick(g.label) : teamDefault,
          members: g.members.map((m) => ({ name: pick(m.name), role: pick(m.role) })),
        })),
        links: (p.links ?? []).map((l) => ({
          label: linkLabels[l.kind],
          href: l.href,
        })),
        note: p.note ? pick(p.note) : undefined,
      })
    },
    [pick, linkLabels, teamDefault],
  )

  const openAchievement = useCallback(
    (a: Achievement) => {
      const slides: Slide[] = [
        { type: 'image', src: a.cover, title: a.title, desc: a.projectDesc },
      ]
      if (a.projectImage) {
        slides.push({
          type: 'image',
          src: a.projectImage,
          title: a.projectTitle,
          desc: a.projectDesc,
        })
      }
      if (a.gallery) {
        slides.push(...a.gallery)
      }
      setShowcase({
        title: pick(a.title),
        description: pick(a.projectDesc),
        slides,
        tech: [],
        tags: a.tags.map(pick),
        teams: a.team
          ? [
              { label: teamDefault, members: a.team.map((m) => ({ name: pick(m.name), role: pick(m.role) })) },
              ...(a.mentor
                ? [{ members: a.mentor.map((m) => ({ name: pick(m.name), role: pick(m.role) })) }]
                : []),
            ]
          : [],
        links: [],
      })
    },
    [pick, teamDefault],
  )

  useEffect(() => {
    const open = showcase !== null || cert !== null || imageView !== null || gameOpen || paletteOpen
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [showcase, cert, imageView, gameOpen, paletteOpen])

  const value = useMemo<OverlayValue>(
    () => ({
      showcase,
      openProject,
      openAchievement,
      closeShowcase: () => setShowcase(null),
      cert,
      openCert: setCert,
      closeCert: () => setCert(null),
      imageView,
      openImageView: setImageView,
      closeImageView: () => setImageView(null),
      gameOpen,
      setGameOpen,
      paletteOpen,
      setPaletteOpen,
      closePalette: () => setPaletteOpen(false),
    }),
    [showcase, openProject, openAchievement, cert, imageView, gameOpen, paletteOpen],
  )

  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>
}

export function useOverlay(): OverlayValue {
  const ctx = useContext(OverlayContext)
  if (!ctx) throw new Error('useOverlay must be used within OverlayProvider')
  return ctx
}
