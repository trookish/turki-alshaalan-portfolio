import type { Project, Slide } from './types'

const teamSaud = { name: { en: 'Saud AlFawzan', ar: 'سعود الفوزان' } }
const teamFahad = { name: { en: 'Fahad AlGhamdi', ar: 'فهد الغامدي' } }
const roleGameLevel = { en: 'Game/Level Design, Assets', ar: 'تصميم الألعاب/المراحل، الأصول' }
const roleGameLevelOnly = { en: 'Game/Level Design', ar: 'تصميم الألعاب/المراحل' }
const roleTurkiProg = { en: 'Game Programmer', ar: 'مبرمج ألعاب' }
const roleModeler = { en: '3D Modeler', ar: 'نمذجة ثلاثية الأبعاد' }
const roleLevel = { en: 'Level Designer', ar: 'مصمم المراحل' }
const roleCoordinator = { en: 'Project Coordinator', ar: 'منسق المشروع' }
const roleDeveloper = { en: 'Developer', ar: 'مطور' }

const masarflowGallery: Slide[] = [
  {
    type: 'image',
    src: 'images/Projects/MasarFlow/screenshot1.webp',
    title: { en: 'MasarFlow Launcher', ar: 'لانشر مسار فلو' },
    desc: {
      en: 'The desktop launcher verifying local requirements — project files, version, Node.js, pnpm, and Python — before running MasarFlow on your machine.',
      ar: 'اللانشر يفحص المتطلبات على جهازك — ملفات المشروع والإصدار وNode.js وpnpm وPython — قبل ما يشغّل مسار فلو.',
    },
  },
  {
    type: 'image',
    src: 'images/Projects/MasarFlow/screenshot2.webp',
    title: { en: 'Workspace Dashboard', ar: 'لوحة المشروع' },
    desc: {
      en: 'Project overview showing health, architecture, and tech-debt scores alongside active work, specs in flight, recent notes, and activity feeds.',
      ar: 'نظرة عامة على المشروع فيها درجات الصحة والهيكل والديون التقنية، مع الشغل الحالي والمواصفات وملاحظات الأنشطة.',
    },
  },
  {
    type: 'image',
    src: 'images/Projects/MasarFlow/screenshot3.webp',
    title: { en: 'Task Boards', ar: 'لوحات المهام' },
    desc: {
      en: 'Kanban board with Backlog, To do, In progress, Review, and Done columns for tracking sprint tasks linked to specs.',
      ar: 'كانبان فيه أعمدة: مؤجلة، بنسويه، شغالين عليه، مراجعة، وخلصان — عشان تتابع مهام السبرنت المرتبطة بالمواصفات.',
    },
  },
  {
    type: 'image',
    src: 'images/Projects/MasarFlow/screenshot4.webp',
    title: { en: 'Knowledge Graph', ar: 'خريطة المعرفة' },
    desc: {
      en: 'Interactive graph linking notes, specs, tasks, systems, and commits so you can explore how everything in the workspace connects.',
      ar: 'جراف تفاعلي يربط الملاحظات والمواصفات والمهام والأنظمة والكوميتات، عشان تشوف كيف كل شي في المساحة متصل.',
    },
  },
  {
    type: 'image',
    src: 'images/Projects/MasarFlow/screenshot5.webp',
    title: { en: 'AI Assistant Chat', ar: 'شات المساعد الذكي' },
    desc: {
      en: 'Agentic chat where the assistant reads the workspace and carries out actions — here creating a note in the Brain on request.',
      ar: 'شات يقرأ محتوى المساحة وينفّذ أوامرك — هنا يسوي ملاحظة في المخدة (Brain) لما تطلب.',
    },
  },
  {
    type: 'image',
    src: 'images/Projects/MasarFlow/screenshot6.webp',
    title: { en: 'Notes Editor', ar: 'محرر الملاحظات' },
    desc: {
      en: 'Notes with folders, tags, write/read modes, and linked mentions — here showing a Five Famous Quotes note.',
      ar: 'ملاحظات مع مجلدات ووسوم وأوضاع قراءة وكتابة وروابط — هنا معروض فيها ملاحظة خمس اقتباسات مشهورة.',
    },
  },
]

const dungeonGallery: Slide[] = [
  {
    type: 'image',
    src: 'images/Projects/DungeonPuzzle/screenshot1.webp',
    title: { en: 'Start Room', ar: 'غرفة البداية' },
    desc: {
      en: 'The initial room featuring a wooden table, chairs, paintings, and locked iron gates.',
      ar: 'أول غرفة فيها طاولة خشبية وكراسي ولوحات وبوابات حديدية مقفوله.',
    },
  },
  {
    type: 'image',
    src: 'images/Projects/DungeonPuzzle/screenshot2.webp',
    title: { en: 'Dungeon Corridors', ar: 'ممرات السجن' },
    desc: {
      en: 'Navigating hallways with cells, chains, and a wall sign pointing to the Key Room.',
      ar: 'تمشي بممرات فيها زنازين وسلاسل ولوحة جدارية توصلك لغرفة المفتاح.',
    },
  },
  {
    type: 'image',
    src: 'images/Projects/DungeonPuzzle/screenshot3.webp',
    title: { en: 'Torture Chamber', ar: 'غرفة التعذيب' },
    desc: {
      en: 'A large room containing torture devices, executioner blocks, wooden horses, hanging cages, and iron maidens.',
      ar: 'غرفة كبيرة فيها أدوات تعذيب وجلطات إعدام وأحصنة خشبية وأقفاص معلقة وصناديق حديدية.',
    },
  },
  {
    type: 'image',
    src: 'images/Projects/DungeonPuzzle/screenshot4.webp',
    title: { en: 'The Armory', ar: 'مستودع الأسلحة' },
    desc: {
      en: 'A room with racks of swords and shields, candle chandeliers, and a hanging red banner.',
      ar: 'غرفة فيها رفوف سيوف ودروع وثريات شموع وراية حمراء معلقة.',
    },
  },
  {
    type: 'image',
    src: 'images/Projects/DungeonPuzzle/screenshot5.webp',
    title: { en: 'Lava Trap Room', ar: 'غرفة فخ الحمم' },
    desc: {
      en: 'Crossing a narrow stone bridge over boiling lava while dodging giant swinging blades.',
      ar: 'تعبر جسر حجري ضيق فوق حمم مغليه وتتفادى شفرات ضخمة تتأرجح.',
    },
  },
  {
    type: 'image',
    src: 'images/Projects/DungeonPuzzle/screenshot6.webp',
    title: { en: 'Treasure Corner', ar: 'ركن الكنز' },
    desc: { en: 'A corner housing ancient wooden chests.', ar: 'ركن فيه صناديق خشبية من القديم.' },
  },
]

const scaryGallery: Slide[] = [
  {
    type: 'video',
    id: 'dzCUWznZ7e8',
    title: { en: 'Gameplay Video', ar: 'فيديو اللعب' },
    desc: {
      en: 'Watch the full gameplay video — solve book puzzles and escape the haunted library while the AI monster hunts you.',
      ar: 'شاهد فيديو اللعب كامل — حلّ ألغاز الكتب واهرب من المكتبة المسكونة وأنت مطارد من وحش ذكاء اصطناعي.',
    },
  },
  {
    type: 'image',
    src: 'images/Projects/ScaryLibrary/screenshot1.webp',
    title: { en: 'The Book Puzzle Shelf', ar: 'رفّ لغز الكتب' },
    desc: {
      en: 'A stone wall shelf with slots for 5 books, instructing the player to place them in order.',
      ar: 'رف حجري فيه خمس خانات يسوي فيها اللاعب الكتب بالترتيب الصحيح.',
    },
  },
  {
    type: 'image',
    src: 'images/Projects/ScaryLibrary/screenshot2.webp',
    title: { en: 'AI Monster Patrolling', ar: 'وحش الذكاء الاصطناعي في دورية' },
    desc: {
      en: 'Creepy white-faced monster patrolling the library corridors as a red book sits on a table.',
      ar: 'وحش مخيف بوجه أبيض يلف على ممرات المكتبة وكتاب أحمر قاعد على الطاولة.',
    },
  },
  {
    type: 'image',
    src: 'images/Projects/ScaryLibrary/screenshot3.webp',
    title: { en: 'Library Jumpscare', ar: 'لفعة المكتبة' },
    desc: {
      en: 'Horrifying moment the player is caught close-up by the monster.',
      ar: 'لحظة مرعبة لما الوحش يمسك اللاعب عن قريب.',
    },
  },
]

const knightGallery: Slide[] = [
  {
    type: 'image',
    src: 'images/Projects/KnightWithGun/screenshot1.webp',
    title: { en: 'Game Main Menu', ar: 'القائمة الرئيسية للعبة' },
    desc: {
      en: 'Start interface with a fully armored knight holding a glowing yellow cube weapon.',
      ar: 'واجهة البداية مع فارس مدرّع بالكامل ويمسك سلاح مكعّب أصفر متوهّج.',
    },
  },
  {
    type: 'image',
    src: 'images/Projects/KnightWithGun/screenshot2.webp',
    title: { en: 'Bridge Combat Arena', ar: 'ساحة قتال الجسر' },
    desc: {
      en: 'Fighting glowing red cylinder enemies on a narrow stone bridge under a crimson sky.',
      ar: 'قتال أعداء أسطوانية متوهجة باللون الأحمر فوق جسر حجري ضيق تحت سما قرمزية.',
    },
  },
  {
    type: 'image',
    src: 'images/Projects/KnightWithGun/screenshot3.webp',
    title: { en: 'Pause Menu Interface', ar: 'قائمة التوقّف المؤقت' },
    desc: {
      en: 'Retro-style pause overlay with Resume and Quit buttons.',
      ar: 'شاشة إيقاف مؤقت بأسلوب ريترو فيها زرارين: استئناف أو خروج.',
    },
  },
]

const kanzGallery: Slide[] = [
  {
    type: 'image',
    src: 'images/Projects/TheHiddenKanz/screenshot1.webp',
    title: { en: 'Main Menu Scene', ar: 'مشهد القائمة الرئيسية' },
    desc: {
      en: 'Main menu showcasing a carved stone tomb entrance in desert sand dunes.',
      ar: 'القائمة تعرض مدخل مقبرة حجرية منحوتة وسط الكثبان الرملية الصحراوية.',
    },
  },
  {
    type: 'image',
    src: 'images/Projects/TheHiddenKanz/screenshot2.webp',
    title: { en: 'First-Person Combat View', ar: 'القتال بمنظور أول' },
    desc: {
      en: 'Stone corridor exploration holding a sword and a green magical flame against skeleton enemies.',
      ar: 'استكشاف ممر حجري وأنت ماسك سيف ولهب سحري أخضر ضد الهياكل العظمية.',
    },
  },
  {
    type: 'image',
    src: 'images/Projects/TheHiddenKanz/screenshot3.webp',
    title: { en: 'Magic Ability Casting', ar: 'إلقاء قدرة سحرية' },
    desc: {
      en: 'Engaging skeleton warrior while preparing to cast a pink magic spell.',
      ar: 'تواجه محارب هيكل عظمي وانتا قاعد تحضّر إلقاء تعويذة سحرية وردية.',
    },
  },
  {
    type: 'image',
    src: 'images/Projects/TheHiddenKanz/screenshot4.webp',
    title: { en: 'Statue Chamber', ar: 'غرفة التماثيل' },
    desc: {
      en: 'Spacious room lined with tall hooded statues, archway tunnels, and hanging cages.',
      ar: 'غرفة واسعة حولها تماثيل طويلة بقلانس وممرات مقوّسة وأقفاص معلقة.',
    },
  },
]

const syntaxGallery: Slide[] = [
  {
    type: 'image',
    src: 'images/Projects/SyntaxStrike/screenshot1.webp',
    title: { en: 'Various Enemy Types in Combat', ar: 'أنواع أعداء مختلفة في القتال' },
    desc: {
      en: "Real-time combat in the facility showing the player robot fighting multiple enemy types (Shooter Robots, Spider Bots, and Turrets) using the sword and shield.",
      ar: 'قتال مباشر في المنشأة يبيّن روبوت اللاعب وهو يواجه أنواعاً متعددة من الأعداء (شوتر روبوت، عناكب آلية، ورشاشات) بالسيف والدرع.',
    },
  },
  {
    type: 'image',
    src: 'images/Projects/SyntaxStrike/screenshot2.webp',
    title: { en: 'Spider Enemies Attacking', ar: 'هجوم العناكب الآلية' },
    desc: {
      en: 'Engaging fast Spider Bots and ranged enemies inside the warehouse facility. Ranged enemies can fire projectiles and self-destruct if they get too close.',
      ar: 'تواجهة العناكب الآلية السريعة والأعداء المضادين الدين من المدى داخل المخزن. أعداء المدى يرمون قذائف وتنفجر القريبين منهم.',
    },
  },
  {
    type: 'image',
    src: 'images/Projects/SyntaxStrike/screenshot3.webp',
    title: { en: 'Hacking Tool Pickup in the Environment', ar: 'أخذ أداة الاختراق' },
    desc: {
      en: 'Locating the Hacking Tool in the facility. Acquiring the tool allows the player to interact with terminals and hack disabled enemies to solve programming puzzles.',
      ar: 'تعرف مكان أداة الاختراق في المنشأة. وأخذك الأداة تخليك تتعامل مع المحطات وتخترق أعداء معطلين لحل ألغاز برمجية.',
    },
  },
  {
    type: 'image',
    src: 'images/Projects/SyntaxStrike/screenshot4.webp',
    title: { en: 'Hacking Tool Acquired Notification', ar: 'إشعار أخذ أداة الاختراق' },
    desc: {
      en: 'On-screen notification upon picking up the hacking tool, preparing the student to hack enemies and override secure doors.',
      ar: 'إشعار يظهر على الشاشة لما تلتقط أداة الاختراق، ويجهّز الطالب يخترق الأعداء ويفتح الأبواب المؤمية.',
    },
  },
  {
    type: 'image',
    src: 'images/Projects/SyntaxStrike/screenshot5.webp',
    title: { en: 'Electrical Water Hazard', ar: 'خطر الماء المكهرب' },
    desc: {
      en: 'Navigating environmental hazards. The student must avoid electrical pools or use a nearby control console to disable the hazard before traversing.',
      ar: 'التعامل مع المخاطر البيئية. لازم الطالب يتجنّب البرك المكهربة أو يستخدم لوحة تحكم قروب عشان يوقف الخطر قبل العبور.',
    },
  },
  {
    type: 'image',
    src: 'images/Projects/SyntaxStrike/screenshot6.webp',
    title: { en: 'Final Boss Encounter', ar: 'مواجهة الزعيم النهائي' },
    desc: {
      en: "The final encounter with the Boss robot. The player must dodge shockwaves and stomp attacks, reduce the Boss's health to zero, and solve a hard programming puzzle to win.",
      ar: 'المواجهة الأخيرة مع روبوت الزعيم — لازم تتفادى موجات الضغط وضربات الدس، وتخلي صحة الزعيم صفر، وتحل لغز برمجي صعب عشان تفوز.',
    },
  },
  {
    type: 'image',
    src: 'images/Projects/SyntaxStrike/screenshot7.webp',
    title: { en: 'Level Completion Score Scene', ar: 'مشهد النتيجة النهائية' },
    desc: {
      en: 'Level completion scoreboard tracking player statistics including enemies defeated, programming puzzle accuracy, time bonuses, and final score.',
      ar: 'لوحة النهاية تعرض كل إحصائياتك: الأعداء اللي هزمتهم، ودقتك في حل الألغاز البرمجية، ومكافآت الوقت، والنتيجة النهائية.',
    },
  },
]

const iwjatsGallery: Slide[] = [
  {
    type: 'video',
    id: '1_v0l9b5qmU',
    title: { en: 'Gameplay Video', ar: 'فيديو اللعب' },
    desc: {
      en: 'Watch the full gameplay video — a routine maintenance job at the nuclear facility, one loose screw away from complete disaster.',
      ar: 'شاهد فيديو اللعب كامل — مهمة صيانة روتينية في المنشأة النووية، برغي واحد يبعدك عن الكارثة الكاملة.',
    },
  },
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
]

export const projects: Project[] = [
  {
    id: 'masarflow',
    title: { en: 'MasarFlow', ar: 'MasarFlow' },
    description: {
      en: 'A local-first, AI-native project workspace. Everything lives in your browser — notes, tasks, specs, canvases, and chat threads — backed by a local Python sidecar for embeddings, semantic search, and RAG context. No account. No cloud. No telemetry.',
      ar: 'مساحة عمل مشاريع محلية بالكامل (Local-First) مدعومة بالذكاء الاصطناعي. كل شيء يعيش في المتصفح — ملاحظات، مهام، مواصفات، لوحات، ومحادثات — مع خدمة Python محلية للتضمين والبحث الدلالي وسياق RAG. بدون حساب، بدون سحابة، وبدون تتبع.',
    },
    cover: 'images/Projects/MasarFlow.webp',
    coverContain: true,
    disciplines: ['swe', 'ai'],
    featured: true,
    badge: { en: 'NEW', ar: 'جديد' },
    tags: [
      { en: 'Next.js', ar: 'Next.js' },
      { en: 'React', ar: 'React' },
      { en: 'TypeScript', ar: 'TypeScript' },
      { en: 'FastAPI', ar: 'FastAPI' },
      { en: 'Electron', ar: 'Electron' },
      { en: 'Local-First', ar: 'Local-First' },
    ],
    links: [
      { kind: 'repo', href: 'https://github.com/trookish/MasarFlow' },
      { kind: 'release', href: 'https://github.com/trookish/MasarFlow/releases/latest' },
    ],
    gallery: masarflowGallery,
  },
  {
    id: 'dungeon-puzzle',
    title: { en: 'Dungeon Puzzle', ar: 'Dungeon Puzzle' },
    description: {
      en: 'A puzzle-based gameplay experience where players navigate through dangerous dungeons, avoiding death traps and overcoming environmental challenges to reach the exit.',
      ar: 'تجربة لعب تعتمد على الألغاز، يخوض اللاعب دهاليز خطيرة ويتجنّب فخاخ الموت ويتغلب على تحدّيات البيئة عشان يوصل للمخرج.',
    },
    cover: 'images/Projects/DungeonPuzzle.webp',
    disciplines: ['game'],
    tags: [
      { en: 'Unity', ar: 'Unity' },
      { en: 'C#', ar: 'C#' },
      { en: 'Puzzle', ar: 'ألغاز' },
      { en: '3D', ar: '3D' },
    ],
    links: [{ kind: 'play', href: 'https://trookish.itch.io/dungeon-puzzle' }],
    teams: [
      {
        members: [
          { ...teamSaud, role: roleGameLevel },
          { ...teamFahad, role: roleGameLevelOnly },
          { name: { en: 'Turki AlShaalan', ar: 'تركي الشعلان' }, role: roleTurkiProg },
          { name: { en: 'Abdulrahman AlFifi', ar: 'عبد الرحمن الفيفي' }, role: roleModeler },
          { name: { en: 'Anas AlHakami', ar: 'أنس الحكمي' }, role: roleGameLevelOnly },
        ],
      },
    ],
    gallery: dungeonGallery,
  },
  {
    id: 'scary-library',
    title: { en: 'The Scary Library', ar: 'The Scary Library' },
    description: {
      en: 'A horror game developed during a Game Jam featuring an AI enemy that hunts the player. Solve book-based puzzles using 5 books to escape the haunted library.',
      ar: 'لعبة رعب سويتها في هكاثون ألعاب (Game Jam) فيها عدو ذكاء اصطناعي يطارد اللاعب. حلّ ألغاز الكتب الخمسة عشان تهرب من المكتبة المسكونة.',
    },
    cover: 'images/Projects/ScaryLibrary.webp',
    disciplines: ['game'],
    tags: [
      { en: 'Unity', ar: 'Unity' },
      { en: 'C#', ar: 'C#' },
      { en: 'Horror', ar: 'رعب' },
      { en: 'AI', ar: 'AI' },
      { en: 'Game Jam', ar: 'هكاثون ألعاب' },
    ],
    links: [{ kind: 'play', href: 'https://trookish.itch.io/scary-library' }],
    gallery: scaryGallery,
  },
  {
    id: 'knight-with-gun',
    title: { en: 'Knight With a Gun', ar: 'Knight With a Gun' },
    description: {
      en: 'Face hordes of enemies as a Knight using your own gun. Survive the endless horde in this action-packed survival game.',
      ar: 'واجه جحافل الأعداء بصفتك فارسًا وأنت ماسك مسدسك الخاص. عيش أطول فترة ممكنة مع الحشود اللا نهائية في لعبة البقاء المليئة بالحماس.',
    },
    cover: 'images/Projects/KnightwithGun.webp',
    disciplines: ['game'],
    tags: [
      { en: 'Unity', ar: 'Unity' },
      { en: 'C#', ar: 'C#' },
      { en: 'Action', ar: 'أكشن' },
      { en: 'Survival', ar: 'بقاء' },
      { en: 'Endless', ar: 'لا نهائي' },
    ],
    links: [{ kind: 'play', href: 'https://trookish.itch.io/tuwaiq-game-turki-alshalaan' }],
    gallery: knightGallery,
  },
  {
    id: 'the-hidden-kanz',
    title: { en: 'The Hidden Kanz', ar: 'The Hidden Kanz' },
    description: {
      en: 'A combat-based dungeon crawler where players fight waves of skeleton AI enemies using sword combat and magic abilities to survive and clear the dungeon.',
      ar: 'لعبة قتال واستكشاف دهاليز، يقاتل فيها اللاعب موجات من الهياكل العظمية الذكية بالسيف والقدرات السحرية عشان ينجو ويصفّي المكان.',
    },
    cover: 'images/Projects/TheHiddenKanz.webp',
    disciplines: ['game'],
    tags: [
      { en: 'Unity', ar: 'Unity' },
      { en: 'C#', ar: 'C#' },
      { en: 'Combat', ar: 'قتال' },
      { en: 'AI', ar: 'AI' },
      { en: '3D', ar: '3D' },
    ],
    links: [{ kind: 'play', href: 'https://s3-od.itch.io/the-hidden-kanz' }],
    teams: [
      {
        members: [
          { ...teamSaud, role: roleGameLevel },
          { name: { en: 'Turki Alshaalan', ar: 'تركي الشعلان' }, role: roleTurkiProg },
        ],
      },
    ],
    gallery: kanzGallery,
  },
  {
    id: 'syntax-strike',
    title: { en: 'Syntax Strike', ar: 'سنتاكس سترايك' },
    description: {
      en: 'A 3D educational action-RPG built in Unity where players master coding by solving Java puzzles. Features compiler-integrated combat mechanics, dynamic quest lines, and a custom evaluation companion. Turki engineered the C# game systems, player state controllers, parser integration, and enemy AI combat patterns.',
      ar: 'لعبة أكشن-RPG تعليمية ثلاثية الأبعاد مبنية في Unity، يتقن فيها اللاعب البرمجة عن طريق حل ألغاز Java. فيها ميكانيكيات قتال مدمجة مع المترجم (Compiler)، ومهام ديناميكية، ورفيق تقييم خاص. تركي بنى أنظمة اللعبة بـ C# ومتحكمات حالة اللاعب وتكامل المحلل (Parser) وأنماط قتال الأعداء بالذكاء الاصطناعي.',
    },
    cover: 'images/Projects/SyntaxStrike.webp',
    coverContain: true,
    disciplines: ['game', 'swe'],
    tags: [
      { en: 'Unity 3D', ar: 'Unity 3D' },
      { en: 'C# Scripting', ar: 'C# Scripting' },
      { en: 'Core Mechanics', ar: 'ميكانيكيات أساسية' },
      { en: 'AI Combat', ar: 'قتال بالذكاء الاصطناعي' },
      { en: 'AST Parsing', ar: 'AST Parsing' },
    ],
    teams: [
      {
        members: [
          { name: { en: 'Turki Alshaalan', ar: 'تركي الشعلان' }, role: roleTurkiProg },
          { name: { en: 'Abdulaziz Almusayli', ar: 'عبد العزيز المسيلي' }, role: roleCoordinator },
          { ...teamSaud, role: roleLevel },
        ],
      },
    ],
    gallery: syntaxGallery,
  },
  {
    id: 'iwjats',
    title: {
      en: 'IT WAS JUST A TIGHTENED SCREW',
      ar: 'IT WAS JUST A TIGHTENED SCREW',
    },
    description: {
      en: 'A chaotic comedy runner where a routine maintenance job at a nuclear facility goes horribly wrong after a single loose screw falls into the reactor. With only a short duration until a nuclear meltdown, you must sprint through a collapsing facility, dodge hazards, outrun a deadly radioactive gas cloud, and rescue babies, kittens, dogs, and the mysterious IMPORTANT person before reaching the emergency bunker. Every second counts, and every rescue could be the difference between survival and total disaster.',
      ar: 'لعبة جري كوميدية فوضوية، مهمة صيانة بسيطة في منشأة نووية تنقلب كارثة حقيقية بعد ما طاح مسمار واحد بالمفاعل. ومعك وقت قصير قبل الانصهار النووي، لازم تجري وسط المنشأة اللي تنهار، تتفادى الأخطار، تفلت من سحابة الغاز المشع، وتنقذ الأطفال الرضع والقطط والكلاب والشخص الغامض المهم قبل ما توصل للملجأ الطوارئ. كل ثانية تحسب، وكل عملية إنقاذ ممكن تكون الفرق بين النجاة والكارثة الكاملة.',
    },
    cover: 'images/Projects/IWJATS.webp',
    disciplines: ['game'],
    tags: [
      { en: 'Unity', ar: 'Unity' },
      { en: 'C#', ar: 'C#' },
      { en: 'Runner', ar: 'ألعاب الجري' },
      { en: 'Comedy', ar: 'الكوميديا' },
      { en: 'Game Jam', ar: 'هكاثون ألعاب' },
    ],
    note: {
      en: 'Note: You need to be logged in to the Qwacks website in order to play the game.',
      ar: 'ملاحظة: لازم تسجل دخول في موقع Qwacks عشان تقدر تلعب اللعبة.',
    },
    links: [
      {
        kind: 'play',
        href: 'https://community.qwacks.com/play?jam=sop-game-jam-2026&start=01KZ4M6JG2VPR7P14G3CTZMA2K&template=sop&stage=submissions',
      },
    ],
    teams: [
      {
        members: [
          {
            name: { en: 'Turki Alshaalan', ar: 'تركي الشعلان' },
            role: { en: 'Game Developer', ar: 'مطور ألعاب' },
          },
        ],
      },
    ],
    gallery: iwjatsGallery,
  },
  {
    id: 'documind',
    title: { en: 'DocuMind', ar: 'DocuMind' },
    description: {
      en: 'An open-source system for summarizing Arabic PDF documents using local LLMs and a simple Streamlit interface. A valuable learning project that helped understand how document summarization systems work in practice, from extraction to clustering and final generation.',
      ar: 'نظام مفتوح المصدر لتلخيص مستندات PDF العربية باستخدام نماذج LLM محلية وواجهة Streamlit بسيطة. مشروع تعليمي قيّم خلاني أفهم كيف تشتغل أنظمة تلخيص المستندات عملياً، من الاستخراج إلى التجميع والتوليد النهائي.',
    },
    cover: 'images/Projects/documind.webp',
    disciplines: ['ai', 'swe'],
    tags: [
      { en: 'Python', ar: 'Python' },
      { en: 'LLM', ar: 'LLM' },
      { en: 'Streamlit', ar: 'Streamlit' },
      { en: 'Arabic NLP', ar: 'معالجة اللغة العربية' },
      { en: 'Open Source', ar: 'مفتوح المصدر' },
    ],
    links: [{ kind: 'repo', href: 'https://github.com/fghksa/DocuMind_App' }],
    teams: [
      {
        members: [
          { name: { en: 'Turki AlShaalan', ar: 'تركي الشعلان' }, role: roleDeveloper },
          { ...teamFahad, role: roleDeveloper },
        ],
      },
    ],
  },
  {
    id: 'saudi-plate-predictor',
    title: { en: 'Saudi Plate Predictor System', ar: 'Saudi Plate Predictor System' },
    description: {
      en: 'A proof-of-concept prediction system for Saudi distinguished license plate auctions. Analyzes historical auction behavior, rarity, cultural significance, and plate patterns to forecast which plates are most likely to appear in upcoming auctions — with ethical data collection and a permanent local history archive.',
      ar: 'نظام تجريبي للتنبؤ بمزادات اللوحات المميزة السعودية. يحلل سلوك المزادات السابقة والندرة والدلالات الثقافية وأنماط اللوحات عشان يتنبأ بأي لوحات أرجح إنها تطلع في المزادات القادمة — مع جمع بيانات أخلاقي وأرشيف تاريخي دائم.',
    },
    cover: 'images/Projects/SaudiPlatePredictorSystem.webp',
    disciplines: ['ai', 'swe'],
    badge: { en: 'Coming Soon', ar: 'قريباً' },
    tags: [
      { en: 'Python', ar: 'Python' },
      { en: 'Machine Learning', ar: 'تعلّم الآلة' },
      { en: 'SQLite', ar: 'SQLite' },
      { en: 'Data Science', ar: 'علوم البيانات' },
      { en: 'Forecasting', ar: 'التنبؤ' },
    ],
    links: [{ kind: 'repo', href: 'https://github.com/trookish/SaudiLicensePlatePerdictor' }],
  },
  {
    id: 'restaurant-ordering',
    title: { en: 'Restaurant Ordering System', ar: 'Restaurant Ordering System' },
    description: {
      en: 'A Java-based restaurant ordering application featuring a tree-structured menu, drink vending machine with stack-based inventory, and order queue management system.',
      ar: 'تطبيق طلبات مطاعم مبني بلغة Java فيه قائمة طعام بهيكل شجري، وآلة بيع مشروبات بنظام مخزون قائم على المكدس (Stack)، ونظام إدارة طابور الطلبات.',
    },
    cover: 'images/Projects/Restaurant Ordering System.webp',
    disciplines: ['swe'],
    tags: [
      { en: 'Java', ar: 'Java' },
      { en: 'Data Structures', ar: 'هياكل البيانات' },
      { en: 'Tree', ar: 'شجرة' },
      { en: 'Queue', ar: 'طابور' },
      { en: 'Stack', ar: 'مكدس' },
    ],
    links: [{ kind: 'repo', href: 'https://github.com/trookish/Restaurant-Ordering-System' }],
    teams: [
      {
        members: [
          { name: { en: 'Turki Almufarrej', ar: 'تركي المفرج' }, role: roleDeveloper },
          { name: { en: 'Mohammed Ababotain', ar: 'محمد ابابطين' }, role: roleDeveloper },
          { name: { en: 'Turki Alshaalan', ar: 'تركي الشعلان' }, role: roleDeveloper },
          { name: { en: 'Omar Alshuger', ar: 'عمر الشقير' }, role: roleDeveloper },
        ],
      },
    ],
  },
  {
    id: 'recipe-hub',
    title: { en: 'Recipe Hub', ar: 'Recipe Hub' },
    description: {
      en: 'A web-based recipe management application built with PHP, MySQL, HTML, CSS, and JavaScript. Features include browsing recipes, search functionality, categories, favorites, and an admin panel for managing recipes.',
      ar: 'تطبيق ويب لإدارة وصفات الطعام مبني بـ PHP و MySQL و HTML و CSS و JavaScript. يشمل تصفح الوصفات، والبحث، والتصنيفات، والمفضلة، ولوحة تحكم للمسؤول لإدارة الوصفات.',
    },
    cover: 'images/Projects/RecipeHub.webp',
    disciplines: ['swe'],
    tags: [
      { en: 'PHP', ar: 'PHP' },
      { en: 'MySQL', ar: 'MySQL' },
      { en: 'HTML', ar: 'HTML' },
      { en: 'CSS', ar: 'CSS' },
      { en: 'JavaScript', ar: 'JavaScript' },
    ],
    links: [{ kind: 'repo', href: 'https://github.com/trookish/RecipeHub' }],
    teams: [
      {
        label: { en: 'Web Systems Team:', ar: 'فريق أنظمة الويب:' },
        members: [
          { name: { en: 'Turki Alshalaan', ar: 'تركي الشعلان' }, role: roleDeveloper },
          { name: { en: 'Alwaleed Alhamdan', ar: 'الوليد الحمدان' }, role: roleDeveloper },
          { name: { en: 'Tariq Alharbi', ar: 'طارق الحربي' }, role: roleDeveloper },
          { name: { en: 'Meshari Alhussainan', ar: 'مشاري الحسينان' }, role: roleDeveloper },
        ],
      },
      {
        label: { en: 'Architecture Team:', ar: 'فريق معمارية البرمجيات:' },
        members: [
          { name: { en: 'Turki Alshalaan', ar: 'تركي الشعلان' }, role: { en: 'Architect', ar: 'معماري' } },
          { name: { en: 'Abdulrahman Alsalehi', ar: 'عبد الرحمن الصالحي' }, role: { en: 'Architect', ar: 'معماري' } },
          { ...teamFahad, role: { en: 'Architect', ar: 'معماري' } },
          { name: { en: 'Meshari Alhussainan', ar: 'مشاري الحسينان' }, role: { en: 'Architect', ar: 'معماري' } },
        ],
      },
    ],
  },
  {
    id: 'secure-check',
    title: { en: 'SecureCheck', ar: 'SecureCheck' },
    description: {
      en: 'A web-based data breach awareness platform that helps users check if their passwords and email addresses have been compromised in data breaches. This project demonstrates ethical security tool development using k-Anonymity model for privacy-preserving password checking.',
      ar: 'منصة ويب للتوعية بتسريبات البيانات، تساعد المستخدمين يتحققون إذا كلمات المرور والبريد الإلكتروني انخترقت في تسريبات سابقة. المشروع يوضح تطوير أدوات أمان أخلاقية باستخدام نموذج k-Anonymity لفحص كلمات المرور مع الحفاظ على الخصوصية.',
    },
    cover: 'images/Projects/SecureCheck.webp',
    coverContain: true,
    disciplines: ['swe'],
    tags: [
      { en: 'Python', ar: 'Python' },
      { en: 'Flask', ar: 'Flask' },
      { en: 'HTML/CSS', ar: 'HTML/CSS' },
      { en: 'API Integration', ar: 'تكامل API' },
      { en: 'Cybersecurity', ar: 'الأمن السيبراني' },
    ],
    links: [{ kind: 'repo', href: 'https://github.com/trookish/SecureCheck' }],
    teams: [
      {
        members: [
          { ...teamFahad, role: roleDeveloper },
          { name: { en: 'Turki AlShaalan', ar: 'تركي الشعلان' }, role: roleDeveloper },
          { name: { en: 'Ahmed AlAsmari', ar: 'أحمد الأسمري' }, role: roleDeveloper },
          { name: { en: 'Mushari Hussainan', ar: 'مشاري الحسينان' }, role: roleDeveloper },
        ],
      },
    ],
  },
  {
    id: 'smart-campus',
    title: { en: 'Smart Campus Services', ar: 'Smart Campus Services' },
    description: {
      en: 'A comprehensive Android application designed to provide campus services to students, including announcements, product browsing, shopping cart functionality, and contact features. Built using Java with SQLite for local data storage.',
      ar: 'تطبيق أندرويد شامل يوفر خدمات الحرم الجامعي للطلاب، من الإعلانات وتصفح المنتجات وسلة التسوق وميزات التواصل. مبني بلغة Java مع SQLite لتخزين البيانات محلياً.',
    },
    cover: 'images/Projects/SmartCampusServices.webp',
    coverContain: true,
    disciplines: ['swe'],
    tags: [
      { en: 'Java', ar: 'Java' },
      { en: 'Android', ar: 'Android' },
      { en: 'SQLite', ar: 'SQLite' },
      { en: 'MVC', ar: 'MVC' },
    ],
    links: [{ kind: 'repo', href: 'https://github.com/trookish/SmartCampusServices' }],
    teams: [
      {
        members: [
          { name: { en: 'Turki AlShaalan', ar: 'تركي الشعلان' }, role: roleDeveloper },
          { ...teamFahad, role: roleDeveloper },
          { name: { en: 'Mushari Hussainan', ar: 'مشاري الحسينان' }, role: roleDeveloper },
          { name: { en: 'Mohammed AlGhweiri', ar: 'محمد الغويري' }, role: roleDeveloper },
        ],
      },
    ],
  },
  {
    id: 'graduation-project',
    title: { en: 'Graduation Project', ar: 'مشروع التخرج' },
    description: {
      en: 'A senior graduation project (IT492) investigating game-based learning effectiveness. Designed to assess the pedagogical impact of interactive coding puzzles (Parsons Problems) in reducing learning barriers for CS students. Evaluated using structured player feedback and learning-gain metrics. Abdulaziz led agile coordination and stakeholder reporting, Turki directed implementation logic, and Saud managed levels and user testing.',
      ar: 'مشروع تخرج (IT492) يبحث في فعالية التعلم القائم على الألعاب. صممناه عشان نقيس أثر الألغاز البرمجية التفاعلية (Parsons Problems) على تقليل صعوبات التعلم عند طلاب علوم الحاسب. تم تقييمه بآراء اللاعبين المنظمة ومقاييس اكتساب المعرفة. عبدالعزيز قاد التنسيق وإعداد التقارير، تركي وجّه منطق التنفيذ، وسعود أدار المراحل واختبار المستخدمين.',
    },
    cover: 'images/Projects/SyntaxStrike.webp',
    coverContain: true,
    disciplines: ['game', 'swe'],
    tags: [
      { en: 'Educational Research', ar: 'بحث تعليمي' },
      { en: 'Pedagogy Theory', ar: 'نظرية التدريس' },
      { en: 'Agile Sprints', ar: 'سبرنتات أجايل' },
      { en: 'User Studies', ar: 'دراسات المستخدمين' },
      { en: 'QA Validation', ar: 'تحقق الجودة' },
    ],
    teams: [
      {
        members: [
          { name: { en: 'Turki Alshaalan', ar: 'تركي الشعلان' }, role: roleTurkiProg },
          { name: { en: 'Abdulaziz Almusayli', ar: 'عبد العزيز المسيلي' }, role: roleCoordinator },
          { ...teamSaud, role: roleLevel },
        ],
      },
    ],
    gallery: syntaxGallery,
  },
]
