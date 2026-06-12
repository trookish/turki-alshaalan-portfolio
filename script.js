/**
 * Turki Alshaalan Portfolio Website
 * Interactive functionality and animations
 */

import { en as enStatic } from './translations/en.js';
import { ar as arStatic } from './translations/ar.js';
import { termTranslations } from './translations/dynamic.js';
import { en as showcaseEn, ar as showcaseAr } from './translations/showcase.js';

const staticTranslations = { en: enStatic, ar: arStatic };
const showcase = { en: showcaseEn, ar: showcaseAr };

/**
 * Get the localized showcase strings for the current language.
 * Falls back to English if a key is missing in the requested language.
 */
function getShowcase(lang) {
    return showcase[lang] || showcase.en;
}

/**
 * Translate a dynamic term to the current language.
 * Returns the AR version if a translation is defined, otherwise the
 * original EN text. Used for content scraped from the DOM after the
 * initial translation pass (e.g. project descriptions inside the
 * showcase modal which is opened on demand).
 */
function localize(text) {
    return termTranslations[text] || text;
}

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
        const s = getShowcase(currentLang).modal;

        // Reset label defaults in case they were modified by achievements
        if (subtitleElem) subtitleElem.style.display = 'none';
        if (tagsLabel) tagsLabel.textContent = s.tech_stack;
        if (teamLabel) teamLabel.textContent = s.development_team;

        if (isAchievement) {
            // Scrape achievement details
            const titleText = card.querySelector('.achievement-title').textContent.trim();
            const sysStatusName = titleText.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_');
            modalTitleElem.textContent = `${s.achievement_title_prefix}${sysStatusName}.EXE`;

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
                descHtml += `<strong style="color: var(--accent-primary); font-family: var(--font-terminal);">${localize(projTitleEl.textContent.trim())}</strong><br><br>`;
            }
            if (projDescEl) {
                descHtml += localize(projDescEl.textContent.trim());
            }
            detailsDesc.innerHTML = descHtml;

            // Populate tags (change label to TAGS)
            if (tagsLabel) tagsLabel.textContent = s.tags;
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
            if (teamLabel) teamLabel.textContent = s.team_and_mentors;
            
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
                    title: isArabic ? s.certificate_event : 'Certificate / Event',
                    desc: titleText
                });
            }
            if (projImgEl) {
                screenshotsList.push({
                    src: projImgEl.src,
                    title: isArabic ? s.project_screenshot : 'Project Screenshot',
                    desc: projTitleEl ? projTitleEl.textContent.trim() : (isArabic ? s.project_screenshot : 'Project Screenshot')
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
            modalTitleElem.textContent = `${s.title_prefix}${sysStatusName}_SHOWCASE.EXE`;

            // Populate scraped details
            detailsTitle.textContent = titleText;
            detailsDesc.textContent = localize(descText);

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
            const projectScreenshots = getShowcase(currentLang).projects[projectKey];
            if (projectScreenshots) {
                screenshotsList = projectScreenshots;
                
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
