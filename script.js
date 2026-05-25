/**
 * Turki Alshaalan Portfolio Website
 * Interactive functionality and animations
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize all functionality
    initNavigation();
    initMobileMenu();
    initThemeToggle();
    initSoundToggle();
    initLanguageToggle();
    initHoverSounds();
    initClickSounds();
    initRevealAnimations();
    initSmoothScroll();
    initParallax();
    initPdfExport();
    // initAchievementExpand(); // Retired in favor of unified showcase popup
    initProjectShowcase();
});

/**
 * Navigation - Sticky navbar with scroll effects
 */
function initNavigation() {
    const navbar = document.getElementById('navbar');
    const scrollThreshold = 50;

    let navTicking = false;
    window.addEventListener('scroll', () => {
        if (!navTicking) {
            window.requestAnimationFrame(() => {
                const scrollY = window.scrollY;

                if (scrollY > scrollThreshold) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }
                navTicking = false;
            });
            navTicking = true;
        }
    }, { passive: true });

    // Add active state to nav links based on current section (using high-performance IntersectionObserver)
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    if ('IntersectionObserver' in window) {
        const observerOptions = {
            root: null,
            rootMargin: '-30% 0px -60% 0px',
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const currentId = entry.target.getAttribute('id');
                    navLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${currentId}`) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        }, observerOptions);

        sections.forEach(section => {
            observer.observe(section);
        });
    } else {
        // Fallback for older browsers
        let fallbackTicking = false;
        window.addEventListener('scroll', () => {
            if (!fallbackTicking) {
                window.requestAnimationFrame(() => {
                    const scrollY = window.scrollY;
                    let current = '';

                    sections.forEach(section => {
                        const sectionTop = section.offsetTop;
                        if (scrollY >= sectionTop - 200) {
                            current = section.getAttribute('id');
                        }
                    });

                    navLinks.forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === `#${current}`) {
                            link.classList.add('active');
                        }
                    });
                    fallbackTicking = false;
                });
                fallbackTicking = true;
            }
        }, { passive: true });
    }
}

/**
 * Mobile Menu - Hamburger toggle
 */
function initMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close menu when clicking a link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        }
    });
}

/**
 * Theme Toggle - Dark/Light mode switcher
 */
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const html = document.documentElement;

    // Check for saved theme preference or default to dark
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        html.setAttribute('data-theme', 'light');
    }

    themeToggle.addEventListener('click', () => {
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        if (newTheme === 'light') {
            html.setAttribute('data-theme', 'light');
        } else {
            html.removeAttribute('data-theme');
        }

        // Save preference
        localStorage.setItem('theme', newTheme);
    });
}

/**
 * PDF Export - Export website to PDF
 */
function initPdfExport() {
    const pdfExportBtn = document.getElementById('pdfExport');

    if (pdfExportBtn) {
        pdfExportBtn.addEventListener('click', () => {
            // Trigger browser print dialog which can save as PDF
            window.print();
        });
    }
}

/**
 * Sound Toggle - Mute/Unmute website sounds
 */
function initSoundToggle() {
    const soundToggle = document.getElementById('soundToggle');
    const body = document.body;
    let soundEnabled = true;

    // Check for saved sound preference
    const savedSound = localStorage.getItem('sound');
    if (savedSound === 'false') {
        soundEnabled = false;
        body.classList.add('sound-muted');
    }

    soundToggle.addEventListener('click', () => {
        soundEnabled = !soundEnabled;

        if (soundEnabled) {
            body.classList.remove('sound-muted');
        } else {
            body.classList.add('sound-muted');
        }

        // Save preference
        localStorage.setItem('sound', soundEnabled);

        // Dispatch event for other scripts to handle
        window.dispatchEvent(new CustomEvent('soundToggle', { detail: { enabled: soundEnabled } }));
    });
}

/**
 * Hover Sounds - Play sound on hover (excluding game elements)
 */
function initHoverSounds() {
    // Create hover sound
    const hoverSound = new Audio('Sounds/Normal/Hover.wav');
    hoverSound.volume = 0.3;

    // Function to add hover listener to element
    const addHoverListener = (element) => {
        // Skip game-related elements
        if (element.closest('.game-modal') ||
            element.closest('.mobile-controls') ||
            element.closest('#gameModal')) {
            return;
        }

        element.addEventListener('mouseenter', () => {
            // Check if sound is enabled
            if (localStorage.getItem('sound') !== 'false') {
                hoverSound.currentTime = 0;
                hoverSound.play().catch(() => { });
            }
        });
    };

    // All hoverable elements on the page (blocks only - no text)
    const hoverableSelectors = [
        'a', 'button', 'input', 'select', 'textarea',
        '.nav-link', '.nav-logo', '.play-icon',
        '.project-card',
        '.skill-category',
        '.education-card',
        '.certification-card',
        '.contact-item',
        '.experience-card',
        '.theme-toggle', '.sound-toggle', '.hamburger',
        '.social-link',
        '.hero-image',
        '.highlight-item'
    ];

    // Apply to all selectors
    hoverableSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(addHoverListener);
    });
}

/**
 * Click Sounds - Play sound on click (excluding game elements)
 */
function initClickSounds() {
    // Create click sound
    const clickSound = new Audio('Sounds/Normal/Click.wav');
    clickSound.volume = 0.4;

    // Function to add click listener to element
    const addClickListener = (element) => {
        // Skip game-related elements
        if (element.closest('.game-modal') ||
            element.closest('.mobile-controls') ||
            element.closest('#gameModal')) {
            return;
        }

        element.addEventListener('click', () => {
            // Check if sound is enabled
            if (localStorage.getItem('sound') !== 'false') {
                clickSound.currentTime = 0;
                clickSound.play().catch(() => { });
            }
        });
    };

    // All clickable elements on the page
    const clickableSelectors = [
        'a', 'button', 'input', 'select', 'textarea',
        '.nav-link', '.nav-logo', '.play-icon',
        '.project-card', '.project-image',
        '.education-card',
        '.certification-card',
        '.contact-item',
        '.experience-card',
        '.theme-toggle', '.sound-toggle', '.hamburger',
        '.social-link',
        '.hero-image',
        '.highlight-item'
    ];

    // Apply to all selectors
    clickableSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(addClickListener);
    });
}

/**
 * Reveal Animations - Section fade-in on scroll
 */
function initRevealAnimations() {
    // Select elements to reveal, ensuring they match actual classes in index.html.
    // Added: .experience-card, .achievement-card, .skill-row. Removed: .skill-category, .timeline-item
    const revealElements = document.querySelectorAll(
        '.section-title, .section-subtitle, .about-text, .about-highlights, ' +
        '.project-card, .experience-card, .skill-row, .education-card, ' +
        '.certification-card, .contact-item, .achievement-card'
    );

    // Apply staggered transition delay once during initialization to avoid layouts/reflows on scroll
    revealElements.forEach((element, index) => {
        const delay = (index % 4) * 0.1;
        element.style.transitionDelay = `${delay}s`;
    });

    if ('IntersectionObserver' in window) {
        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -80px 0px',
            threshold: 0.05
        };

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('reveal', 'active');
                    obs.unobserve(entry.target); // Stop observing once revealed!
                }
            });
        }, observerOptions);

        revealElements.forEach(el => observer.observe(el));
    } else {
        // Fallback for older browsers
        const revealOnScroll = () => {
            const windowHeight = window.innerHeight;
            const revealPoint = 100;

            revealElements.forEach(element => {
                if (element.classList.contains('active')) return;
                
                const elementTop = element.getBoundingClientRect().top;
                if (elementTop < windowHeight - revealPoint) {
                    element.classList.add('reveal', 'active');
                }
            });
        };

        revealOnScroll();
        
        let revealTicking = false;
        window.addEventListener('scroll', () => {
            if (!revealTicking) {
                window.requestAnimationFrame(() => {
                    revealOnScroll();
                    revealTicking = false;
                });
                revealTicking = true;
            }
        }, { passive: true });
    }
}

/**
 * Smooth Scroll - Anchor link navigation
 */
function initSmoothScroll() {
    // Exclude the showcase details link since its href starts with '#' initially
    // but gets dynamically updated to a real URL later.
    const links = document.querySelectorAll('a[href^="#"]:not(#showcase-details-link)');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');

            // If the href has been dynamically updated to an external link/non-anchor,
            // do not prevent default navigation.
            if (!targetId || !targetId.startsWith('#')) return;

            e.preventDefault();

            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/**
 * Parallax Effect - Subtle depth on scroll
 */
function initParallax() {
    const heroBackground = document.querySelector('.hero-background');

    if (heroBackground) {
        let parallaxTicking = false;
        window.addEventListener('scroll', () => {
            if (!parallaxTicking) {
                window.requestAnimationFrame(() => {
                    const scrolled = window.scrollY;
                    const rate = scrolled * 0.3;

                    heroBackground.style.transform = `translateY(${rate}px)`;
                    parallaxTicking = false;
                });
                parallaxTicking = true;
            }
        }, { passive: true });

        // Reset parallax transform before print so background isn't shifted off-screen
        window.addEventListener('beforeprint', () => {
            heroBackground.style.transform = 'translateY(0)';
        });

        window.addEventListener('afterprint', () => {
            const scrolled = window.scrollY;
            const rate = scrolled * 0.3;
            heroBackground.style.transform = `translateY(${rate}px)`;
        }, { passive: true });
    }
}

// Obsolete skill progress bars, unused debounce helper, and duplicate top-level observer block removed.

/**
 * LinkedIn Navigation - Make sections clickable to LinkedIn
 */
// Project expand functionality retired in favor of unified showcase popup.

// Achievement Expand Functionality retired in favor of unified showcase popup.
/*
function initAchievementExpand() {
    const achievementCards = document.querySelectorAll('.achievement-card');

    achievementCards.forEach(card => {
        const header = card.querySelector('.achievement-header');
        if (!header) return;

        header.addEventListener('click', () => {
            // Check if this card is already expanded
            const isExpanded = card.classList.contains('expanded');

            // Close all achievement cards first
            achievementCards.forEach(c => c.classList.remove('expanded'));

            // If it wasn't expanded before, expand it now
            if (!isExpanded) {
                card.classList.add('expanded');
            }
        });

        // Also allow Enter key to toggle
        header.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const isExpanded = card.classList.contains('expanded');
                achievementCards.forEach(c => c.classList.remove('expanded'));
                if (!isExpanded) {
                    card.classList.add('expanded');
                }
            }
        });

        // Make header focusable
        header.setAttribute('tabindex', '0');
        header.setAttribute('role', 'button');
    });
}
*/

// Certificate Modal Functions
function openCertModal(imageSrc) {
    const modal = document.getElementById('certModal');
    const modalImg = document.getElementById('certModalImage');
    modalImg.src = imageSrc;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCertModal() {
    const modal = document.getElementById('certModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeCertModal();
    }
});

/**
 * Game Projects Showcase Modal Logic
 * Controls open/close triggers, dynamic screenshot rendering, and slideshow gallery
 */
function initProjectShowcase() {
    const modal = document.getElementById('projectShowcaseModal');
    if (!modal) return;

    const projectCards = document.querySelectorAll('.project-card');
    const closeBtn = modal.querySelector('.ss-close-btn');

    // Gallery Elements
    const mainImg = document.getElementById('showcase-main-image');
    const imgTitle = document.getElementById('showcase-image-title');
    const imgCounter = document.getElementById('showcase-image-counter');
    const imgDesc = document.getElementById('showcase-image-desc');
    const prevArrow = modal.querySelector('.prev-arrow');
    const nextArrow = modal.querySelector('.next-arrow');
    const thumbnailsGrid = document.getElementById('showcase-thumbnails-grid');
    const modalTitleElem = document.getElementById('showcaseModalTitle');
    const captionContainer = document.getElementById('showcase-caption-container');

    // Details Column Elements
    const detailsTitle = document.getElementById('showcase-details-title');
    const subtitleElem = document.getElementById('showcase-details-subtitle');
    const detailsDesc = document.getElementById('showcase-details-desc');
    const tagsLabel = document.getElementById('showcase-details-tags-label');
    const detailsTags = document.getElementById('showcase-details-tags');
    const teamLabel = document.getElementById('showcase-details-team-label');

    // Pre-instantiated shared sounds for performance
    const hoverSound = new Audio('Sounds/Normal/Hover.wav');
    hoverSound.volume = 0.3;
    const clickSound = new Audio('Sounds/Normal/Click.wav');
    clickSound.volume = 0.4;
    const openSound = new Audio('Sounds/Game/windowopen.wav');
    openSound.volume = 0.3;
    const detailsTeamContainer = document.getElementById('showcase-details-team-container');
    const detailsTeam = document.getElementById('showcase-details-team');
    const detailsLink = document.getElementById('showcase-details-link');

    let currentProject = '';
    let currentIndex = 0;
    let screenshotsList = [];

    const projectData = {
        'dungeon-puzzle': {
            screenshots: {
                en: [
                    {
                        src: 'images/Projects/DungeonPuzzle/screenshot1.webp',
                        title: 'Start Room',
                        desc: 'The initial room featuring a wooden table, chairs, paintings, and locked iron gates.'
                    },
                    {
                        src: 'images/Projects/DungeonPuzzle/screenshot2.webp',
                        title: 'Dungeon Corridors',
                        desc: 'Navigating hallways with cells, chains, and a wall sign pointing to the Key Room.'
                    },
                    {
                        src: 'images/Projects/DungeonPuzzle/screenshot3.webp',
                        title: 'Torture Chamber',
                        desc: 'A large room containing torture devices, executioner blocks, wooden horses, hanging cages, and iron maidens.'
                    },
                    {
                        src: 'images/Projects/DungeonPuzzle/screenshot4.webp',
                        title: 'The Armory',
                        desc: 'A room with racks of swords and shields, candle chandeliers, and a hanging red banner.'
                    },
                    {
                        src: 'images/Projects/DungeonPuzzle/screenshot5.webp',
                        title: 'Lava Trap Room',
                        desc: 'Crossing a narrow stone bridge over boiling lava while dodging giant swinging blades.'
                    },
                    {
                        src: 'images/Projects/DungeonPuzzle/screenshot6.webp',
                        title: 'Treasure Corner',
                        desc: 'A corner housing ancient wooden chests.'
                    }
                ],
                ar: [
                    {
                        src: 'images/Projects/DungeonPuzzle/screenshot1.webp',
                        title: 'غرفة البداية',
                        desc: 'الغرفة الأولية التي تضم طاولة خشبية، كراسي، لوحات، وبوابات حديدية مغلقة.'
                    },
                    {
                        src: 'images/Projects/DungeonPuzzle/screenshot2.webp',
                        title: 'ممرات السجن',
                        desc: 'التنقل عبر الممرات التي تحتوي على زنازين، سلاسل، ولوحة حائط تشير إلى غرفة المفتاح.'
                    },
                    {
                        src: 'images/Projects/DungeonPuzzle/screenshot3.webp',
                        title: 'غرفة التعذيب',
                        desc: 'غرفة واسعة تحتوي على أدوات تعذيب، كتل إعدام، أحصنة خشبية، أقفاص معلقة، وتابوت حديدي (Iron Maidens).'
                    },
                    {
                        src: 'images/Projects/DungeonPuzzle/screenshot4.webp',
                        title: 'مستودع الأسلحة',
                        desc: 'غرفة تحتوي على رفوف للسيوف والدروع، ثريات شموع، وراية حمراء معلقة.'
                    },
                    {
                        src: 'images/Projects/DungeonPuzzle/screenshot5.webp',
                        title: 'غرفة فخ الحمم',
                        desc: 'عبور جسر حجري ضيق فوق حمم بركانية مغلية مع تفادي شفرات ضخمة متأرجحة.'
                    },
                    {
                        src: 'images/Projects/DungeonPuzzle/screenshot6.webp',
                        title: 'ركن الكنز',
                        desc: 'ركن يحتوي على صناديق خشبية أثرية.'
                    }
                ]
            }
        },
        'scary-library': {
            screenshots: {
                en: [
                    {
                        src: 'images/Projects/ScaryLibrary/screenshot1.webp',
                        title: 'The Book Puzzle Shelf',
                        desc: 'A stone wall shelf with slots for 5 books, instructing the player to place them in order.'
                    },
                    {
                        src: 'images/Projects/ScaryLibrary/screenshot2.webp',
                        title: 'AI Monster Patrolling',
                        desc: 'Creepy white-faced monster patrolling the library corridors as a red book sits on a table.'
                    },
                    {
                        src: 'images/Projects/ScaryLibrary/screenshot3.webp',
                        title: 'Library Jumpscare',
                        desc: 'Horrifying moment the player is caught close-up by the monster.'
                    }
                ],
                ar: [
                    {
                        src: 'images/Projects/ScaryLibrary/screenshot1.webp',
                        title: 'رف لغز الكتب',
                        desc: 'رف حائطي حجري مع فتحات لخمسة كتب، يوجه اللاعب لترتيبها بشكل صحيح.'
                    },
                    {
                        src: 'images/Projects/ScaryLibrary/screenshot2.webp',
                        title: 'وحش الذكاء الاصطناعي في دورية',
                        desc: 'وحش مخيف ذو وجه أبيض يقوم بدورية في ممرات المكتبة بينما يستقر كتاب أحمر على الطاولة.'
                    },
                    {
                        src: 'images/Projects/ScaryLibrary/screenshot3.webp',
                        title: 'رعب المفاجأة في المكتبة',
                        desc: 'اللحظة المرعبة عندما يمسك الوحش باللاعب عن قرب.'
                    }
                ]
            }
        },
        'knight-with-gun': {
            screenshots: {
                en: [
                    {
                        src: 'images/Projects/KnightWithGun/screenshot1.webp',
                        title: 'Game Main Menu',
                        desc: 'Start interface with a fully armored knight holding a glowing yellow cube weapon.'
                    },
                    {
                        src: 'images/Projects/KnightWithGun/screenshot2.webp',
                        title: 'Bridge Combat Arena',
                        desc: 'Fighting glowing red cylinder enemies on a narrow stone bridge under a crimson sky.'
                    },
                    {
                        src: 'images/Projects/KnightWithGun/screenshot3.webp',
                        title: 'Pause Menu Interface',
                        desc: 'Retro-style pause overlay with Resume and Quit buttons.'
                    }
                ],
                ar: [
                    {
                        src: 'images/Projects/KnightWithGun/screenshot1.webp',
                        title: 'القائمة الرئيسية للعبة',
                        desc: 'واجهة البدء مع فارس مدرع بالكامل يحمل سلاحاً مكعباً أصفر متوهجاً.'
                    },
                    {
                        src: 'images/Projects/KnightWithGun/screenshot2.webp',
                        title: 'ساحة قتال الجسر',
                        desc: 'قتال أعداء أسطوانيين متوهجين باللون الأحمر على جسر حجري ضيق تحت سماء قرمذية.'
                    },
                    {
                        src: 'images/Projects/KnightWithGun/screenshot3.webp',
                        title: 'واجهة قائمة التوقف مؤقتاً',
                        desc: 'واجهة توقف مؤقت كلاسيكية مع زري الاستئناف والخروج.'
                    }
                ]
            }
        },
        'the-hidden-kanz': {
            screenshots: {
                en: [
                    {
                        src: 'images/Projects/TheHiddenKanz/screenshot1.webp',
                        title: 'Main Menu Scene',
                        desc: 'Main menu showcasing a carved stone tomb entrance in desert sand dunes.'
                    },
                    {
                        src: 'images/Projects/TheHiddenKanz/screenshot2.webp',
                        title: 'First-Person Combat View',
                        desc: 'Stone corridor exploration holding a sword and a green magical flame against skeleton enemies.'
                    },
                    {
                        src: 'images/Projects/TheHiddenKanz/screenshot3.webp',
                        title: 'Magic Ability Casting',
                        desc: 'Engaging skeleton warrior while preparing to cast a pink magic spell.'
                    },
                    {
                        src: 'images/Projects/TheHiddenKanz/screenshot4.webp',
                        title: 'Statue Chamber',
                        desc: 'Spacious room lined with tall hooded statues, archway tunnels, and hanging cages.'
                    }
                ],
                ar: [
                    {
                        src: 'images/Projects/TheHiddenKanz/screenshot1.webp',
                        title: 'مشهد القائمة الرئيسية',
                        desc: 'القائمة الرئيسية تستعرض مدخل مقبرة حجرية منحوتة وسط الكثبان الرملية الصحراوية.'
                    },
                    {
                        src: 'images/Projects/TheHiddenKanz/screenshot2.webp',
                        title: 'عرض القتال من منظور الشخص الأول',
                        desc: 'استكشاف ممر حجري مع حمل سيف ولهب سحري أخضر لمواجهة الأعداء من الهياكل العظمية.'
                    },
                    {
                        src: 'images/Projects/TheHiddenKanz/screenshot3.webp',
                        title: 'إلقاء القدرة السحرية',
                        desc: 'مواجهة محارب هيكل عظمي أثناء الاستعداد لإلقاء تعويذة سحرية وردية.'
                    },
                    {
                        src: 'images/Projects/TheHiddenKanz/screenshot4.webp',
                        title: 'غرفة التماثيل',
                        desc: 'غرفة فسيحة محاطة بتماثيل طويلة ذات قلنسوات، ممرات مقوسة، وأقفاص معلقة.'
                    }
                ]
            }
        },
        'syntax-strike': {
            screenshots: {
                en: [
                    {
                        src: 'images/Projects/SyntaxStrike/screenshot1.webp',
                        title: 'Various Enemy Types in Combat',
                        desc: 'Real-time combat in the facility showing the player robot fighting multiple enemy types (Shooter Robots, Spider Bots, and Turrets) using the sword and shield.'
                    },
                    {
                        src: 'images/Projects/SyntaxStrike/screenshot2.webp',
                        title: 'Spider Enemies Attacking',
                        desc: 'Engaging fast Spider Bots and ranged enemies inside the warehouse facility. Ranged enemies can fire projectiles and self-destruct if they get too close.'
                    },
                    {
                        src: 'images/Projects/SyntaxStrike/screenshot3.webp',
                        title: 'Hacking Tool Pickup in the Environment',
                        desc: 'Locating the Hacking Tool in the facility. Acquiring the tool allows the player to interact with terminals and hack disabled enemies to solve programming puzzles.'
                    },
                    {
                        src: 'images/Projects/SyntaxStrike/screenshot4.webp',
                        title: 'Hacking Tool Acquired Notification',
                        desc: 'On-screen notification upon picking up the hacking tool, preparing the student to hack enemies and override secure doors.'
                    },
                    {
                        src: 'images/Projects/SyntaxStrike/screenshot5.webp',
                        title: 'Electrical Water Hazard',
                        desc: 'Navigating environmental hazards. The student must avoid electrical pools or use a nearby control console to disable the hazard before traversing.'
                    },
                    {
                        src: 'images/Projects/SyntaxStrike/screenshot6.webp',
                        title: 'Final Boss Encounter',
                        desc: 'The final encounter with the Boss robot. The player must dodge shockwaves and stomp attacks, reduce the Boss\'s health to zero, and solve a hard programming puzzle to win.'
                    },
                    {
                        src: 'images/Projects/SyntaxStrike/screenshot7.webp',
                        title: 'Level Completion Score Scene',
                        desc: 'Level completion scoreboard tracking player statistics including enemies defeated, programming puzzle accuracy, time bonuses, and final score.'
                    }
                ],
                ar: [
                    {
                        src: 'images/Projects/SyntaxStrike/screenshot1.webp',
                        title: 'أنواع مختلفة من الأعداء أثناء القتال',
                        desc: 'قتال فوري في المنشأة يظهر الروبوت اللاعب يقاتل أنواعاً متعددة من الأعداء (الروبوتات المطلقة للنار، العناكب الآلية، والرشاشات المثبتة) باستخدام السيف والدرع.'
                    },
                    {
                        src: 'images/Projects/SyntaxStrike/screenshot2.webp',
                        title: 'هجوم أعداء العنكبوت الآلي',
                        desc: 'مواجهة العناكب الآلية السريعة والأعداء بعيدي المدى داخل منشأة المستودع. يمكن للأعداء بعيدي المدى إطلاق قذائف وتفجير أنفسهم إذا اقتربوا كثيراً.'
                    },
                    {
                        src: 'images/Projects/SyntaxStrike/screenshot3.webp',
                        title: 'التقاط أداة الاختراق في البيئة',
                        desc: 'تحديد موقع أداة الاختراق في المنشأة. يتيح الحصول على الأداة للاعب التفاعل مع المحطات واختراق الأعداء المعطلين لحل ألغاز البرمجة.'
                    },
                    {
                        src: 'images/Projects/SyntaxStrike/screenshot4.webp',
                        title: 'إشعار الحصول على أداة الاختراق',
                        desc: 'إشعار يظهر على الشاشة عند التقاط أداة الاختراق، مما يجهز الطالب لاختراق الأعداء وفتح الأبواب المؤمنة.'
                    },
                    {
                        src: 'images/Projects/SyntaxStrike/screenshot5.webp',
                        title: 'خطر المياه المكهربة',
                        desc: 'تخطي المخاطر البيئية. يجب على الطالب تجنب البرك المكهربة أو استخدام وحدة تحكم قريبة لتعطيل الكهرباء قبل العبور.'
                    },
                    {
                        src: 'images/Projects/SyntaxStrike/screenshot6.webp',
                        title: 'مواجهة الزعيم النهائي',
                        desc: 'المواجهة الأخيرة مع الروبوت الزعيم. يجب على اللاعب تفادي الموجات الصادمة وهجمات الدهس، وتقليل صحة الزعيم إلى الصفر، وحل لغز برمجي صعب للفوز.'
                    },
                    {
                        src: 'images/Projects/SyntaxStrike/screenshot7.webp',
                        title: 'مشهد نتيجة إكمال المرحلة',
                        desc: 'لوحة إكمال المرحلة التي تتبع إحصائيات اللاعب بما في ذلك الأعداء المهزومين، ودقة حل الألغاز البرمجية، والمكافآت الزمنية، والنتيجة النهائية.'
                    }
                ]
            }
        }
    };

    // Show screenshot by index
    function showScreenshot(index) {
        if (!screenshotsList || screenshotsList.length === 0) return;

        if (index < 0) index = screenshotsList.length - 1;
        if (index >= screenshotsList.length) index = 0;
        
        currentIndex = index;
        const current = screenshotsList[currentIndex];
        
        // Apply fade transition
        mainImg.style.opacity = '0';
        setTimeout(() => {
            mainImg.src = current.src;
            mainImg.alt = current.title;
            imgTitle.textContent = current.title;
            imgCounter.textContent = `${currentIndex + 1} / ${screenshotsList.length}`;
            imgDesc.textContent = current.desc;
            mainImg.style.opacity = '1';
        }, 100);

        // Update active thumbnail
        const thumbBtns = thumbnailsGrid.querySelectorAll('.ss-thumb-btn');
        thumbBtns.forEach((btn, idx) => {
            if (idx === currentIndex) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // Generate thumbnails dynamically
    function generateThumbnails() {
        thumbnailsGrid.innerHTML = '';
        if (!screenshotsList || screenshotsList.length <= 1) {
            thumbnailsGrid.style.display = 'none';
            return;
        }
        thumbnailsGrid.style.display = 'grid';

        screenshotsList.forEach((screenshot, index) => {
            const btn = document.createElement('button');
            btn.className = 'ss-thumb-btn';
            btn.setAttribute('data-index', index);
            btn.setAttribute('aria-label', `View screenshot ${index + 1}`);

            const img = document.createElement('img');
            img.src = screenshot.src.replace(/screenshot(\d+)\.(png|jpeg|jpg|webp)/i, 'screenshot$1_thumb.webp');
            img.alt = `Thumbnail ${index + 1}`;

            btn.appendChild(img);
            thumbnailsGrid.appendChild(btn);

            // Use pre-instantiated hover sound
            btn.addEventListener('mouseenter', () => {
                if (localStorage.getItem('sound') !== 'false') {
                    hoverSound.currentTime = 0;
                    hoverSound.play().catch(() => {});
                }
            });

            // Use pre-instantiated click sound
            btn.addEventListener('click', () => {
                if (localStorage.getItem('sound') !== 'false') {
                    clickSound.currentTime = 0;
                    clickSound.play().catch(() => {});
                }
                showScreenshot(index);
            });
        });
    }

    // Modal Control Functions
    function openModal(projectKey, card, isAchievement = false) {
        currentProject = projectKey;

        const currentLang = localStorage.getItem('lang') || 'en';
        const isArabic = currentLang === 'ar';

        // Reset label defaults in case they were modified by achievements
        if (subtitleElem) subtitleElem.style.display = 'none';
        if (tagsLabel) tagsLabel.textContent = isArabic ? 'التقنيات المستخدمة' : 'TECH STACK';
        if (teamLabel) teamLabel.textContent = isArabic ? 'فريق التطوير' : 'DEVELOPMENT TEAM';

        if (isAchievement) {
            // Scrape achievement details
            const titleText = card.querySelector('.achievement-title').textContent.trim();
            const sysStatusName = titleText.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_');
            modalTitleElem.textContent = isArabic ? `حالة النظام: إنجاز_${sysStatusName}.EXE` : `SYSTEM STATUS: ACHIEVEMENT_${sysStatusName}.EXE`;

            detailsTitle.textContent = titleText;

            // Populate subtitle: Issuer & Date
            const issuerText = card.querySelector('.achievement-issuer') ? card.querySelector('.achievement-issuer').textContent.trim() : '';
            const dateText = card.querySelector('.achievement-date') ? card.querySelector('.achievement-date').textContent.trim() : '';
            if (subtitleElem) {
                subtitleElem.style.display = 'block';
                subtitleElem.textContent = `${issuerText} | ${dateText}`;
            }

            // Description: Project/Game name + description
            const projTitleEl = card.querySelector('.achievement-project .project-title');
            const projDescEl = card.querySelector('.achievement-project .project-description');
            let descHtml = '';
            if (projTitleEl) {
                descHtml += `<strong style="color: var(--accent-primary); font-family: var(--font-terminal);">${projTitleEl.textContent.trim()}</strong><br><br>`;
            }
            if (projDescEl) {
                descHtml += projDescEl.textContent.trim();
            }
            detailsDesc.innerHTML = descHtml;

            // Populate tags (change label to TAGS)
            if (tagsLabel) tagsLabel.textContent = isArabic ? 'الأوسمة' : 'TAGS';
            detailsTags.innerHTML = '';
            const tags = card.querySelectorAll('.achievement-tag');
            tags.forEach(tag => {
                const span = document.createElement('span');
                span.className = 'tag';
                span.textContent = tag.textContent.trim();
                detailsTags.appendChild(span);
            });

            // Populate team / mentor
            const teamElement = card.querySelector('.achievement-team');
            const mentorElement = card.querySelector('.achievement-mentor');
            if (teamLabel) teamLabel.textContent = isArabic ? 'الفريق والموجهون' : 'TEAM & MENTORS';
            
            if (teamElement || mentorElement) {
                detailsTeamContainer.style.display = 'block';
                let teamHtml = '';
                if (teamElement) {
                    teamHtml += teamElement.innerHTML;
                }
                if (mentorElement) {
                    teamHtml += mentorElement.innerHTML;
                }
                detailsTeam.innerHTML = teamHtml;
            } else {
                detailsTeamContainer.style.display = 'none';
                detailsTeam.innerHTML = '';
            }

            // Hide external link (achievements don't have one)
            detailsLink.style.display = 'none';

            // Build screenshots list (cover image + optional project screenshot)
            const mainImgEl = card.querySelector('.achievement-image img');
            const projImgEl = card.querySelector('.achievement-project-image img');
            
            screenshotsList = [];
            if (mainImgEl) {
                screenshotsList.push({
                    src: mainImgEl.src,
                    title: isArabic ? 'الشهادة / الفعالية' : 'Certificate / Event',
                    desc: titleText
                });
            }
            if (projImgEl) {
                screenshotsList.push({
                    src: projImgEl.src,
                    title: isArabic ? 'لقطة شاشة للمشروع' : 'Project Screenshot',
                    desc: projTitleEl ? projTitleEl.textContent.trim() : (isArabic ? 'لقطة شاشة للمشروع' : 'Project Screenshot')
                });
            }
            
            if (screenshotsList.length > 0) {
                captionContainer.style.display = 'block';
                if (screenshotsList.length > 1) {
                    prevArrow.style.display = 'flex';
                    nextArrow.style.display = 'flex';
                } else {
                    prevArrow.style.display = 'none';
                    nextArrow.style.display = 'none';
                }
            } else {
                captionContainer.style.display = 'none';
                prevArrow.style.display = 'none';
                nextArrow.style.display = 'none';
            }
        } else {
            // Scrape details from DOM
            const titleText = card.querySelector('.project-title').textContent.trim();
            const descText = card.querySelector('.project-description').textContent.trim();
            
            // Format the SYSTEM STATUS text: uppercase with underscores
            const sysStatusName = titleText.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_');
            modalTitleElem.textContent = isArabic ? `حالة النظام: عرض_${sysStatusName}.EXE` : `SYSTEM STATUS: ${sysStatusName}_SHOWCASE.EXE`;

            // Populate scraped details
            detailsTitle.textContent = titleText;
            detailsDesc.textContent = descText;

            // Populate tech tags
            detailsTags.innerHTML = '';
            const tags = card.querySelectorAll('.project-tags .tag');
            tags.forEach(tag => {
                const span = document.createElement('span');
                span.className = 'tag';
                span.textContent = tag.textContent.trim();
                detailsTags.appendChild(span);
            });

            // Populate team members
            const teamElement = card.querySelector('.project-team');
            if (teamElement) {
                detailsTeamContainer.style.display = 'block';
                detailsTeam.innerHTML = teamElement.innerHTML;
            } else {
                detailsTeamContainer.style.display = 'none';
                detailsTeam.innerHTML = '';
            }

            // Populate external link button
            const externalLink = card.querySelector('a.project-link');
            if (externalLink) {
                detailsLink.style.display = 'inline-block';
                detailsLink.href = externalLink.href;
                detailsLink.textContent = externalLink.textContent.trim();
            } else {
                detailsLink.style.display = 'none';
            }

            // Determine screenshot list
            const projectRecord = projectData[projectKey];
            if (projectRecord && projectRecord.screenshots) {
                screenshotsList = projectRecord.screenshots[currentLang] || projectRecord.screenshots['en'] || [];
                
                // Show gallery layout elements
                captionContainer.style.display = 'block';
                if (screenshotsList.length > 1) {
                    prevArrow.style.display = 'flex';
                    nextArrow.style.display = 'flex';
                } else {
                    prevArrow.style.display = 'none';
                    nextArrow.style.display = 'none';
                }
            } else {
                // No gallery data, fall back to cover image
                const coverImg = card.querySelector('.project-image img');
                const coverSrc = coverImg ? coverImg.src : '';
                
                screenshotsList = [{
                    src: coverSrc,
                    title: titleText,
                    desc: titleText
                }];

                // Hide gallery layout elements
                captionContainer.style.display = 'none';
                prevArrow.style.display = 'none';
                nextArrow.style.display = 'none';
        }

        // Populate thumbnails
        generateThumbnails();

        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        
        // Reset to first screenshot
        showScreenshot(0);
        
        // Play window open sound if it exists
        if (localStorage.getItem('sound') !== 'false') {
            openSound.currentTime = 0;
            openSound.play().catch(() => {});
        }
    }
    }

    function closeModal() {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    // Event Listeners for Project Cards
    projectCards.forEach(card => {
        const projectKey = card.getAttribute('data-project');
        if (!projectKey) return;

        // Click event opens showcase
        card.addEventListener('click', (e) => {
            openModal(projectKey, card);
        });

        // Make keyboard navigable
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.click();
            }
        });
    });

    // Event Listeners for Achievement Cards
    const achievementCards = document.querySelectorAll('.achievement-card');
    achievementCards.forEach(card => {
        // Click event opens showcase
        card.addEventListener('click', (e) => {
            openModal('', card, true);
        });

        // Make keyboard navigable
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.click();
            }
        });
    });

    closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Escape key listener for this modal specifically
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });

    // Gallery navigation listeners
    prevArrow.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent modal click from triggering close
        showScreenshot(currentIndex - 1);
    });

    nextArrow.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent modal click from triggering close
        showScreenshot(currentIndex + 1);
    });

    // Keyboard navigation for gallery
    document.addEventListener('keydown', (e) => {
        if (modal.classList.contains('active') && screenshotsList.length > 1) {
            if (e.key === 'ArrowLeft') {
                showScreenshot(currentIndex - 1);
            } else if (e.key === 'ArrowRight') {
                showScreenshot(currentIndex + 1);
            }
        }
    });
}

/**
 * Static Translations for elements with data-translate attribute
 */
const staticTranslations = {
    en: {
        'nav_home': 'Home',
        'nav_about': 'About',
        'nav_projects': 'Projects',
        'nav_experience': 'Experience',
        'nav_skills': 'Skills',
        'nav_education': 'Education',
        'nav_certifications': 'Certifications',
        'nav_achievements': 'Achievements',
        'nav_contact': 'Contact',
        'nav_cv_label': 'CV',
        'nav_pdf_label': 'PDF',
        'nav_theme_label': 'Theme',
        'nav_lang_label': 'العربية',
        'game_title': "TURKI'S BATTLE GAME",
        'game_btn_mobile': 'Mobile',
        'game_btn_exit': 'EXIT',
        'game_btn_restart': 'RESTART',
        'game_info_move': '[A/D] Move',
        'game_info_jump': '[W/Space] Jump',
        'game_info_attack': '[J] Attack',
        'game_info_block': '[K] Block',
        'game_info_exit': '[ESC] Exit',
        'hero_name': 'Turki Alshaalan',
        'hero_title': 'IT Student | Game Developer | Unity & C# Programmer',
        'hero_btn_projects': 'View Projects',
        'hero_btn_contact': 'Contact Me',
        'about_title': 'About Me',
        'about_p1': 'I\'m an IT student at <strong>Imam Muhammad ibn Saud Islamic University</strong> with over 1 year of experience in <strong>Unity</strong> and <strong>C#</strong> programming. My focus lies in creating engaging 3D gameplay systems, intelligent AI behaviors, and challenging puzzle mechanics.',
        'about_p2': 'I work with <strong>Blender</strong> for 3D modeling and asset creation, allowing me to bring my game concepts to life from prototype to polished experience. I\'m passionate about game feel, immersion, and creating memorable player experiences.',
        'about_p3': 'As a collaborative team member, I\'ve contributed to various game projects, combining technical skills with creative problem-solving to deliver engaging interactive experiences.',
        'about_exp_label': 'Year Experience',
        'about_proj_label': 'Completed Projects',
        'about_cert_label': 'Certifications',
        'about_skills_label': 'Skills Categories',
        'about_ach_label': 'Achievements',
        'nav_cv_tooltip': 'Download CV',
        'nav_pdf_tooltip': 'Export PDF',
        'nav_theme_tooltip': 'Toggle Theme',
        'nav_lang_tooltip': 'Language',
    },
    ar: {
        'nav_home': 'الرئيسية',
        'nav_about': 'نبذة عني',
        'nav_projects': 'المشاريع',
        'nav_experience': 'الخبرة',
        'nav_skills': 'المهارات',
        'nav_education': 'التعليم',
        'nav_certifications': 'الشهادات',
        'nav_achievements': 'الإنجازات',
        'nav_contact': 'اتصل بي',
        'nav_cv_label': 'السيرة الذاتية',
        'nav_pdf_label': 'تحميل PDF',
        'nav_theme_label': 'المظهر',
        'nav_lang_label': 'English',
        'game_title': 'لعبة قتال تركي',
        'game_btn_mobile': 'جوال',
        'game_btn_exit': 'خروج',
        'game_btn_restart': 'إعادة تشغيل',
        'game_info_move': '[A/D] تحرك',
        'game_info_jump': '[W/Space] قفز',
        'game_info_attack': '[J] هجوم',
        'game_info_block': '[K] دفاع/صد',
        'game_info_exit': '[ESC] خروج',
        'hero_name': 'تركي الشعلان',
        'hero_title': 'طالب تقنية معلومات | مطور ألعاب | مبرمج Unity و C#',
        'hero_btn_projects': 'عرض المشاريع',
        'hero_btn_contact': 'تواصل معي',
        'about_title': 'نبذة عني',
        'about_p1': 'أنا طالب تقنية معلومات في <strong>جامعة الإمام محمد بن سعود الإسلامية</strong> ولدي خبرة تزيد عن سنة في برمجة <strong>Unity</strong> و <strong>C#</strong>. يركز اهتمامي على إنشاء أنظمة لعب ثلاثية الأبعاد تفاعلية، وسلوكيات ذكاء اصطناعي ذكية، وميكانيكيات ألغاز مليئة بالتحدي.',
        'about_p2': 'أعمل على برنامج <strong>Blender</strong> للنمذجة ثلاثية الأبعاد وتصميم الأصول، مما يتيح لي تحويل أفكار الألعاب إلى واقع من النماذج الأولية إلى التجارب المصقولة. أنا شغوف بشعور اللعبة، والانغماس، وخلق تجارب لا تُنسى للاعبين.',
        'about_p3': 'كعضو متعاون في الفريق، ساهمت في العديد من مشاريع الألعاب، وجمعت بين المهارات التقنية وحل المشكلات الإبداعي لتقديم تجارب تفاعلية جذابة.',
        'about_exp_label': 'سنة+ خبرة',
        'about_proj_label': 'مشاريع مكتملة',
        'about_cert_label': 'شهادات معتمدة',
        'about_skills_label': 'مجالات مهارات',
        'about_ach_label': 'إنجازات',
        'nav_cv_tooltip': 'تحميل السيرة الذاتية',
        'nav_pdf_tooltip': 'تصدير PDF',
        'nav_theme_tooltip': 'تغيير المظهر',
        'nav_lang_tooltip': 'لغة',
    }
};

/**
 * Content term translations for selector-based dynamic translation
 */
const termTranslations = {
    "Projects": "المشاريع",
    "A collection of my work across different domains": "مجموعة من أعمالي في مجالات مختلفة",
    "Game Development": "تطوير الألعاب",
    "Games and interactive experiences I've built": "الألعاب والتجارب التفاعلية التي قمت ببنائها",
    "Professional Work": "العمل المهني",
    "Industry projects in AI, web development, and more": "مشاريع صناعية في الذكاء الاصطناعي وتطوير الويب وغيرها",
    "University Projects": "المشاريع الجامعية",
    "Academic projects and coursework": "مشاريع أكاديمية ومقررات دراسية",
    
    // Project Cards Details
    "Dungeon Puzzle": "Dungeon Puzzle",
    "A puzzle-based gameplay experience where players navigate through dangerous dungeons, avoiding death traps and overcoming environmental challenges to reach the exit.": "تجربة لعب تعتمد على الألغاز حيث يتنقل اللاعبون عبر دهاليز خطيرة، متجنبين فخاخ الموت ومتغلبين على التحديات البيئية للوصول إلى المخرج.",
    "View Project →": "عرض المشروع ←",
    "View Gallery →": "عرض المعرض ←",
    "Team Members:": "أعضاء الفريق:",
    
    "The Scary Library": "The Scary Library",
    "A horror game developed during a Game Jam featuring an AI enemy that hunts the player. Solve book-based puzzles using 5 books to escape the haunted library.": "لعبة رعب تم تطويرها خلال هكاثون ألعاب (Game Jam) تتميز بعدو ذكاء اصطناعي يطارد اللاعب. قم بحل الألغاز المعتمدة على الكتب باستخدام 5 كتب للهروب من المكتبة المسكونة.",
    
    "Knight With a Gun": "Knight With a Gun",
    "Face hordes of enemies as a Knight using your own gun. Survive the endless horde in this action-packed survival game.": "واجه جحافل الأعداء بصفتك فارساً يستخدم مسدسك الخاص. انجُ من الحشود اللانهائية في لعبة البقاء المليئة بالحركة هذه.",
    
    "The Hidden Kanz": "The Hidden Kanz",
    "A combat-based dungeon crawler where players fight waves of skeleton AI enemies using sword combat and magic abilities to survive and clear the dungeon.": "لعبة استكشاف دهاليز قتالية حيث يقاتل اللاعبون موجات من الهياكل العظمية التي تعمل بالذكاء الاصطناعي باستخدام قتال السيوف والقدرات السحرية للنجاة وتطهير الدهليز.",
    
    "Syntax Strike": "Syntax Strike",
    "A 3D educational action-RPG built in Unity where players master coding by solving Java puzzles. Features compiler-integrated combat mechanics, dynamic quest lines, and a custom evaluation companion. Turki engineered the C# game systems, player state controllers, parser integration, and enemy AI combat patterns.": "لعبة تقمص أدوار قتالية تعليمية ثلاثية الأبعاد مبنية في Unity حيث يتقن اللاعبون البرمجة عن طريق حل ألغاز Java. تتميز بميكانيكيات قتال متكاملة مع المترجم (Compiler)، ومهام ديناميكية، ورفيق تقييم مخصص. هندس تركي أنظمة لعبة C#، ومتحكمات حالة اللاعب، وتكامل المحلل (Parser)، وأنماط قتال الأعداء بالذكاء الاصطناعي.",
    "View Gallery & Specs →": "عرض المعرض والمواصفات ←",

    "DocuMind": "DocuMind",
    "An open-source system for summarizing Arabic PDF documents using local LLMs and a simple Streamlit interface. A valuable learning project that helped understand how document summarization systems work in practice, from extraction to clustering and final generation.": "نظام مفتوح المصدر لتلخيص مستندات PDF العربية باستخدام Local LLMs وواجهة Streamlit مبسطة. مشروع تعليمي قيم ساعد في فهم كيفية عمل أنظمة تلخيص المستندات عملياً، بدءاً من الاستخراج إلى التجميع والتوليد النهائي.",

    "Restaurant Ordering System": "Restaurant Ordering System",
    "A Java-based restaurant ordering application featuring a tree-structured menu, drink vending machine with stack-based inventory, and order queue management system.": "تطبيق طلبات مطاعم مبني بلغة Java يتميز بقائمة طعام ذات هيكل شجري، وآلة بيع مشروبات بنظام مخزون يعتمد على المكدس (Stack)، ونظام إدارة طابور الطلبات.",

    "Recipe Hub": "Recipe Hub",
    "A web-based recipe management application built with PHP, MySQL, HTML, CSS, and JavaScript. Features include browsing recipes, search functionality, categories, favorites, and an admin panel for managing recipes.": "تطبيق ويب لإدارة وصفات الطعام مبني باستخدام PHP و MySQL و HTML و CSS و JavaScript. تشمل الميزات تصفح الوصفات، وخاصية البحث، والتصنيفات، والمفضلة، ولوحة تحكم للمسؤول لإدارة الوصفات.",
    "Web Systems Team:": "فريق أنظمة الويب:",
    "Architecture Team:": "فريق معمارية البرمجيات:",

    "SecureCheck": "SecureCheck",
    "A web-based data breach awareness platform that helps users check if their passwords and email addresses have been compromised in data breaches. This project demonstrates ethical security tool development using k-Anonymity model for privacy-preserving password checking.": "منصة ويب للتوعية بانتهاكات البيانات تساعد المستخدمين على التحقق مما إذا كانت كلمات المرور وعناوين بريدهم الإلكتروني قد تم اختراقها في تسريبات البيانات. يوضح هذا المشروع تطوير أدوات أمان أخلاقية باستخدام نموذج k-Anonymity لفحص كلمات المرور مع الحفاظ على الخصوصية.",

    "Smart Campus Services": "Smart Campus Services",
    "A comprehensive Android application designed to provide campus services to students, including announcements, product browsing, shopping cart functionality, and contact features. Built using Java with SQLite for local data storage.": "تطبيق Android شامل مصمم لتقديم خدمات الحرم الجامعي للطلاب، بما في ذلك الإعلانات، وتصفح المنتجات، وعربة التسوق، وميزات الاتصال. تم بناؤه باستخدام Java مع SQLite لتخزين البيانات محلياً.",

    "Graduation Project": "Graduation Project",
    "A senior graduation project (IT492) investigating game-based learning effectiveness. Designed to assess the pedagogical impact of interactive coding puzzles (Parsons Problems) in reducing learning barriers for CS students. Evaluated using structured player feedback and learning-gain metrics. Abdulaziz led agile coordination and stakeholder reporting, Turki directed implementation logic, and Saud managed levels and user testing.": "مشروع تخرج للسنوات النهائية (IT492) يبحث في فعالية التعلم القائم على الألعاب. صُمم لتقييم الأثر التربوي لألغاز البرمجة التفاعلية (Parsons Problems) في تقليل حواجز التعلم لطلاب علوم الحاسب. تم تقييمه باستخدام تعليقات اللاعبين المنظمة ومقاييس اكتساب المعرفة. قاد عبد العزيز التنسيق المرن وإعداد التقارير لأصحاب المصلحة، ووجه تركي منطق التنفيذ، وأدار سعود المراحل واختبار المستخدمين.",

    // Skills
    "Skills": "المهارات",
    "Core Skills": "المهارات الأساسية",
    "Problem Solving": "حل المشكلات",
    "Team Problem Solving": "حل المشكلات الجماعي",
    "Teamwork": "العمل الجماعي",
    "Self Learning": "التعلم الذاتي",
    "Collaboration": "التعاون",
    "Project Management": "إدارة المشاريع",
    "Game Programming": "برمجة الألعاب",
    "Game Design": "تصميم الألعاب",
    "Game Mechanics": "ميكانيكيات الألعاب",
    "Game AI": "الذكاء الاصطناعي للألعاب",
    "Unity": "Unity",
    "3D & Visual Creation": "التصميم ثلاثي الأبعاد والإنتاج المرئي",
    "3D Modeling": "النمذجة ثلاثية الأبعاد",
    "3D Rendering": "الرندر ثلاثي الأبعاد",
    "Programming & Web Development": "البرمجة وتطوير الويب",
    "Artificial Intelligence": "الذكاء الاصطناعي",
    "Artificial Intelligence (AI)": "الذكاء الاصطناعي (AI)",
    "Generative AI": "الذكاء الاصطناعي التوليدي",
    "Large Language Models (LLM)": "النماذج اللغوية الكبيرة (LLMs)",
    "Vibe Coding": "البرمجة بالإلهام (Vibe Coding)",
    "Technical & Conceptual": "المفاهيم والتقنيات",
    "Software Development": "تطوير البرمجيات",
    "Web Development": "تطوير الويب",
    "Web Design": "تصميم الويب",
    "Architecture": "معمارية البرمجيات",
    "Human Computer Interaction": "التفاعل بين الإنسان والحاسوب",
    "Programming Languages": "لغات البرمجة",
    "MVC": "نمط (MVC)",

    // Experience
    "Experience": "الخبرة",
    "Team Member": "عضو فريق",
    "Enjaz Club - Game Development Section": "نادي إنجاز - قسم تطوير الألعاب",
    "Collaborated with a team of developers on game projects, focusing on gameplay logic. Contributed to building engaging interactive experiences through efficient code and creative problem-solving.": "تعاونت مع فريق من المطورين في مشاريع الألعاب، مع التركيز على منطق اللعب. ساهمت في بناء تجارب تفاعلية جذابة من خلال كود فعال وحل إبداعي للمشكلات.",
    "2024 - 2025": "٢٠٢٤ - ٢٠٢٥",

    // Education
    "Education": "التعليم",
    "Bachelor's in Information Technology": "بكالوريوس في تقنية المعلومات",
    "Imam Muhammad ibn Saud Islamic University": "جامعة الإمام محمد بن سعود الإسلامية",
    "Dec 2022 - Ongoing": "ديسمبر ٢٠٢٢ - مستمر",
    "Grade: 4.11": "المعدل: ٤.١١ من ٥",
    "Activities and Societies:": "الأنشطة والجمعيات:",
    "Enjaz Club - Game Development Club": "نادي إنجاز - نادي تطوير الألعاب",

    // Certifications
    "Certifications": "الشهادات",
    "Complete C# Unity Game Developer 3D (Updated To Unity 6).": "Complete C# Unity Game Developer 3D (Updated To Unity 6).",
    "By Gamedev.tv (in Udemy)": "By Gamedev.tv (in Udemy)",
    "Game Design and Development": "Game Design and Development",
    "by Tuwaiq Academy": "by Tuwaiq Academy",
    "Introduction to Blender": "Introduction to Blender",
    "By Imam Mohammad Ibn Saud Islamic University (IMSIU)": "By Imam Mohammad Ibn Saud Islamic University (IMSIU)",
    "Game Design Between Imagination and Reality": "Game Design Between Imagination and Reality",
    "by Digital Attaa Initiative": "by Digital Attaa Initiative",
    "Unity Essentials Pathway": "Unity Essentials Pathway",
    "by Unity": "by Unity",
    "Game design and development with Unity and generative AI tools": "Game design and development with Unity and generative AI tools",
    "Jobs in game development": "Jobs in game development",
    "3D Game Developer Bootcamp": "3D Game Developer Bootcamp",
    "Imam Mohammad Ibn Saud Islamic University (IMSIU)": "جامعة الإمام محمد بن سعود الإسلامية",
    "View": "عرض",

    // Achievements
    "Achievements": "الإنجازات",
    "1st Place Winner - PwC Middle East Hackathon": "المركز الأول - هكاثون PwC الشرق الأوسط",
    "Issuer: PwC Middle East": "الجهة المانحة: PwC الشرق الأوسط",
    "Date: 7 February 2026": "التاريخ: ٧ فبراير ٢٠٢٦",
    "Project: TourLens": "المشروع: TourLens",
    "An AR glasses solution that serves as a hands-free indoor tour guide, overlaying real-time visualizations to enhance visitor experiences at events and cultural sites in Riyadh.": "حل نظارات الواقع المعزز (AR) الذي يعمل كمرشد سياحي داخلي بدون استخدام اليدين، حيث يقوم بتركيب مرئيات فورية لتحسين تجربة الزوار في الفعاليات والمواقع الثقافية في الرياض.",
    "Mentor:": "الموجه/المرشد:",
    "Majed Alghamdi": "ماجد الغامدي",
    
    "1st Place Winner - Enjaz Game Jam": "المركز الأول - هكاثون ألعاب إنجاز",
    "Issuer: Enjaz Club": "الجهة المانحة: نادي إنجاز",
    "Date: 19 November 2024": "التاريخ: ١٩ نوفمبر ٢٠٢٤",
    "Game: The Scary Library": "اللعبة: The Scary Library",
    "A horror game where players solve book puzzles to escape a haunted library while being hunted by an AI enemy.": "لعبة رعب حيث يحل اللاعبون ألغاز الكتب للهروب من مكتبة مسكونة بينما يطاردهم عدو ذكاء اصطناعي.",
    
    // Contact
    "Get In Touch": "تواصل معي",
    "Email": "البريد الإلكتروني",
    "Phone": "الهاتف",
    "Location": "الموقع",
    "LinkedIn": "لينكدإن",
    "GitHub": "قيت هب",
    "Riyadh, Saudi Arabia": "الرياض، المملكة العربية السعودية",
    "Download CV": "تحميل السيرة الذاتية",

    // Footer
    "Designed & Built by Turki Alshaalan": "تصميم وبناء تركي الشعلان",
    "© 2026. All rights reserved.": "© ٢٠٢٦. جميع الحقوق محفوظة.",

    // General Words & Team roles
    "Saud AlFawzan": "سعود الفوزان",
    "Fahad AlGhamdi": "فهد الغامدي",
    "Turki AlShaalan": "تركي الشعلان",
    "Abdulrahman AlFifi": "عبد الرحمن الفيفي",
    "Anas AlHakami": "أنس الحكمي",
    "Turki Alshaalan": "تركي الشعلان",
    "Abdulaziz Almusayli": "عبد العزيز المسيلي",
    "Fahad Alghamdi": "فهد الغامدي",
    "Abdulrahman Raed": "عبد الرحمن رائد",
    "Nawaf Almeshal": "نواف المشعل",
    "Yunus Demirboga": "يونس ديميربوغا",
    "Sema Bairakdar": "سيما بيرقدار",
    "Leen Al Harbi": "لين الحربي",
    "Amal Alhemali": "أمل الهمالي",
    "Muzun AlHallabi": "مزن الحلابي",
    "Turki Almufarrej": "تركي المفرج",
    "Mohammed Ababotain": "محمد ابابطين",
    "Omar Alshuger": "عمر الشقير",
    "Alwaleed Alhamdan": "الوليد الحمدان",
    "Tariq Alharbi": "طارق الحربي",
    "Meshari Alhussainan": "مشاري الحسينان",
    "Abdulrahman Alsalehi": "عبد الرحمن الصالحي",
    "Ahmed AlAsmari": "أحمد الأسمري",
    "Mushari Hussainan": "مشاري الحسينان",
    "Mohammed AlGhweiri": "محمد الغويري",

    "Game/Level Design, Assets": "تصميم الألعاب/المراحل، الأصول",
    "Game/Level Design": "تصميم الألعاب/المراحل",
    "Game Programmer": "مبرمج ألعاب",
    "3D Modeler": "نمذجة ثلاثية الأبعاد",
    "Developer": "مطور",
    "Architect": "معماري",
    "Level Designer": "مصمم المراحل",
    "Project Coordinator": "منسق المشروع",
    "Showcase": "عرض",
    "→": "←"
};

/**
 * Language Switcher - English / Arabic Translation Engine
 */
function initLanguageToggle() {
    const langToggle = document.getElementById('langToggle');
    const langLabel = document.getElementById('langToggleLabel');
    if (!langToggle) return;

    // Load initial language preference, default to English
    let currentLang = localStorage.getItem('lang') || 'en';
    applyLanguage(currentLang);

    langToggle.addEventListener('click', () => {
        currentLang = currentLang === 'en' ? 'ar' : 'en';
        applyLanguage(currentLang);
        localStorage.setItem('lang', currentLang);
    });

    function applyLanguage(lang) {
        const isArabic = lang === 'ar';
        document.documentElement.setAttribute('lang', lang);
        document.documentElement.setAttribute('dir', isArabic ? 'rtl' : 'ltr');

        // Update active class on language code spans inside toggle button
        const enCode = langToggle.querySelector('.lang-code.en');
        const arCode = langToggle.querySelector('.lang-code.ar');
        if (enCode && arCode) {
            if (isArabic) {
                enCode.classList.remove('active');
                arCode.classList.add('active');
            } else {
                enCode.classList.add('active');
                arCode.classList.remove('active');
            }
        }

        // 1. Static translations with data-translate
        document.querySelectorAll('[data-translate]').forEach(el => {
            const key = el.getAttribute('data-translate');
            if (staticTranslations[lang] && staticTranslations[lang][key] !== undefined) {
                // If it contains tags (like strong in about text), use innerHTML
                if (key.startsWith('about_p') || key === 'exp_desc') {
                    el.innerHTML = staticTranslations[lang][key];
                } else {
                    el.textContent = staticTranslations[lang][key];
                }
            }
        });

        // Translate tooltips
        document.querySelectorAll('[data-translate-tooltip]').forEach(el => {
            const key = el.getAttribute('data-translate-tooltip');
            if (staticTranslations[lang] && staticTranslations[lang][key] !== undefined) {
                el.setAttribute('data-tooltip', staticTranslations[lang][key]);
            }
        });

        // 2. Dynamic term translations using selectors (simple text-only elements)
        const selectorsToTranslate = [
            // Headings and subtitles
            '.section-title', '.section-subtitle', '.category-title', '.category-description',
            // Project card details
            '.project-title', '.project-description', '.team-title', '.team-name', '.team-role', '.project-tags .tag', '.project-link',
            // Experience cards
            '.experience-title', '.experience-organization', '.experience-description', '.experience-date',
            // Skills tags
            '.skill-category-name', '.skill-tags .tag',
            // Education cards
            '.education-degree', '.education-university', '.education-date', '.education-grade', '.activities-title', '.activities-text',
            // Certifications
            '.certification-title', '.certification-issuer',
            // Achievements
            '.achievement-title', '.achievement-issuer', '.achievement-date', '.achievement-project .project-title', '.achievement-project .project-description',
            '.achievement-team .team-title', '.achievement-team .team-name', '.achievement-team .team-role', '.achievement-mentor .mentor-title', '.achievement-mentor .mentor-name',
            '.achievement-tag',
            // Contact (labels only, not values which may be links/emails)
            '.contact-label',
            // Footer
            '.footer-text', '.footer-copyright'
        ];

        selectorsToTranslate.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                // Skip elements that are handled by static translations (data-translate)
                if (el.hasAttribute('data-translate')) return;

                const text = el.textContent.trim();
                if (!text) return;

                if (isArabic) {
                    if (!el.hasAttribute('data-orig-html')) {
                        el.setAttribute('data-orig-html', el.innerHTML);
                    }
                    if (termTranslations[text]) {
                        el.innerHTML = termTranslations[text];
                    }
                } else {
                    const origHTML = el.getAttribute('data-orig-html');
                    if (origHTML) {
                        el.innerHTML = origHTML;
                        el.removeAttribute('data-orig-html');
                    }
                }
            });
        });

        // 3. Translate specific contact values that should be localized (not emails/URLs/phone)
        document.querySelectorAll('.contact-value').forEach(el => {
            if (el.hasAttribute('href')) return; // Skip links (email, phone, linkedin, github)
            const text = el.textContent.trim();
            if (!text) return;
            if (isArabic) {
                if (!el.hasAttribute('data-orig-html')) {
                    el.setAttribute('data-orig-html', el.innerHTML);
                }
                if (termTranslations[text]) {
                    el.innerHTML = termTranslations[text];
                }
            } else {
                const origHTML = el.getAttribute('data-orig-html');
                if (origHTML) {
                    el.innerHTML = origHTML;
                    el.removeAttribute('data-orig-html');
                }
            }
        });

        // 4. Translate mixed-content elements (SVG + text node) by targeting text nodes only
        //    This covers: .view-btn, .section-linkedin-btn, .cv-download-btn, .showcase-btn
        const mixedContentSelectors = '.view-btn, .section-linkedin-btn, .cv-download-btn, .showcase-btn';
        document.querySelectorAll(mixedContentSelectors).forEach(btn => {
            btn.childNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim()) {
                    const textVal = node.nodeValue.trim();
                    if (isArabic) {
                        if (!btn.hasAttribute('data-orig-text')) {
                            btn.setAttribute('data-orig-text', textVal);
                        }
                        const translated = termTranslations[textVal];
                        if (translated) {
                            node.nodeValue = ' ' + translated;
                        }
                    } else {
                        const origText = btn.getAttribute('data-orig-text');
                        if (origText) {
                            node.nodeValue = ' ' + origText;
                            btn.removeAttribute('data-orig-text');
                        }
                    }
                }
            });
        });
    }
}
