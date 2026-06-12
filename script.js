/**
 * Turki Alshaalan Portfolio Website
 * Interactive functionality and animations
 */

import { en as enStatic } from './translations/en.js';
import { ar as arStatic } from './translations/ar.js';
import { termTranslations } from './translations/dynamic.js';

const staticTranslations = { en: enStatic, ar: arStatic };

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
                        title: 'ØºØ±ÙØ© Ø§Ù„Ø¨Ø¯Ø§ÙŠØ©',
                        desc: 'Ø§Ù„ØºØ±ÙØ© Ø§Ù„Ø£ÙˆÙ„ÙŠØ© Ø§Ù„ØªÙŠ ØªØ¶Ù… Ø·Ø§ÙˆÙ„Ø© Ø®Ø´Ø¨ÙŠØ©ØŒ ÙƒØ±Ø§Ø³ÙŠØŒ Ù„ÙˆØ­Ø§ØªØŒ ÙˆØ¨ÙˆØ§Ø¨Ø§Øª Ø­Ø¯ÙŠØ¯ÙŠØ© Ù…ØºÙ„Ù‚Ø©.'
                    },
                    {
                        src: 'images/Projects/DungeonPuzzle/screenshot2.webp',
                        title: 'Ù…Ù…Ø±Ø§Øª Ø§Ù„Ø³Ø¬Ù†',
                        desc: 'Ø§Ù„ØªÙ†Ù‚Ù„ Ø¹Ø¨Ø± Ø§Ù„Ù…Ù…Ø±Ø§Øª Ø§Ù„ØªÙŠ ØªØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ø²Ù†Ø§Ø²ÙŠÙ†ØŒ Ø³Ù„Ø§Ø³Ù„ØŒ ÙˆÙ„ÙˆØ­Ø© Ø­Ø§Ø¦Ø· ØªØ´ÙŠØ± Ø¥Ù„Ù‰ ØºØ±ÙØ© Ø§Ù„Ù…ÙØªØ§Ø­.'
                    },
                    {
                        src: 'images/Projects/DungeonPuzzle/screenshot3.webp',
                        title: 'ØºØ±ÙØ© Ø§Ù„ØªØ¹Ø°ÙŠØ¨',
                        desc: 'ØºØ±ÙØ© ÙˆØ§Ø³Ø¹Ø© ØªØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ø£Ø¯ÙˆØ§Øª ØªØ¹Ø°ÙŠØ¨ØŒ ÙƒØªÙ„ Ø¥Ø¹Ø¯Ø§Ù…ØŒ Ø£Ø­ØµÙ†Ø© Ø®Ø´Ø¨ÙŠØ©ØŒ Ø£Ù‚ÙØ§Øµ Ù…Ø¹Ù„Ù‚Ø©ØŒ ÙˆØªØ§Ø¨ÙˆØª Ø­Ø¯ÙŠØ¯ÙŠ (Iron Maidens).'
                    },
                    {
                        src: 'images/Projects/DungeonPuzzle/screenshot4.webp',
                        title: 'Ù…Ø³ØªÙˆØ¯Ø¹ Ø§Ù„Ø£Ø³Ù„Ø­Ø©',
                        desc: 'ØºØ±ÙØ© ØªØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ø±ÙÙˆÙ Ù„Ù„Ø³ÙŠÙˆÙ ÙˆØ§Ù„Ø¯Ø±ÙˆØ¹ØŒ Ø«Ø±ÙŠØ§Øª Ø´Ù…ÙˆØ¹ØŒ ÙˆØ±Ø§ÙŠØ© Ø­Ù…Ø±Ø§Ø¡ Ù…Ø¹Ù„Ù‚Ø©.'
                    },
                    {
                        src: 'images/Projects/DungeonPuzzle/screenshot5.webp',
                        title: 'ØºØ±ÙØ© ÙØ® Ø§Ù„Ø­Ù…Ù…',
                        desc: 'Ø¹Ø¨ÙˆØ± Ø¬Ø³Ø± Ø­Ø¬Ø±ÙŠ Ø¶ÙŠÙ‚ ÙÙˆÙ‚ Ø­Ù…Ù… Ø¨Ø±ÙƒØ§Ù†ÙŠØ© Ù…ØºÙ„ÙŠØ© Ù…Ø¹ ØªÙØ§Ø¯ÙŠ Ø´ÙØ±Ø§Øª Ø¶Ø®Ù…Ø© Ù…ØªØ£Ø±Ø¬Ø­Ø©.'
                    },
                    {
                        src: 'images/Projects/DungeonPuzzle/screenshot6.webp',
                        title: 'Ø±ÙƒÙ† Ø§Ù„ÙƒÙ†Ø²',
                        desc: 'Ø±ÙƒÙ† ÙŠØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø®Ø´Ø¨ÙŠØ© Ø£Ø«Ø±ÙŠØ©.'
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
                        title: 'Ø±Ù Ù„ØºØ² Ø§Ù„ÙƒØªØ¨',
                        desc: 'Ø±Ù Ø­Ø§Ø¦Ø·ÙŠ Ø­Ø¬Ø±ÙŠ Ù…Ø¹ ÙØªØ­Ø§Øª Ù„Ø®Ù…Ø³Ø© ÙƒØªØ¨ØŒ ÙŠÙˆØ¬Ù‡ Ø§Ù„Ù„Ø§Ø¹Ø¨ Ù„ØªØ±ØªÙŠØ¨Ù‡Ø§ Ø¨Ø´ÙƒÙ„ ØµØ­ÙŠØ­.'
                    },
                    {
                        src: 'images/Projects/ScaryLibrary/screenshot2.webp',
                        title: 'ÙˆØ­Ø´ Ø§Ù„Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§ØµØ·Ù†Ø§Ø¹ÙŠ ÙÙŠ Ø¯ÙˆØ±ÙŠØ©',
                        desc: 'ÙˆØ­Ø´ Ù…Ø®ÙŠÙ Ø°Ùˆ ÙˆØ¬Ù‡ Ø£Ø¨ÙŠØ¶ ÙŠÙ‚ÙˆÙ… Ø¨Ø¯ÙˆØ±ÙŠØ© ÙÙŠ Ù…Ù…Ø±Ø§Øª Ø§Ù„Ù…ÙƒØªØ¨Ø© Ø¨ÙŠÙ†Ù…Ø§ ÙŠØ³ØªÙ‚Ø± ÙƒØªØ§Ø¨ Ø£Ø­Ù…Ø± Ø¹Ù„Ù‰ Ø§Ù„Ø·Ø§ÙˆÙ„Ø©.'
                    },
                    {
                        src: 'images/Projects/ScaryLibrary/screenshot3.webp',
                        title: 'Ø±Ø¹Ø¨ Ø§Ù„Ù…ÙØ§Ø¬Ø£Ø© ÙÙŠ Ø§Ù„Ù…ÙƒØªØ¨Ø©',
                        desc: 'Ø§Ù„Ù„Ø­Ø¸Ø© Ø§Ù„Ù…Ø±Ø¹Ø¨Ø© Ø¹Ù†Ø¯Ù…Ø§ ÙŠÙ…Ø³Ùƒ Ø§Ù„ÙˆØ­Ø´ Ø¨Ø§Ù„Ù„Ø§Ø¹Ø¨ Ø¹Ù† Ù‚Ø±Ø¨.'
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
                        title: 'Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ© Ù„Ù„Ø¹Ø¨Ø©',
                        desc: 'ÙˆØ§Ø¬Ù‡Ø© Ø§Ù„Ø¨Ø¯Ø¡ Ù…Ø¹ ÙØ§Ø±Ø³ Ù…Ø¯Ø±Ø¹ Ø¨Ø§Ù„ÙƒØ§Ù…Ù„ ÙŠØ­Ù…Ù„ Ø³Ù„Ø§Ø­Ø§Ù‹ Ù…ÙƒØ¹Ø¨Ø§Ù‹ Ø£ØµÙØ± Ù…ØªÙˆÙ‡Ø¬Ø§Ù‹.'
                    },
                    {
                        src: 'images/Projects/KnightWithGun/screenshot2.webp',
                        title: 'Ø³Ø§Ø­Ø© Ù‚ØªØ§Ù„ Ø§Ù„Ø¬Ø³Ø±',
                        desc: 'Ù‚ØªØ§Ù„ Ø£Ø¹Ø¯Ø§Ø¡ Ø£Ø³Ø·ÙˆØ§Ù†ÙŠÙŠÙ† Ù…ØªÙˆÙ‡Ø¬ÙŠÙ† Ø¨Ø§Ù„Ù„ÙˆÙ† Ø§Ù„Ø£Ø­Ù…Ø± Ø¹Ù„Ù‰ Ø¬Ø³Ø± Ø­Ø¬Ø±ÙŠ Ø¶ÙŠÙ‚ ØªØ­Øª Ø³Ù…Ø§Ø¡ Ù‚Ø±Ù…Ø°ÙŠØ©.'
                    },
                    {
                        src: 'images/Projects/KnightWithGun/screenshot3.webp',
                        title: 'ÙˆØ§Ø¬Ù‡Ø© Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„ØªÙˆÙ‚Ù Ù…Ø¤Ù‚ØªØ§Ù‹',
                        desc: 'ÙˆØ§Ø¬Ù‡Ø© ØªÙˆÙ‚Ù Ù…Ø¤Ù‚Øª ÙƒÙ„Ø§Ø³ÙŠÙƒÙŠØ© Ù…Ø¹ Ø²Ø±ÙŠ Ø§Ù„Ø§Ø³ØªØ¦Ù†Ø§Ù ÙˆØ§Ù„Ø®Ø±ÙˆØ¬.'
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
                        title: 'Ù…Ø´Ù‡Ø¯ Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©',
                        desc: 'Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ© ØªØ³ØªØ¹Ø±Ø¶ Ù…Ø¯Ø®Ù„ Ù…Ù‚Ø¨Ø±Ø© Ø­Ø¬Ø±ÙŠØ© Ù…Ù†Ø­ÙˆØªØ© ÙˆØ³Ø· Ø§Ù„ÙƒØ«Ø¨Ø§Ù† Ø§Ù„Ø±Ù…Ù„ÙŠØ© Ø§Ù„ØµØ­Ø±Ø§ÙˆÙŠØ©.'
                    },
                    {
                        src: 'images/Projects/TheHiddenKanz/screenshot2.webp',
                        title: 'Ø¹Ø±Ø¶ Ø§Ù„Ù‚ØªØ§Ù„ Ù…Ù† Ù…Ù†Ø¸ÙˆØ± Ø§Ù„Ø´Ø®Øµ Ø§Ù„Ø£ÙˆÙ„',
                        desc: 'Ø§Ø³ØªÙƒØ´Ø§Ù Ù…Ù…Ø± Ø­Ø¬Ø±ÙŠ Ù…Ø¹ Ø­Ù…Ù„ Ø³ÙŠÙ ÙˆÙ„Ù‡Ø¨ Ø³Ø­Ø±ÙŠ Ø£Ø®Ø¶Ø± Ù„Ù…ÙˆØ§Ø¬Ù‡Ø© Ø§Ù„Ø£Ø¹Ø¯Ø§Ø¡ Ù…Ù† Ø§Ù„Ù‡ÙŠØ§ÙƒÙ„ Ø§Ù„Ø¹Ø¸Ù…ÙŠØ©.'
                    },
                    {
                        src: 'images/Projects/TheHiddenKanz/screenshot3.webp',
                        title: 'Ø¥Ù„Ù‚Ø§Ø¡ Ø§Ù„Ù‚Ø¯Ø±Ø© Ø§Ù„Ø³Ø­Ø±ÙŠØ©',
                        desc: 'Ù…ÙˆØ§Ø¬Ù‡Ø© Ù…Ø­Ø§Ø±Ø¨ Ù‡ÙŠÙƒÙ„ Ø¹Ø¸Ù…ÙŠ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„Ø§Ø³ØªØ¹Ø¯Ø§Ø¯ Ù„Ø¥Ù„Ù‚Ø§Ø¡ ØªØ¹ÙˆÙŠØ°Ø© Ø³Ø­Ø±ÙŠØ© ÙˆØ±Ø¯ÙŠØ©.'
                    },
                    {
                        src: 'images/Projects/TheHiddenKanz/screenshot4.webp',
                        title: 'ØºØ±ÙØ© Ø§Ù„ØªÙ…Ø§Ø«ÙŠÙ„',
                        desc: 'ØºØ±ÙØ© ÙØ³ÙŠØ­Ø© Ù…Ø­Ø§Ø·Ø© Ø¨ØªÙ…Ø§Ø«ÙŠÙ„ Ø·ÙˆÙŠÙ„Ø© Ø°Ø§Øª Ù‚Ù„Ù†Ø³ÙˆØ§ØªØŒ Ù…Ù…Ø±Ø§Øª Ù…Ù‚ÙˆØ³Ø©ØŒ ÙˆØ£Ù‚ÙØ§Øµ Ù…Ø¹Ù„Ù‚Ø©.'
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
                        title: 'Ø£Ù†ÙˆØ§Ø¹ Ù…Ø®ØªÙ„ÙØ© Ù…Ù† Ø§Ù„Ø£Ø¹Ø¯Ø§Ø¡ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„Ù‚ØªØ§Ù„',
                        desc: 'Ù‚ØªØ§Ù„ ÙÙˆØ±ÙŠ ÙÙŠ Ø§Ù„Ù…Ù†Ø´Ø£Ø© ÙŠØ¸Ù‡Ø± Ø§Ù„Ø±ÙˆØ¨ÙˆØª Ø§Ù„Ù„Ø§Ø¹Ø¨ ÙŠÙ‚Ø§ØªÙ„ Ø£Ù†ÙˆØ§Ø¹Ø§Ù‹ Ù…ØªØ¹Ø¯Ø¯Ø© Ù…Ù† Ø§Ù„Ø£Ø¹Ø¯Ø§Ø¡ (Ø§Ù„Ø±ÙˆØ¨ÙˆØªØ§Øª Ø§Ù„Ù…Ø·Ù„Ù‚Ø© Ù„Ù„Ù†Ø§Ø±ØŒ Ø§Ù„Ø¹Ù†Ø§ÙƒØ¨ Ø§Ù„Ø¢Ù„ÙŠØ©ØŒ ÙˆØ§Ù„Ø±Ø´Ø§Ø´Ø§Øª Ø§Ù„Ù…Ø«Ø¨ØªØ©) Ø¨Ø§Ø³ØªØ®Ø¯Ø§Ù… Ø§Ù„Ø³ÙŠÙ ÙˆØ§Ù„Ø¯Ø±Ø¹.'
                    },
                    {
                        src: 'images/Projects/SyntaxStrike/screenshot2.webp',
                        title: 'Ù‡Ø¬ÙˆÙ… Ø£Ø¹Ø¯Ø§Ø¡ Ø§Ù„Ø¹Ù†ÙƒØ¨ÙˆØª Ø§Ù„Ø¢Ù„ÙŠ',
                        desc: 'Ù…ÙˆØ§Ø¬Ù‡Ø© Ø§Ù„Ø¹Ù†Ø§ÙƒØ¨ Ø§Ù„Ø¢Ù„ÙŠØ© Ø§Ù„Ø³Ø±ÙŠØ¹Ø© ÙˆØ§Ù„Ø£Ø¹Ø¯Ø§Ø¡ Ø¨Ø¹ÙŠØ¯ÙŠ Ø§Ù„Ù…Ø¯Ù‰ Ø¯Ø§Ø®Ù„ Ù…Ù†Ø´Ø£Ø© Ø§Ù„Ù…Ø³ØªÙˆØ¯Ø¹. ÙŠÙ…ÙƒÙ† Ù„Ù„Ø£Ø¹Ø¯Ø§Ø¡ Ø¨Ø¹ÙŠØ¯ÙŠ Ø§Ù„Ù…Ø¯Ù‰ Ø¥Ø·Ù„Ø§Ù‚ Ù‚Ø°Ø§Ø¦Ù ÙˆØªÙØ¬ÙŠØ± Ø£Ù†ÙØ³Ù‡Ù… Ø¥Ø°Ø§ Ø§Ù‚ØªØ±Ø¨ÙˆØ§ ÙƒØ«ÙŠØ±Ø§Ù‹.'
                    },
                    {
                        src: 'images/Projects/SyntaxStrike/screenshot3.webp',
                        title: 'Ø§Ù„ØªÙ‚Ø§Ø· Ø£Ø¯Ø§Ø© Ø§Ù„Ø§Ø®ØªØ±Ø§Ù‚ ÙÙŠ Ø§Ù„Ø¨ÙŠØ¦Ø©',
                        desc: 'ØªØ­Ø¯ÙŠØ¯ Ù…ÙˆÙ‚Ø¹ Ø£Ø¯Ø§Ø© Ø§Ù„Ø§Ø®ØªØ±Ø§Ù‚ ÙÙŠ Ø§Ù„Ù…Ù†Ø´Ø£Ø©. ÙŠØªÙŠØ­ Ø§Ù„Ø­ØµÙˆÙ„ Ø¹Ù„Ù‰ Ø§Ù„Ø£Ø¯Ø§Ø© Ù„Ù„Ø§Ø¹Ø¨ Ø§Ù„ØªÙØ§Ø¹Ù„ Ù…Ø¹ Ø§Ù„Ù…Ø­Ø·Ø§Øª ÙˆØ§Ø®ØªØ±Ø§Ù‚ Ø§Ù„Ø£Ø¹Ø¯Ø§Ø¡ Ø§Ù„Ù…Ø¹Ø·Ù„ÙŠÙ† Ù„Ø­Ù„ Ø£Ù„ØºØ§Ø² Ø§Ù„Ø¨Ø±Ù…Ø¬Ø©.'
                    },
                    {
                        src: 'images/Projects/SyntaxStrike/screenshot4.webp',
                        title: 'Ø¥Ø´Ø¹Ø§Ø± Ø§Ù„Ø­ØµÙˆÙ„ Ø¹Ù„Ù‰ Ø£Ø¯Ø§Ø© Ø§Ù„Ø§Ø®ØªØ±Ø§Ù‚',
                        desc: 'Ø¥Ø´Ø¹Ø§Ø± ÙŠØ¸Ù‡Ø± Ø¹Ù„Ù‰ Ø§Ù„Ø´Ø§Ø´Ø© Ø¹Ù†Ø¯ Ø§Ù„ØªÙ‚Ø§Ø· Ø£Ø¯Ø§Ø© Ø§Ù„Ø§Ø®ØªØ±Ø§Ù‚ØŒ Ù…Ù…Ø§ ÙŠØ¬Ù‡Ø² Ø§Ù„Ø·Ø§Ù„Ø¨ Ù„Ø§Ø®ØªØ±Ø§Ù‚ Ø§Ù„Ø£Ø¹Ø¯Ø§Ø¡ ÙˆÙØªØ­ Ø§Ù„Ø£Ø¨ÙˆØ§Ø¨ Ø§Ù„Ù…Ø¤Ù…Ù†Ø©.'
                    },
                    {
                        src: 'images/Projects/SyntaxStrike/screenshot5.webp',
                        title: 'Ø®Ø·Ø± Ø§Ù„Ù…ÙŠØ§Ù‡ Ø§Ù„Ù…ÙƒÙ‡Ø±Ø¨Ø©',
                        desc: 'ØªØ®Ø·ÙŠ Ø§Ù„Ù…Ø®Ø§Ø·Ø± Ø§Ù„Ø¨ÙŠØ¦ÙŠØ©. ÙŠØ¬Ø¨ Ø¹Ù„Ù‰ Ø§Ù„Ø·Ø§Ù„Ø¨ ØªØ¬Ù†Ø¨ Ø§Ù„Ø¨Ø±Ùƒ Ø§Ù„Ù…ÙƒÙ‡Ø±Ø¨Ø© Ø£Ùˆ Ø§Ø³ØªØ®Ø¯Ø§Ù… ÙˆØ­Ø¯Ø© ØªØ­ÙƒÙ… Ù‚Ø±ÙŠØ¨Ø© Ù„ØªØ¹Ø·ÙŠÙ„ Ø§Ù„ÙƒÙ‡Ø±Ø¨Ø§Ø¡ Ù‚Ø¨Ù„ Ø§Ù„Ø¹Ø¨ÙˆØ±.'
                    },
                    {
                        src: 'images/Projects/SyntaxStrike/screenshot6.webp',
                        title: 'Ù…ÙˆØ§Ø¬Ù‡Ø© Ø§Ù„Ø²Ø¹ÙŠÙ… Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠ',
                        desc: 'Ø§Ù„Ù…ÙˆØ§Ø¬Ù‡Ø© Ø§Ù„Ø£Ø®ÙŠØ±Ø© Ù…Ø¹ Ø§Ù„Ø±ÙˆØ¨ÙˆØª Ø§Ù„Ø²Ø¹ÙŠÙ…. ÙŠØ¬Ø¨ Ø¹Ù„Ù‰ Ø§Ù„Ù„Ø§Ø¹Ø¨ ØªÙØ§Ø¯ÙŠ Ø§Ù„Ù…ÙˆØ¬Ø§Øª Ø§Ù„ØµØ§Ø¯Ù…Ø© ÙˆÙ‡Ø¬Ù…Ø§Øª Ø§Ù„Ø¯Ù‡Ø³ØŒ ÙˆØªÙ‚Ù„ÙŠÙ„ ØµØ­Ø© Ø§Ù„Ø²Ø¹ÙŠÙ… Ø¥Ù„Ù‰ Ø§Ù„ØµÙØ±ØŒ ÙˆØ­Ù„ Ù„ØºØ² Ø¨Ø±Ù…Ø¬ÙŠ ØµØ¹Ø¨ Ù„Ù„ÙÙˆØ².'
                    },
                    {
                        src: 'images/Projects/SyntaxStrike/screenshot7.webp',
                        title: 'Ù…Ø´Ù‡Ø¯ Ù†ØªÙŠØ¬Ø© Ø¥ÙƒÙ…Ø§Ù„ Ø§Ù„Ù…Ø±Ø­Ù„Ø©',
                        desc: 'Ù„ÙˆØ­Ø© Ø¥ÙƒÙ…Ø§Ù„ Ø§Ù„Ù…Ø±Ø­Ù„Ø© Ø§Ù„ØªÙŠ ØªØªØ¨Ø¹ Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª Ø§Ù„Ù„Ø§Ø¹Ø¨ Ø¨Ù…Ø§ ÙÙŠ Ø°Ù„Ùƒ Ø§Ù„Ø£Ø¹Ø¯Ø§Ø¡ Ø§Ù„Ù…Ù‡Ø²ÙˆÙ…ÙŠÙ†ØŒ ÙˆØ¯Ù‚Ø© Ø­Ù„ Ø§Ù„Ø£Ù„ØºØ§Ø² Ø§Ù„Ø¨Ø±Ù…Ø¬ÙŠØ©ØŒ ÙˆØ§Ù„Ù…ÙƒØ§ÙØ¢Øª Ø§Ù„Ø²Ù…Ù†ÙŠØ©ØŒ ÙˆØ§Ù„Ù†ØªÙŠØ¬Ø© Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠØ©.'
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
        if (tagsLabel) tagsLabel.textContent = isArabic ? 'Ø§Ù„ØªÙ‚Ù†ÙŠØ§Øª Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…Ø©' : 'TECH STACK';
        if (teamLabel) teamLabel.textContent = isArabic ? 'ÙØ±ÙŠÙ‚ Ø§Ù„ØªØ·ÙˆÙŠØ±' : 'DEVELOPMENT TEAM';

        if (isAchievement) {
            // Scrape achievement details
            const titleText = card.querySelector('.achievement-title').textContent.trim();
            const sysStatusName = titleText.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_');
            modalTitleElem.textContent = isArabic ? `Ø­Ø§Ù„Ø© Ø§Ù„Ù†Ø¸Ø§Ù…: Ø¥Ù†Ø¬Ø§Ø²_${sysStatusName}.EXE` : `SYSTEM STATUS: ACHIEVEMENT_${sysStatusName}.EXE`;

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
            if (tagsLabel) tagsLabel.textContent = isArabic ? 'Ø§Ù„Ø£ÙˆØ³Ù…Ø©' : 'TAGS';
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
            if (teamLabel) teamLabel.textContent = isArabic ? 'Ø§Ù„ÙØ±ÙŠÙ‚ ÙˆØ§Ù„Ù…ÙˆØ¬Ù‡ÙˆÙ†' : 'TEAM & MENTORS';
            
            if (teamElement || mentorElement) {
                detailsTeamContainer.className = 'ss-details-section achievement-team';
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
                detailsTeamContainer.className = 'ss-details-section';
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
                    title: isArabic ? 'Ø§Ù„Ø´Ù‡Ø§Ø¯Ø© / Ø§Ù„ÙØ¹Ø§Ù„ÙŠØ©' : 'Certificate / Event',
                    desc: titleText
                });
            }
            if (projImgEl) {
                screenshotsList.push({
                    src: projImgEl.src,
                    title: isArabic ? 'Ù„Ù‚Ø·Ø© Ø´Ø§Ø´Ø© Ù„Ù„Ù…Ø´Ø±ÙˆØ¹' : 'Project Screenshot',
                    desc: projTitleEl ? projTitleEl.textContent.trim() : (isArabic ? 'Ù„Ù‚Ø·Ø© Ø´Ø§Ø´Ø© Ù„Ù„Ù…Ø´Ø±ÙˆØ¹' : 'Project Screenshot')
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
            modalTitleElem.textContent = isArabic ? `Ø­Ø§Ù„Ø© Ø§Ù„Ù†Ø¸Ø§Ù…: Ø¹Ø±Ø¶_${sysStatusName}.EXE` : `SYSTEM STATUS: ${sysStatusName}_SHOWCASE.EXE`;

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
                detailsTeamContainer.className = 'ss-details-section project-team';
                detailsTeamContainer.style.display = 'block';
                detailsTeam.innerHTML = teamElement.innerHTML;
            } else {
                detailsTeamContainer.className = 'ss-details-section';
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
            '.achievement-team .team-title', '.achievement-team .team-name', '.achievement-team .team-role', '.achievement-mentor .mentor-title', '.achievement-mentor .mentor-name', '.achievement-mentor .team-name',
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

                const text = el.textContent.trim().replace(/\s+/g, ' ');
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
            const text = el.textContent.trim().replace(/\s+/g, ' ');
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
