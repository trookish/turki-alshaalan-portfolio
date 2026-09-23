import type { Certification } from './types'

const img = (name: string) => `images/Certficates/${name}.webp`

export const certifications: Certification[] = [
  {
    id: 'csharp-unity-3d',
    title: {
      en: 'Complete C# Unity Game Developer 3D (Updated To Unity 6).',
      ar: 'Complete C# Unity Game Developer 3D (محدّث إلى Unity 6).',
    },
    issuer: { en: 'By Gamedev.tv · on Udemy', ar: 'من Gamedev.tv · على Udemy' },
    date: { en: 'Issued Jan 2025', ar: 'صدر في يناير 2025' },
    image: img('Complete Csharp Unity Game Developer 3D'),
  },
  {
    id: 'game-design-dev',
    title: { en: 'Game Design and Development', ar: 'تصميم وتطوير الألعاب' },
    issuer: { en: 'by Tuwaiq Academy', ar: 'من أكاديمية طويق' },
    date: { en: 'Issued Sep 2025', ar: 'صدر في سبتمبر 2025' },
    image: img('Game Design and Development'),
  },
  {
    id: 'intro-blender',
    title: { en: 'Introduction to Blender', ar: 'مقدمة في Blender' },
    issuer: {
      en: 'By Imam Mohammad Ibn Saud Islamic University (IMSIU)',
      ar: 'من جامعة الإمام محمد بن سعود الإسلامية',
    },
    date: { en: 'Issued Dec 2024', ar: 'صدر في ديسمبر 2024' },
    image: img('Introduction to Blender'),
  },
  {
    id: 'game-design-imagination',
    title: {
      en: 'Game Design Between Imagination and Reality',
      ar: 'تصميم الألعاب بين الخيال والواقع',
    },
    issuer: { en: 'by Digital Attaa Initiative', ar: 'من مبادرة أُتقن الرقمية' },
    date: { en: 'Issued Jan 2025', ar: 'صدر في يناير 2025' },
    image: img('Game Design Between Imagination and Reality'),
  },
  {
    id: 'unity-essentials',
    title: { en: 'Unity Essentials Pathway', ar: 'مسار أساسيات Unity' },
    issuer: { en: 'by Unity', ar: 'من Unity' },
    date: { en: 'Issued Jan 2025', ar: 'صدر في يناير 2025' },
    image: img('Unity Essentials'),
  },
  {
    id: 'unity-genai',
    title: {
      en: 'Game design and development with Unity and generative AI tools',
      ar: 'تصميم وتطوير الألعاب مع Unity وأدوات الذكاء الاصطناعي التوليدي',
    },
    issuer: { en: 'by Digital Attaa Initiative', ar: 'من مبادرة أُتقن الرقمية' },
    date: { en: 'Issued Nov 2024', ar: 'صدر في نوفمبر 2024' },
    image: img('Game design and development with Unity and generative AI tools'),
  },
  {
    id: 'game-dev-jobs',
    title: { en: 'Jobs in game development', ar: 'وظائف في تطوير الألعاب' },
    issuer: { en: 'by Digital Attaa Initiative', ar: 'من مبادرة أُتقن الرقمية' },
    date: { en: 'Issued Nov 2024', ar: 'صدر في نوفمبر 2024' },
    image: img('Jobs in game development'),
  },
  {
    id: '3d-game-bootcamp',
    title: { en: '3D Game Developer Bootcamp', ar: 'معسكر مطوري الألعاب ثلاثية الأبعاد' },
    issuer: {
      en: 'Imam Mohammad Ibn Saud Islamic University (IMSIU)',
      ar: 'جامعة الإمام محمد بن سعود الإسلامية',
    },
    date: { en: 'Issued Oct 2024', ar: 'صدر في أكتوبر 2024' },
    image: img('3D Game Developer Bootcamp'),
  },
  {
    id: 'mckinsey-forward',
    title: { en: 'McKinsey.org Forward Program', ar: 'برنامج McKinsey.org Forward' },
    issuer: { en: 'by McKinsey & Company', ar: 'من McKinsey & Company' },
    date: { en: 'Issued Jun 2026', ar: 'صدر في يونيو 2026' },
    image: img('Mckinsey.org Forward Program Certificate'),
  },
]
