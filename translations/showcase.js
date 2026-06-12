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
    },
};

// ARABIC TEXT — proper, readable Arabic for each EN string above.
export const ar = {
    modal: {
        description: 'الوصف',
        tech_stack: 'التقنيات المستخدمة',
        development_team: 'فريق التطوير',
        tags: 'الأوسمة',
        team_and_mentors: 'الفريق والموجهين',
        title_prefix: 'حالة النظام: عرض_',
        achievement_title_prefix: 'حالة النظام: إنجاز_',
        certificate_event: 'شهادة / فعالية',
        project_screenshot: 'لقطة شاشة للمشروع',
    },
    projects: {
        'dungeon-puzzle': [
            { src: 'images/Projects/DungeonPuzzle/screenshot1.webp', title: 'غرفة البداية', desc: 'الغرفة الأولى التي تضم طاولة خشبية، كراسي، لوحات، وبوابات حديدية مغلقة.' },
            { src: 'images/Projects/DungeonPuzzle/screenshot2.webp', title: 'ممرات السجن', desc: 'التنقل عبر الممرات التي تحتوي على زنازين، سلاسل، ولوحة حائط تشير إلى غرفة المفتاح.' },
            { src: 'images/Projects/DungeonPuzzle/screenshot3.webp', title: 'غرفة التعذيب', desc: 'غرفة واسعة تحتوي على أدوات تعذيب، كتلة إعدام، أحصنة خشبية، أقفاص معلقة، وتابوت حديدي (Iron Maidens).' },
            { src: 'images/Projects/DungeonPuzzle/screenshot4.webp', title: 'مستودع الأسلحة', desc: 'غرفة تحتوي على رفوف للسيوف والدروع، ثريات شموع، وراية حمراء معلقة.' },
            { src: 'images/Projects/DungeonPuzzle/screenshot5.webp', title: 'غرفة فخ الحمم', desc: 'عبور جسر حجري ضيق فوق حمم بركانية مغلية مع تفادي شفرات ضخمة متأرجحة.' },
            { src: 'images/Projects/DungeonPuzzle/screenshot6.webp', title: 'ركن الكنز', desc: 'ركن يحتوي على صناديق خشبية أثرية.' },
        ],
        'scary-library': [
            { src: 'images/Projects/ScaryLibrary/screenshot1.webp', title: 'رف لغز الكتب', desc: 'رف حائطي حجري مع فتحات لخمسة كتب، يوجه اللاعب لترتيبها بشكل صحيح.' },
            { src: 'images/Projects/ScaryLibrary/screenshot2.webp', title: 'وحش الذكاء الاصطناعي في دورية', desc: 'وحش مخيف ذو وجه أبيض يقوم بدورية في ممرات المكتبة بينما يستقر كتاب أحمر على الطاولة.' },
            { src: 'images/Projects/ScaryLibrary/screenshot3.webp', title: 'رعب المفاجأة في المكتبة', desc: 'اللحظة المرعبة عندما يمسك الوحش باللاعب عن قرب.' },
        ],
        'knight-with-gun': [
            { src: 'images/Projects/KnightWithGun/screenshot1.webp', title: 'القائمة الرئيسية للعبة', desc: 'واجهة البدء مع فارس مدرع بالكامل يحمل سلاحاً مكعباً أصفر متوهجاً.' },
            { src: 'images/Projects/KnightWithGun/screenshot2.webp', title: 'ساحة قتال الجسر', desc: 'قتال أعداء أسطوانيين متوهجين باللون الأحمر على جسر حجري ضيق تحت سماء قرمزية.' },
            { src: 'images/Projects/KnightWithGun/screenshot3.webp', title: 'واجهة قائمة التوقف المؤقت', desc: 'واجهة توقف مؤقت كلاسيكية مع زرّي الاسئناف والخروج.' },
        ],
        'the-hidden-kanz': [
            { src: 'images/Projects/TheHiddenKanz/screenshot1.webp', title: 'مشهد القائمة الرئيسية', desc: 'القائمة الرئيسية تستعرض مدخل مقبرة حجرية منحوتة وسط الكثبان الرملية الصحراوية.' },
            { src: 'images/Projects/TheHiddenKanz/screenshot2.webp', title: 'عرض القتال من منظور الشخص الأول', desc: 'استكشاف ممر حجري مع حمل سيف ولهب سحري أخضر لمواجهة الأعداء من الهياكل العظمية.' },
            { src: 'images/Projects/TheHiddenKanz/screenshot3.webp', title: 'إلقاء القدرة السحرية', desc: 'مواجهة محارب هيكل عظمي أثناء الاستعداد لإلقاء تعويذة سحرية وردية.' },
            { src: 'images/Projects/TheHiddenKanz/screenshot4.webp', title: 'غرفة التماثيل', desc: 'غرفة فسيحة محاطة بتماثيل طويلة ذات قلنسوات، ممرات مقوسة، وأقفاص معلقة.' },
        ],
        'syntax-strike': [
            { src: 'images/Projects/SyntaxStrike/screenshot1.webp', title: 'أنواع مختلفة من الأعداء أثناء القتال', desc: 'قتال فوري في المنشأة يظهر الروبوت اللاعب يقاتل أنواعاً متعددة من الأعداء (الروبوتات المطلقة للنار، العناكب الآلية، والرشاشات المثبتة) باستخدام السيف والدرع.' },
            { src: 'images/Projects/SyntaxStrike/screenshot2.webp', title: 'هجوم أعداء العنكبوت الآلي', desc: 'مواجهة العناكب الآلية السريعة والأعداء بعيدي المدى داخل منشأة المستودع. يمكن للأعداء بعيدي المدى إطلاق قذائف وتفجير أنفسهم إذا اقتربوا كثيراً.' },
            { src: 'images/Projects/SyntaxStrike/screenshot3.webp', title: 'التقاط أداة الاختراق في البيئة', desc: 'تحديد موقع أداة الاختراق في المنشأة. يتيح الحصول على الأداة للاعب التفاعل مع المحطات واختراق الأعداء المعطلين لحل ألغاز البرمجة.' },
            { src: 'images/Projects/SyntaxStrike/screenshot4.webp', title: 'إشعار الحصول على أداة الاختراق', desc: 'إشعار يظهر على الشاشة عند التقاط أداة الاختراق، مما يجهز الطالب لاختراق الأعداء وفتح الأبواب المؤمّنة.' },
            { src: 'images/Projects/SyntaxStrike/screenshot5.webp', title: 'خطر المياه المكهربة', desc: 'تخطي المخاطر البيئية. يجب على الطالب تجنب البرك المكهربة أو استخدام وحدة تحكم قريبة لتعطيل الكهرباء قبل العبور.' },
            { src: 'images/Projects/SyntaxStrike/screenshot6.webp', title: 'مواجهة الزعيم النهائي', desc: 'المواجهة الأخيرة مع الروبوت الزعيم. يجب على اللاعب تفادي الموجات الصادمة وهجمات الدهس، وتقليل صحة الزعيم إلى الصفر، وحل لغز برمجي صعب للفوز.' },
            { src: 'images/Projects/SyntaxStrike/screenshot7.webp', title: 'مشهد نتيجة إكمال المرحلة', desc: 'لوحة إكمال المرحلة التي تتبع إحصائيات اللاعب بما في ذلك الأعداء المهزومين، ودقة حل الألغاز البرمجية، والمكافآت الزمنية، والنتيجة النهائية.' },
        ],
    },
};
