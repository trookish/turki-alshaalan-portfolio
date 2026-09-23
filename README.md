# Turki Alshaalan — Portfolio

Terminal × IDE styled portfolio for **Turki Alshaalan** — Software Engineer × AI Developer × Game Developer.

Live: [trookish.github.io/turki-alshaalan-portfolio](https://trookish.github.io/turki-alshaalan-portfolio/)

## Stack

- **Vite + React 19 + TypeScript**
- **Tailwind CSS v4** (design tokens → utility classes)
- **three.js** battle game (lazy-loaded, code-split)
- No router — hash anchors + IntersectionObserver

## Features

- EN / AR with full RTL support (`lang` + `dir` on `<html>`)
- Dark (AMOLED terminal) / light (paper) theme
- Print-to-CV via browser print (`print.css`)
- 3D souls-like battle game modal (keyboard + mobile touch controls)
- Hover / click UI sounds (toggleable, persisted)
- Project showcase gallery modal (images + YouTube embeds)
- Certificate zoom modal
- Command palette (`Ctrl+K` / `⌘K`)
- Discipline filters: Software × AI × Game Dev

## Develop

```bash
npm install
npm run dev
```

## Checks

```bash
npm run lint
npm run build   # tsc -b && vite build
```

## Deploy

Push to `main` → GitHub Actions builds and publishes `dist/` to GitHub Pages.

`base: './'` in `vite.config.ts` keeps assets relative for project Pages.

## Structure

```
src/
  components/   # Nav, StatusBar, palette, modals
  data/         # Typed content (projects, skills, certs, …) with {en, ar}
  features/
    game/       # Battle game runtime + three.js modules (lazy)
    sound/      # Hover/click sound provider
  i18n/         # Message catalog + LanguageProvider
  sections/     # Page sections
  styles/       # tokens, components, print
  theme/        # ThemeProvider
  ui/           # Overlay context (showcase/cert/game/palette)
public/         # images, Sounds, CV
legacy/         # Old vanilla site (reference only, gitignored)
```

## Content

All copy lives in `src/data/*` as `{ en, ar }` pairs. UI chrome strings live in `src/i18n/messages.ts`.
