import type { Achievement } from './types'

export const achievements: Achievement[] = [
  {
    id: 'sop-game-jam-2026',
    title: {
      en: '119th of 716 Games - SOP Game Jam 2026',
      ar: 'المركز 119 من أصل 716 لعبة - هكاثون SOP للألعاب 2026',
    },
    issuer: { en: 'SOP Game Jam', ar: 'هكاثون SOP للألعاب' },
    date: { en: '30 July - 4 August 2026', ar: '30 يوليو - 4 أغسطس 2026' },
    cover: 'images/Achievement/SOPGameJam.webp',
    projectLabel: { en: 'Game:', ar: 'اللعبة:' },
    projectTitle: { en: 'IT WAS JUST A TIGHTENED SCREW', ar: 'IT WAS JUST A TIGHTENED SCREW' },
    projectDesc: {
      en: 'Placed 119th out of 716 submitted games at SOP Game Jam 2026. The game was played and highlighted repeatedly by YouTuber SOP during the jam.',
      ar: 'حصلنا على المركز 119 من أصل 716 لعبة مقدمة في هكاثون SOP للألعاب 2026. لُعبت اللعبة وذكرت كثيراً من قبل صانع المحتوى SOP على يوتيوب أثناء الهكاثون.',
    },
    projectImage: 'images/Projects/IWJATS.webp',
    gallery: [
      {
        type: 'image',
        src: 'images/Projects/IWJATS/screenshot1.webp',
        title: { en: 'Game Main Menu', ar: 'قائمة اللعبة الرئيسية' },
        desc: {
          en: 'Start screen showing the title "IT WAS JUST A TIGHTENED SCREW!" with PLAY, CREDITS, and QUIT buttons beside a hazmat worker and green waste barrels.',
          ar: 'شاشة البداية فيها عنوان اللعبة "IT WAS JUST A TIGHTENED SCREW!" مع أزرار PLAY وCREDITS وQUIT وبجانبها عامل ببدلة واقية وبراميل خضراء.',
        },
      },
      {
        type: 'image',
        src: 'images/Projects/IWJATS/screenshot2.webp',
        title: { en: 'Red Alert', ar: 'إنذار أحمر' },
        desc: {
          en: 'Emergency red lighting floods the room as the glowing worker stands over the loose screw that started the disaster.',
          ar: 'إنارة الطوارئ الحمراء تعم المكان والموظف متوهج واقف فوق البرغي اللي سبب الكارثة.',
        },
      },
      {
        type: 'image',
        src: 'images/Projects/IWJATS/screenshot3.webp',
        title: { en: 'Rescue Everyone', ar: 'أنقذ الجميع' },
        desc: {
          en: 'Racing to save the babies, kittens, dogs, and the mysterious IMPORTANT person before reaching the emergency bunker.',
          ar: 'سباق تنقذ فيه الرضع والقطط والكلاب والشخص المهم الغامض قبل ما توصل للملجأ.',
        },
      },
    ],
    tags: [
      { en: '#SOPGameJam', ar: '#هكاثون_SOP' },
      { en: '#GameJam', ar: '#هكاثون_ألعاب' },
      { en: '#Top120', ar: '#ضمن_أفضل_120' },
      { en: '#FeaturedBySOP', ar: '#ذكر_من_قبل_SOP' },
      { en: '#Unity', ar: '#Unity' },
    ],
    disciplines: ['game'],
  },
  {
    id: 'pwc-hackathon',
    title: { en: '1st Place Winner - PwC Middle East Hackathon', ar: 'المركز الأول - هكاثون PwC الشرق الأوسط' },
    issuer: { en: 'PwC Middle East', ar: 'PwC الشرق الأوسط' },
    date: { en: '7 February 2026', ar: '7 فبراير 2026' },
    cover: 'images/Achievement/PWCachievements.webp',
    projectLabel: { en: 'Project:', ar: 'المشروع:' },
    projectTitle: { en: 'TourLens', ar: 'TourLens' },
    projectDesc: {
      en: 'An AR glasses solution that serves as a hands-free indoor tour guide, overlaying real-time visualizations to enhance visitor experiences at events and cultural sites in Riyadh.',
      ar: 'حل نظارات الواقع المعزز (AR) يشتغل كمرشد سياحي داخلي بدون استخدام اليدين، يعرض مرئيات فورية عشان يحسّن تجربة الزوار في الفعاليات والمواقع الثقافية بالرياض.',
    },
    team: [
      { name: { en: 'Abdulrahman Raed', ar: 'عبد الرحمن رائد' }, role: { en: 'Team Member', ar: 'عضو فريق' } },
      { name: { en: 'Fahad Alghamdi', ar: 'فهد الغامدي' }, role: { en: 'Team Member', ar: 'عضو فريق' } },
      { name: { en: 'Nawaf Almeshal', ar: 'نواف المشال' }, role: { en: 'Team Member', ar: 'عضو فريق' } },
      { name: { en: 'Yunus Demirboga', ar: 'يونس دميربوغا' }, role: { en: 'Team Member', ar: 'عضو فريق' } },
      { name: { en: 'Sema Bairakdar', ar: 'سيما بايركدار' }, role: { en: 'Team Member', ar: 'عضو فريق' } },
      { name: { en: 'Leen Al Harbi', ar: 'لين الحربي' }, role: { en: 'Team Member', ar: 'عضو فريق' } },
      { name: { en: 'Amal Alhemali', ar: 'أمل الهملي' }, role: { en: 'Team Member', ar: 'عضو فريق' } },
      { name: { en: 'Muzun AlHallabi', ar: 'مزن الحبابي' }, role: { en: 'Team Member', ar: 'عضو فريق' } },
    ],
    mentor: [{ name: { en: 'Majed Alghamdi', ar: 'ماجد الغامدي' }, role: { en: 'Mentor', ar: 'مشرف' } }],
    tags: [
      { en: '#PwC', ar: '#PwC' },
      { en: '#Hackathon', ar: '#هكاثون' },
      { en: '#Teamwork', ar: '#عمل_فريق' },
      { en: '#Brainstorm', ar: '#عصف_ذهني' },
      { en: '#ProblemSolving', ar: '#حل_المشاكل' },
    ],
    disciplines: ['ai', 'swe'],
  },
  {
    id: 'enjaz-game-jam',
    title: { en: '1st Place Winner - Enjaz Game Jam', ar: 'المركز الأول - هكاثون إنجاز للألعاب' },
    issuer: { en: 'Enjaz Club', ar: 'نادي إنجاز' },
    date: { en: '19 November 2024', ar: '19 نوفمبر 2024' },
    cover: 'images/Achievement/EnjazGameJam.webp',
    projectLabel: { en: 'Game:', ar: 'اللعبة:' },
    projectTitle: { en: 'The Scary Library', ar: 'The Scary Library' },
    projectDesc: {
      en: 'A horror game where players solve book puzzles to escape a haunted library while being hunted by an AI enemy.',
      ar: 'لعبة رعب يحل فيها اللاعبون ألغاز الكتب عشان يهربون من مكتبة مسكونة وهما مطاردين من عدو ذكاء اصطناعي.',
    },
    projectImage: 'images/Projects/ScaryLibrary.webp',
    tags: [
      { en: '#Enjaz', ar: '#إنجاز' },
      { en: '#GameJam', ar: '#هكاثون_ألعاب' },
      { en: '#1stPlace', ar: '#المركز_الأول' },
      { en: '#Horror', ar: '#رعب' },
      { en: '#Unity', ar: '#Unity' },
    ],
    disciplines: ['game'],
  },
]
