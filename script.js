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
        '.timeline-item',
        '.education-card',
        '.certification-card',
        '.contact-item',
        '.theme-toggle', '.sound-toggle', '.hamburger',
        '.social-link'
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
        '.timeline-item',
        '.education-card',
        '.certification-card',
        '.contact-item',
        '.theme-toggle', '.sound-toggle', '.hamburger',
        '.social-link'
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
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');

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

    document.querySelectorAll('.project-card, .timeline-item, .skill-category, .certification-card, .contact-item').forEach(el => {
        observer.observe(el);
    });
}
