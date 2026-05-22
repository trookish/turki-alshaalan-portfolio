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
    initHoverSounds();
    initClickSounds();
    initRevealAnimations();
    initSmoothScroll();
    initParallax();
    initSkillBars();
    initPdfExport();
    initAchievementExpand();
    initProjectShowcase();
});

/**
 * Navigation - Sticky navbar with scroll effects
 */
function initNavigation() {
    const navbar = document.getElementById('navbar');
    const scrollThreshold = 50;

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;

        if (scrollY > scrollThreshold) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Add active state to nav links based on current section
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        let current = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;

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
    });
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
    const revealElements = document.querySelectorAll('.section-title, .section-subtitle, .about-text, .about-highlights, .project-card, .timeline-item, .skill-category, .education-card, .certification-card, .contact-item');

    const revealOnScroll = () => {
        const windowHeight = window.innerHeight;
        const revealPoint = 100;

        revealElements.forEach((element, index) => {
            const elementTop = element.getBoundingClientRect().top;

            if (elementTop < windowHeight - revealPoint) {
                // Add staggered delay based on index and parent
                const delay = (index % 4) * 0.1;
                element.style.transitionDelay = `${delay}s`;
                element.classList.add('reveal', 'active');
            }
        });
    };

    // Initial check
    revealOnScroll();

    // Check on scroll
    window.addEventListener('scroll', revealOnScroll);
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
        window.addEventListener('scroll', () => {
            const scrolled = window.scrollY;
            const rate = scrolled * 0.3;

            heroBackground.style.transform = `translateY(${rate}px)`;
        });

        // Reset parallax transform before print so background isn't shifted off-screen
        window.addEventListener('beforeprint', () => {
            heroBackground.style.transform = 'translateY(0)';
        });

        window.addEventListener('afterprint', () => {
            const scrolled = window.scrollY;
            const rate = scrolled * 0.3;
            heroBackground.style.transform = `translateY(${rate}px)`;
        });
    }
}

/**
 * Skill Bars - Animate on scroll into view
 */
function initSkillBars() {
    const skillBars = document.querySelectorAll('.skill-progress');

    const animateSkillBars = () => {
        skillBars.forEach(bar => {
            const barTop = bar.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;

            if (barTop < windowHeight - 100) {
                // Get the progress value from CSS custom property
                const progress = bar.style.getPropertyValue('--progress');
                bar.style.width = progress;
            }
        });
    };

    // Initial check
    animateSkillBars();

    // Check on scroll
    window.addEventListener('scroll', animateSkillBars);
}

/**
 * Utility: Debounce function for performance
 */
function debounce(func, wait = 10, immediate = true) {
    let timeout;
    return function executedFunction() {
        const context = this;
        const args = arguments;
        const later = function () {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

/**
 * Intersection Observer for more efficient scroll handling
 */
if ('IntersectionObserver' in window) {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal', 'active');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.project-card, .experience-card, .skill-category, .certification-card, .contact-item').forEach(el => {
        observer.observe(el);
    });
}

/**
 * LinkedIn Navigation - Make sections clickable to LinkedIn
 */
// Project expand functionality retired in favor of unified showcase popup.

// Achievement Expand Functionality
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
    const detailsDesc = document.getElementById('showcase-details-desc');
    const detailsTags = document.getElementById('showcase-details-tags');
    const detailsTeamContainer = document.getElementById('showcase-details-team-container');
    const detailsTeam = document.getElementById('showcase-details-team');
    const detailsLink = document.getElementById('showcase-details-link');

    let currentProject = '';
    let currentIndex = 0;
    let screenshotsList = [];

    const projectData = {
        'dungeon-puzzle': {
            screenshots: [
                {
                    src: 'images/Projects/DungeonPuzzle/screenshot1.png',
                    title: 'Start Room',
                    desc: 'The initial room featuring a wooden table, chairs, paintings, and locked iron gates.'
                },
                {
                    src: 'images/Projects/DungeonPuzzle/screenshot2.png',
                    title: 'Dungeon Corridors',
                    desc: 'Navigating hallways with cells, chains, and a wall sign pointing to the Key Room.'
                },
                {
                    src: 'images/Projects/DungeonPuzzle/screenshot3.png',
                    title: 'Torture Chamber',
                    desc: 'A large room containing torture devices, executioner blocks, wooden horses, hanging cages, and iron maidens.'
                },
                {
                    src: 'images/Projects/DungeonPuzzle/screenshot4.png',
                    title: 'The Armory',
                    desc: 'A room with racks of swords and shields, candle chandeliers, and a hanging red banner.'
                },
                {
                    src: 'images/Projects/DungeonPuzzle/screenshot5.png',
                    title: 'Lava Trap Room',
                    desc: 'Crossing a narrow stone bridge over boiling lava while dodging giant swinging blades.'
                },
                {
                    src: 'images/Projects/DungeonPuzzle/screenshot6.png',
                    title: 'Treasure Corner',
                    desc: 'A corner housing ancient wooden chests.'
                }
            ]
        },
        'scary-library': {
            screenshots: [
                {
                    src: 'images/Projects/ScaryLibrary/screenshot1.png',
                    title: 'The Book Puzzle Shelf',
                    desc: 'A stone wall shelf with slots for 5 books, instructing the player to place them in order.'
                },
                {
                    src: 'images/Projects/ScaryLibrary/screenshot2.png',
                    title: 'AI Monster Patrolling',
                    desc: 'Creepy white-faced monster patrolling the library corridors as a red book sits on a table.'
                },
                {
                    src: 'images/Projects/ScaryLibrary/screenshot3.png',
                    title: 'Library Jumpscare',
                    desc: 'Horrifying moment the player is caught close-up by the monster.'
                }
            ]
        },
        'knight-with-gun': {
            screenshots: [
                {
                    src: 'images/Projects/KnightWithGun/screenshot1.png',
                    title: 'Game Main Menu',
                    desc: 'Start interface with a fully armored knight holding a glowing yellow cube weapon.'
                },
                {
                    src: 'images/Projects/KnightWithGun/screenshot2.png',
                    title: 'Bridge Combat Arena',
                    desc: 'Fighting glowing red cylinder enemies on a narrow stone bridge under a crimson sky.'
                },
                {
                    src: 'images/Projects/KnightWithGun/screenshot3.png',
                    title: 'Pause Menu Interface',
                    desc: 'Retro-style pause overlay with Resume and Quit buttons.'
                }
            ]
        },
        'the-hidden-kanz': {
            screenshots: [
                {
                    src: 'images/Projects/TheHiddenKanz/screenshot1.jpeg',
                    title: 'Main Menu Scene',
                    desc: 'Main menu showcasing a carved stone tomb entrance in desert sand dunes.'
                },
                {
                    src: 'images/Projects/TheHiddenKanz/screenshot2.jpeg',
                    title: 'First-Person Combat View',
                    desc: 'Stone corridor exploration holding a sword and a green magical flame against skeleton enemies.'
                },
                {
                    src: 'images/Projects/TheHiddenKanz/screenshot3.jpeg',
                    title: 'Magic Ability Casting',
                    desc: 'Engaging skeleton warrior while preparing to cast a pink magic spell.'
                },
                {
                    src: 'images/Projects/TheHiddenKanz/screenshot4.jpeg',
                    title: 'Statue Chamber',
                    desc: 'Spacious room lined with tall hooded statues, archway tunnels, and hanging cages.'
                }
            ]
        },
        'syntax-strike': {
            screenshots: [
                {
                    src: 'images/Projects/SyntaxStrike/screenshot1.png',
                    title: 'Various Enemy Types in Combat',
                    desc: 'Real-time combat in the facility showing the player robot fighting multiple enemy types (Shooter Robots, Spider Bots, and Turrets) using the sword and shield.'
                },
                {
                    src: 'images/Projects/SyntaxStrike/screenshot2.png',
                    title: 'Spider Enemies Attacking',
                    desc: 'Engaging fast Spider Bots and ranged enemies inside the warehouse facility. Ranged enemies can fire projectiles and self-destruct if they get too close.'
                },
                {
                    src: 'images/Projects/SyntaxStrike/screenshot3.png',
                    title: 'Hacking Tool Pickup in the Environment',
                    desc: 'Locating the Hacking Tool in the facility. Acquiring the tool allows the player to interact with terminals and hack disabled enemies to solve programming puzzles.'
                },
                {
                    src: 'images/Projects/SyntaxStrike/screenshot4.png',
                    title: 'Hacking Tool Acquired Notification',
                    desc: 'On-screen notification upon picking up the hacking tool, preparing the student to hack enemies and override secure doors.'
                },
                {
                    src: 'images/Projects/SyntaxStrike/screenshot5.png',
                    title: 'Electrical Water Hazard',
                    desc: 'Navigating environmental hazards. The student must avoid electrical pools or use a nearby control console to disable the hazard before traversing.'
                },
                {
                    src: 'images/Projects/SyntaxStrike/screenshot6.png',
                    title: 'Final Boss Encounter',
                    desc: 'The final encounter with the Boss robot. The player must dodge shockwaves and stomp attacks, reduce the Boss\'s health to zero, and solve a hard programming puzzle to win.'
                },
                {
                    src: 'images/Projects/SyntaxStrike/screenshot7.png',
                    title: 'Level Completion Score Scene',
                    desc: 'Level completion scoreboard tracking player statistics including enemies defeated, programming puzzle accuracy, time bonuses, and final score.'
                }
            ]
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
            img.src = screenshot.src;
            img.alt = `Thumbnail ${index + 1}`;

            btn.appendChild(img);
            thumbnailsGrid.appendChild(btn);

            // Add hover sound for dynamically created thumbnail
            const hoverSound = new Audio('Sounds/Normal/Hover.wav');
            hoverSound.volume = 0.3;
            btn.addEventListener('mouseenter', () => {
                if (localStorage.getItem('sound') !== 'false') {
                    hoverSound.currentTime = 0;
                    hoverSound.play().catch(() => {});
                }
            });

            // Add click sound for dynamically created thumbnail
            const clickSound = new Audio('Sounds/Normal/Click.wav');
            clickSound.volume = 0.4;
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
    function openModal(projectKey, card) {
        currentProject = projectKey;

        // Scrape details from DOM
        const titleText = card.querySelector('.project-title').textContent.trim();
        const descText = card.querySelector('.project-description').textContent.trim();
        
        // Format the SYSTEM STATUS text: uppercase with underscores
        const sysStatusName = titleText.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_');
        modalTitleElem.textContent = `SYSTEM STATUS: ${sysStatusName}_SHOWCASE.EXE`;

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
        if (projectRecord && projectRecord.screenshots && projectRecord.screenshots.length > 0) {
            screenshotsList = projectRecord.screenshots;
            
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
        const openSound = new Audio('Sounds/Game/windowopen.wav');
        openSound.volume = 0.3;
        if (localStorage.getItem('sound') !== 'false') {
            openSound.play().catch(() => {});
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

        // Hover sound
        const hoverSound = new Audio('Sounds/Normal/Hover.wav');
        hoverSound.volume = 0.3;
        card.addEventListener('mouseenter', () => {
            if (localStorage.getItem('sound') !== 'false') {
                hoverSound.currentTime = 0;
                hoverSound.play().catch(() => {});
            }
        });

        // Click event opens showcase
        card.addEventListener('click', (e) => {
            // Play click sound
            const clickSound = new Audio('Sounds/Normal/Click.wav');
            clickSound.volume = 0.4;
            if (localStorage.getItem('sound') !== 'false') {
                clickSound.currentTime = 0;
                clickSound.play().catch(() => {});
            }
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
