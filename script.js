/**
 * Turki Alshaalan Portfolio - Interactive Features
 * Handles navigation, animations, and form interactions
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize all components
    initNavigation();
    initNavbarScroll();
    initSmoothScrolling();
    initSkillBars();
    initContactForm();
    initYear();
    initScrollAnimations();
});

/**
 * Mobile Navigation Toggle
 */
function initNavigation() {
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (!navToggle || !navMenu) return;

    // Toggle menu on button click
    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close menu when clicking a link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
        }
    });
}

/**
 * Navbar scroll effect
 */
function initNavbarScroll() {
    const navbar = document.getElementById('navbar');

    if (!navbar) return;

    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        // Add scrolled class when past threshold
        if (currentScroll > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        lastScroll = currentScroll;
    });
}

/**
 * Smooth scrolling for anchor links
 */
function initSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');

            // Skip if it's just "#" or empty
            if (!href || href === '#') return;

            const target = document.querySelector(href);

            if (target) {
                e.preventDefault();

                const navbarHeight = document.getElementById('navbar')?.offsetHeight || 70;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navbarHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/**
 * Skill bar progress animation on scroll
 */
function initSkillBars() {
    const skillBars = document.querySelectorAll('.skill-progress');

    if (!skillBars.length) return;

    const observerOptions = {
        threshold: 0.3,
        rootMargin: '0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Get the progress value from CSS variable
                const progress = entry.target.style.getPropertyValue('--progress');

                // Animate the width
                setTimeout(() => {
                    entry.target.style.width = progress;
                }, 200);

                // Unobserve after animating
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    skillBars.forEach(bar => {
        // Set initial width to 0
        bar.style.width = '0';
        observer.observe(bar);
    });
}

/**
 * Contact form handling
 */
function initContactForm() {
    const form = document.getElementById('contactForm');

    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Get form data
        const formData = new FormData(form);
        const name = formData.get('name');
        const email = formData.get('email');
        const message = formData.get('message');

        // Simple validation
        if (!name || !email || !message) {
            showNotification('Please fill in all fields', 'error');
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showNotification('Please enter a valid email', 'error');
            return;
        }

        // Simulate form submission (in production, you'd send to a backend)
        showNotification(`Thanks ${name}! Your message has been sent.`, 'success');

        // Reset form
        form.reset();
    });
}

/**
 * Show notification message
 */
function showNotification(message, type = 'info') {
    // Remove existing notification if any
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Style the notification
    notification.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        padding: 16px 24px;
        background: ${type === 'success' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'};
        color: white;
        border-radius: 12px;
        font-weight: 500;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    // Add animation keyframes if not already added
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Remove notification after delay
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

/**
 * Set current year in footer
 */
function initYear() {
    const yearElement = document.getElementById('year');

    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

/**
 * Scroll-triggered animations for sections
 */
function initScrollAnimations() {
    // Elements to animate
    const animatedElements = document.querySelectorAll(
        '.about-text, .about-stats, .skill-category, .project-card, ' +
        '.timeline-item, .certificate-card, .contact-item'
    );

    if (!animatedElements.length) return;

    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Add staggered delay for multiple elements
                const siblings = Array.from(entry.target.parentElement.children);
                const siblingIndex = siblings.indexOf(entry.target);

                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, siblingIndex * 100);

                // Add initial styles
                entry.target.style.opacity = '0';
                entry.target.style.transform = 'translateY(30px)';
                entry.target.style.transition = 'opacity 0.6s ease, transform 0.6s ease';

                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        observer.observe(el);
    });
}

/**
 * Keyboard navigation support
 */
document.addEventListener('keydown', (e) => {
    // Close navigation on Escape key
    if (e.key === 'Escape') {
        const navMenu = document.getElementById('navMenu');
        const navToggle = document.getElementById('navToggle');

        if (navMenu?.classList.contains('active')) {
            navMenu.classList.remove('active');
            navToggle?.classList.remove('active');
        }
    }
});

/**
 * Preload animation classes
 */
// Add helper for animation readiness
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});
