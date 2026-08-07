// EN + AR translations for the project showcase modal:
//   - screenshot titles and descriptions per project
//   - modal labels (TECH STACK, DEVELOPMENT TEAM, TAGS, etc.)
//   - screenshot fallback titles ("Certificate / Event", etc.)
//   - modal title prefix ("SYSTEM STATUS: ...")
//
// script.js should import from this module; the strings must not live
// in script.js itself.

// ENGLISH TEXT — keep this identical to the originals that were
// hardcoded in script.js, since the dynamic translation engine looks
// them up by their rendered text.
export const en = {
    modal: {
        description: 'DESCRIPTION',
        tech_stack: 'TECH STACK',
        development_team: 'DEVELOPMENT TEAM',
        tags: 'TAGS',
        team_and_mentors: 'TEAM & MENTORS',
        title_prefix: 'SYSTEM STATUS: ',
        achievement_title_prefix: 'SYSTEM STATUS: ACHIEVEMENT_',
        certificate_event: 'Certificate / Event',
        project_screenshot: 'Project Screenshot',
    },
    projects: {
        'dungeon-puzzle': [
            { src: 'images/Projects/DungeonPuzzle/screenshot1.webp', title: 'Start Room', desc: 'The initial room featuring a wooden table, chairs, paintings, and locked iron gates.' },
            { src: 'images/Projects/DungeonPuzzle/screenshot2.webp', title: 'Dungeon Corridors', desc: 'Navigating hallways with cells, chains, and a wall sign pointing to the Key Room.' },
            { src: 'images/Projects/DungeonPuzzle/screenshot3.webp', title: 'Torture Chamber', desc: 'A large room containing torture devices, executioner blocks, wooden horses, hanging cages, and iron maidens.' },
            { src: 'images/Projects/DungeonPuzzle/screenshot4.webp', title: 'The Armory', desc: 'A room with racks of swords and shields, candle chandeliers, and a hanging red banner.' },
            { src: 'images/Projects/DungeonPuzzle/screenshot5.webp', title: 'Lava Trap Room', desc: 'Crossing a narrow stone bridge over boiling lava while dodging giant swinging blades.' },
            { src: 'images/Projects/DungeonPuzzle/screenshot6.webp', title: 'Treasure Corner', desc: 'A corner housing ancient wooden chests.' },
        ],
        'scary-library': [
            { src: 'images/Projects/ScaryLibrary/screenshot1.webp', title: 'The Book Puzzle Shelf', desc: 'A stone wall shelf with slots for 5 books, instructing the player to place them in order.' },
            { src: 'images/Projects/ScaryLibrary/screenshot2.webp', title: 'AI Monster Patrolling', desc: 'Creepy white-faced monster patrolling the library corridors as a red book sits on a table.' },
            { src: 'images/Projects/ScaryLibrary/screenshot3.webp', title: 'Library Jumpscare', desc: 'Horrifying moment the player is caught close-up by the monster.' },
        ],
        'knight-with-gun': [
            { src: 'images/Projects/KnightWithGun/screenshot1.webp', title: 'Game Main Menu', desc: 'Start interface with a fully armored knight holding a glowing yellow cube weapon.' },
            { src: 'images/Projects/KnightWithGun/screenshot2.webp', title: 'Bridge Combat Arena', desc: 'Fighting glowing red cylinder enemies on a narrow stone bridge under a crimson sky.' },
            { src: 'images/Projects/KnightWithGun/screenshot3.webp', title: 'Pause Menu Interface', desc: 'Retro-style pause overlay with Resume and Quit buttons.' },
        ],
        'the-hidden-kanz': [
            { src: 'images/Projects/TheHiddenKanz/screenshot1.webp', title: 'Main Menu Scene', desc: 'Main menu showcasing a carved stone tomb entrance in desert sand dunes.' },
            { src: 'images/Projects/TheHiddenKanz/screenshot2.webp', title: 'First-Person Combat View', desc: 'Stone corridor exploration holding a sword and a green magical flame against skeleton enemies.' },
            { src: 'images/Projects/TheHiddenKanz/screenshot3.webp', title: 'Magic Ability Casting', desc: 'Engaging skeleton warrior while preparing to cast a pink magic spell.' },
            { src: 'images/Projects/TheHiddenKanz/screenshot4.webp', title: 'Statue Chamber', desc: 'Spacious room lined with tall hooded statues, archway tunnels, and hanging cages.' },
        ],
        'syntax-strike': [
            { src: 'images/Projects/SyntaxStrike/screenshot1.webp', title: 'Various Enemy Types in Combat', desc: 'Real-time combat in the facility showing the player robot fighting multiple enemy types (Shooter Robots, Spider Bots, and Turrets) using the sword and shield.' },
            { src: 'images/Projects/SyntaxStrike/screenshot2.webp', title: 'Spider Enemies Attacking', desc: 'Engaging fast Spider Bots and ranged enemies inside the warehouse facility. Ranged enemies can fire projectiles and self-destruct if they get too close.' },
            { src: 'images/Projects/SyntaxStrike/screenshot3.webp', title: 'Hacking Tool Pickup in the Environment', desc: 'Locating the Hacking Tool in the facility. Acquiring the tool allows the player to interact with terminals and hack disabled enemies to solve programming puzzles.' },
            { src: 'images/Projects/SyntaxStrike/screenshot4.webp', title: 'Hacking Tool Acquired Notification', desc: 'On-screen notification upon picking up the hacking tool, preparing the student to hack enemies and override secure doors.' },
            { src: 'images/Projects/SyntaxStrike/screenshot5.webp', title: 'Electrical Water Hazard', desc: 'Navigating environmental hazards. The student must avoid electrical pools or use a nearby control console to disable the hazard before traversing.' },
            { src: 'images/Projects/SyntaxStrike/screenshot6.webp', title: 'Final Boss Encounter', desc: 'The final encounter with the Boss robot. The player must dodge shockwaves and stomp attacks, reduce the Boss\'s health to zero, and solve a hard programming puzzle to win.' },
            { src: 'images/Projects/SyntaxStrike/screenshot7.webp', title: 'Level Completion Score Scene', desc: 'Level completion scoreboard tracking player statistics including enemies defeated, programming puzzle accuracy, time bonuses, and final score.' },
        ],
        'iwjats': [
            { type: 'video', id: '1_v0l9b5qmU', title: 'Game Trailer', desc: 'Watch the full gameplay trailer — a routine maintenance job at the nuclear facility, one loose screw away from complete disaster.' },
            { src: 'images/Projects/IWJATS/screenshot1.webp', title: 'One Loose Screw', desc: 'A routine maintenance job at the nuclear facility — one loose screw away from complete disaster.' },
            { src: 'images/Projects/IWJATS/screenshot2.webp', title: 'Radioactive Chaos', desc: 'The reactor goes critical and the facility starts to collapse as the radioactive gas cloud closes in.' },
            { src: 'images/Projects/IWJATS/screenshot3.webp', title: 'Rescue Everyone', desc: 'Racing to save the babies, kittens, dogs, and the mysterious IMPORTANT person before reaching the emergency bunker.' },
        ],
    },
    videos: {},
};

// ARABIC TEXT — modern Saudi colloquial (عامية سعودية حديثة).
export const ar = {
    modal: {
        description: 'الوصف',
        tech_stack: 'التقنيات',
        development_team: 'فريق التطوير',
        tags: 'التصنيفات',
        team_and_mentors: 'الفريق والموجّهين',
        title_prefix: 'حالة النظام: ',
        achievement_title_prefix: 'حالة النظام: إنجاز_',
        certificate_event: 'شهادة / فعالية',
        project_screenshot: 'صورة شاشة للمشروع',
    },
    projects: {
        'dungeon-puzzle': [
            { src: 'images/Projects/DungeonPuzzle/screenshot1.webp', title: 'غرفة البداية', desc: 'أول غرفة فيها طاولة خشبية وكراسي ولوحات وبوابات حديدية مقفوله.' },
            { src: 'images/Projects/DungeonPuzzle/screenshot2.webp', title: 'ممرات السجن', desc: 'تمشي بممرات فيها زنازين وسلاسل ولوحة جدارية توصلك لغرفة المفتاح.' },
            { src: 'images/Projects/DungeonPuzzle/screenshot3.webp', title: 'غرفة التعذيب', desc: 'غرفة كبيرة فيها أدوات تعذيب وجلطات إعدام وأحصنة خشبية وأقفاص معلقة وصناديق حديدية.' },
            { src: 'images/Projects/DungeonPuzzle/screenshot4.webp', title: 'مستودع الأسلحة', desc: 'غرفة فيها رفوف سيوف ودروع وثريات شموع وراية حمراء معلقة.' },
            { src: 'images/Projects/DungeonPuzzle/screenshot5.webp', title: 'غرفة فخ الحمم', desc: 'تعبر جسر حجري ضيق فوق حمم مغليه وتتفادى شفرات ضخمة تتأرجح.' },
            { src: 'images/Projects/DungeonPuzzle/screenshot6.webp', title: 'ركن الكنز', desc: 'ركن فيه صناديق خشبية من القديم.' },
        ],
        'scary-library': [
            { src: 'images/Projects/ScaryLibrary/screenshot1.webp', title: 'رفّ لغز الكتب', desc: 'رف حجري فيه خمس خانات يسوي فيها اللاعب الكتب بالترتيب الصحيح.' },
            { src: 'images/Projects/ScaryLibrary/screenshot2.webp', title: 'وحش الذكاء الاصطناعي في دورية', desc: 'وحش مخيف بوجه أبيض يلف على ممرات المكتبة وكتاب أحمر قاعد على الطاولة.' },
            { src: 'images/Projects/ScaryLibrary/screenshot3.webp', title: 'لفعة المكتبة', desc: 'لحظة مرعبة لما الوحش يمسك اللاعب عن قريب.' },
        ],
        'knight-with-gun': [
            { src: 'images/Projects/KnightWithGun/screenshot1.webp', title: 'القائمة الرئيسية للعبة', desc: 'واجهة البداية مع فارس مدرّع بالكامل ويمسك سلاح مكعّب أصفر متوهّج.' },
            { src: 'images/Projects/KnightWithGun/screenshot2.webp', title: 'ساحة قتال الجسر', desc: 'قتال أعداء أسطوانية متوهجة باللون الأحمر فوق جسر حجري ضيق تحت سما قرمزية.' },
            { src: 'images/Projects/KnightWithGun/screenshot3.webp', title: 'قائمة التوقّف المؤقت', desc: 'شاشة إيقاف مؤقت بأسلوب ريترو فيها زرارين: استئناف أو خروج.' },
        ],
        'the-hidden-kanz': [
            { src: 'images/Projects/TheHiddenKanz/screenshot1.webp', title: 'مشهد القائمة الرئيسية', desc: 'القائمة تعرض مدخل مقبرة حجرية منحوتة وسط الكثبان الرملية الصحراوية.' },
            { src: 'images/Projects/TheHiddenKanz/screenshot2.webp', title: 'القتال بمنظور أول', desc: 'استكشاف ممر حجري وأنت ماسك سيف ولهب سحري أخضر ضد الهياكل العظمية.' },
            { src: 'images/Projects/TheHiddenKanz/screenshot3.webp', title: 'إلقاء قدرة سحرية', desc: 'تواجه محارب هيكل عظمي وانتا قاعد تحضّر إلقاء تعويذة سحرية وردية.' },
            { src: 'images/Projects/TheHiddenKanz/screenshot4.webp', title: 'غرفة التماثيل', desc: 'غرفة واسعة حولها تماثيل طويلة بقلانس وممرات مقوّسة وأقفاص معلقة.' },
        ],
        'syntax-strike': [
            { src: 'images/Projects/SyntaxStrike/screenshot1.webp', title: 'أنواع أعداء مختلفة في القتال', desc: 'قتال مباشر في المنشأة يبيّن روبوت اللاعب وهو يواجه أنواعاً متعددة من الأعداء (شوتر روبوت، عناكب آلية، ورشاشات) بالسيف والدرع.' },
            { src: 'images/Projects/SyntaxStrike/screenshot2.webp', title: 'هجوم العناكب الآلية', desc: 'تواجهة العناكب الآلية السريعة والأعداء المضادين الدين من المدى داخل المخزن. أعداء المدى يرمون قذائف وتنفجر القريبين منهم.' },
            { src: 'images/Projects/SyntaxStrike/screenshot3.webp', title: 'أخذ أداة الاختراق', desc: 'تعرف مكان أداة الاختراق في المنشأة. وأخذك الأداة تخليك تتعامل مع المحطات وتخترق أعداء معطلين لحل ألغاز برمجية.' },
            { src: 'images/Projects/SyntaxStrike/screenshot4.webp', title: 'إشعار أخذ أداة الاختراق', desc: 'إشعار يظهر على الشاشة لما تلتقط أداة الاختراق، ويجهّز الطالب يخترق الأعداء ويفتح الأبواب المؤمية.' },
            { src: 'images/Projects/SyntaxStrike/screenshot5.webp', title: 'خطر الماء المكهرب', desc: 'التعامل مع المخاطر البيئية. لازم الطالب يتجنّب البرك المكهربة أو يستخدم لوحة تحكم قروب عشان يوقف الخطر قبل العبور.' },
            { src: 'images/Projects/SyntaxStrike/screenshot6.webp', title: 'مواجهة الزعيم النهائي', desc: 'المواجهة الأخيرة مع روبوت الزعيم — لازم تتفادى موجات الضغط وضربات الدس، وتخلي صحة الزعيم صفر، وتحل لغز برمجي صعب عشان تفوز.' },
            { src: 'images/Projects/SyntaxStrike/screenshot7.webp', title: 'مشهد النتيجة النهائية', desc: 'لوحة النهاية تعرض كل إحصائياتك: الأعداء اللي هزمتهم، ودقتك في حل الألغاز البرمجية، ومكافآت الوقت، والنتيجة النهائية.' },
        ],
        'iwjats': [
            { type: 'video', id: '1_v0l9b5qmU', title: 'العرض الترويجي للعبة', desc: 'شاهد العرض الترويجي الكامل — مهمة صيانة روتينية في المنشأة النووية، برغي واحد يبعدك عن الكارثة الكاملة.' },
            { src: 'images/Projects/IWJATS/screenshot1.webp', title: 'برغي واحد مرتخي', desc: 'مهمة صيانة روتينية في المنشأة النووية — برغي واحد يبعدك عن الكارثة الكاملة.' },
            { src: 'images/Projects/IWJATS/screenshot2.webp', title: 'فوضى إشعاعية', desc: 'المفاعل يوصل مرحلة الخطر ويبتدي المبنى بالانهيار بينما سحابة الغاز المشع تقرتب.' },
            { src: 'images/Projects/IWJATS/screenshot3.webp', title: 'أنقذ الجميع', desc: 'سباق تنقذ فيه الرضع والقطط والكلاب والشخص المهم الغامض قبل ما توصل للملجأ.' },
        ],
    },
    videos: {},
};
