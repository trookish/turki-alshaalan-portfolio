import type { EducationTrack } from './types'

export const educationTracks: EducationTrack[] = [
  {
    title: { en: 'Onsite', ar: 'حضوري' },
    items: [
      {
        degree: { en: "Bachelor's in Information Technology", ar: 'بكالوريوس تقنية المعلومات' },
        institution: {
          en: 'Imam Muhammad ibn Saud Islamic University',
          ar: 'جامعة الإمام محمد بن سعود الإسلامية',
        },
        date: { en: 'Dec 2022 - Jul 2026', ar: 'ديسمبر 2022 - يوليو 2026' },
        detail: { en: 'Grade: 4.16', ar: 'المعدل: 4.16' },
        logo: 'images/Logos/LogoI_of_Imam_Mohammad_Ibn_Saud_Islamic_University.webp',
        activities: [
          {
            label: { en: 'Enjaz Club - Game Development Club', ar: 'نادي إنجاز - نادي تطوير الألعاب' },
            icon: 'images/Logos/EnjazLogo.webp',
          },
        ],
      },
      {
        degree: {
          en: 'Game Design and Development Bootcamp',
          ar: 'معسكر تصميم وتطوير الألعاب',
        },
        institution: { en: 'Tuwaiq Academy', ar: 'أكاديمية طويق' },
        date: { en: 'Completed', ar: 'مكتمل' },
        detail: { en: 'Field: Game Design & Development', ar: 'المجال: تصميم وتطوير الألعاب' },
        logo: 'images/Logos/tuwaiqacademy_logo.webp',
      },
    ],
  },
  {
    title: { en: 'Online', ar: 'عن بُعد' },
    items: [
      {
        degree: { en: 'Complete C# Unity Game Developer 3D', ar: 'Complete C# Unity Game Developer 3D' },
        institution: { en: 'Udemy', ar: 'Udemy' },
        date: { en: 'Jan 2025', ar: 'يناير 2025' },
        detail: { en: 'Length: 57.5 total hours', ar: 'المدة: 57.5 ساعة' },
        logo: 'images/Logos/Udemy.webp',
      },
      {
        degree: { en: 'Unity Game Development Courses', ar: 'دورات تطوير الألعاب في Unity' },
        institution: { en: 'GameDev.tv', ar: 'GameDev.tv' },
        date: { en: '2024 - Ongoing', ar: '2024 - مستمر' },
        detail: {
          en: 'Tracks: Shader Graph, Multiplayer, Turn-Based Strategy, Cutscenes',
          ar: 'المسارات: Shader Graph، اللعب الجماعي، استراتيجية الأدوار، المشاهد السينمائية',
        },
        logo: 'images/Logos/gamedevtv.webp',
      },
    ],
  },
]
