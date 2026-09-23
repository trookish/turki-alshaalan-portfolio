import type { L } from '../i18n/types'
import type { Discipline } from './types'

export const profile = {
  name: { en: 'Turki Alshaalan', ar: 'تركي الشعلان' } satisfies L,
  nameFirst: { en: 'Turki', ar: 'تركي' } satisfies L,
  nameLast: { en: 'Alshaalan', ar: 'الشعلان' } satisfies L,
  headline: {
    en: 'IT Graduand at IMSIU · Software · AI · Games',
    ar: 'خريج تقنية معلومات من الإمام · برمجيات · ذكاء · ألعاب',
  } satisfies L,
  email: 'trookishgamedev@gmail.com',
  phone: '+966 53 184 9801',
  phoneHref: 'tel:+966531849801',
  location: { en: 'Riyadh, Saudi Arabia', ar: 'الرياض، المملكة العربية السعودية' } satisfies L,
  linkedin: 'https://linkedin.com/in/turki-alshaalan',
  github: 'https://github.com/trookish',
  itch: 'https://trookish.itch.io/',
  cv: 'CV/Turki_Alshalaan_CV.pdf',
  cvDownloadName: 'Turki_Alshaalan_CV.pdf',
  photo: 'images/PFP/profile.webp',

  disciplines: [
    { id: 'swe' as Discipline, label: { en: 'Software Engineer', ar: 'مهندس برمجيات' } satisfies L },
    { id: 'ai' as Discipline, label: { en: 'AI Developer', ar: 'مطوّر ذكاء اصطناعي' } satisfies L },
    { id: 'game' as Discipline, label: { en: 'Game Developer', ar: 'مطوّر ألعاب' } satisfies L },
  ],

  about: [
    {
      labelKey: 'about_focus_1' as const,
      text: {
        en: "I'm Turki Alshaalan, an IT graduate from <strong>Imam Muhammad ibn Saud Islamic University</strong>. I build across three areas — games, AI, and web — because the interesting problems rarely stay inside one box. Day to day that looks like <strong>Unity</strong> and <strong>C#</strong> for gameplay, <strong>Python</strong> and local models for AI tools, and full-stack work when an idea needs a product around it.",
        ar: 'أنا تركي الشعلان، خريج تقنية المعلومات من <strong>جامعة الإمام محمد بن سعود الإسلامية</strong>. أشتغل في ثلاثة مجالات — الألعاب، الذكاء الاصطناعي، والويب — لأن المسائل الممتعة ما تبقى غالبًا داخل إطار واحد. عمليًا هذا يعني <strong>Unity</strong> و <strong>C#</strong> لتطوير اللعب، و<strong>Python</strong> والنماذج المحلية لأدوات الذكاء الاصطناعي، وعمل Full-Stack حين تحتاج الفكرة لمنتج كامل حولها.',
      } satisfies L,
    },
    {
      labelKey: 'about_focus_2' as const,
      text: {
        en: "In games I care about the systems behind the fun — mechanics, enemy behavior, pacing — and the feel that keeps a player going for one more run. Titles like <strong>The Hidden Kanz</strong> and <strong>The Scary Library</strong> are playable releases, not demos. In AI I've shipped <strong>DocuMind</strong>, an Arabic document summarizer that runs on local LLMs, and <strong>SecureCheck</strong>, a breach checker designed so queries stay private. On the web I work from the interface down to APIs and data.",
        ar: 'في الألعاب يهمّني ما وراء المتعة — الميكانيكيات، سلوك الأعداء، والإيقاع — وإحساس اللعب اللي يخلي اللاعب يكمل جولة ثانية. أعمال مثل <strong>The Hidden Kanz</strong> و <strong>The Scary Library</strong> إصدارات قابلة للعب، وليس نماذج تجريبية. في الذكاء الاصطناعي أطلقت <strong>DocuMind</strong> لتلخيص المستندات العربية عبر نماذج محلية، و<strong>SecureCheck</strong> لفحص التسريبات مع بقاء الاستعلامات خاصة. وفي الويب أعمل من الواجهة لين الـ APIs والبيانات.',
      } satisfies L,
    },
    {
      labelKey: 'about_focus_3' as const,
      text: {
        en: "Most of my work follows the same path: a rough prototype, honest feedback, then a version someone else can actually use — whether that's a downloadable game, an AI service, or a full web app. I've shipped alone and with a team, and I'm comfortable moving between deep implementation and design decisions. I care most about work that ships cleanly and still holds up when the next person opens it.",
        ar: 'معظم عملي يمشي بنفس المسار: نموذج أولي خام، ملاحظات صادقة، ثم نسخة يستخدمها شخص آخر فعليًا — سواء لعبة قابلة للتحميل، خدمة ذكاء اصطناعي، أو تطبيق ويب كامل. أطلقت أعمالًا لوحدي ومع فريق، ومرتاح في الانتقال بين التنفيذ العميق وقرارات التصميم. يهمني أكثر شيء أن يُسلَّم العمل بنظافة ويبقى متينًا حين يفتحه الذي بعدي.',
      } satisfies L,
    },
  ],

  stats: [
    { value: '1+', labelKey: 'about_exp_label' as const, href: '#experience' },
    { value: '9+', labelKey: 'about_proj_label' as const, href: '#projects' },
    { value: '4.16', labelKey: 'about_gpa_label' as const, href: '#education' },
    { value: '9', labelKey: 'about_cert_label' as const, href: '#certifications' },
    { value: '7', labelKey: 'about_skills_label' as const, href: '#skills' },
    { value: '2', labelKey: 'about_ach_label' as const, href: '#achievements' },
  ],
}
