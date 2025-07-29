// ===== SLIDER FUNCTIONALITY =====
class HeroSlider {
    constructor() {
        this.slides = document.querySelectorAll('.slide');
        this.dots = document.querySelectorAll('.dot');
        this.prevBtn = document.querySelector('.prev-btn');
        this.nextBtn = document.querySelector('.next-btn');
        this.currentSlide = 0;
        this.slideInterval = null;
        
        this.init();
    }
    
    init() {
        // Event listeners for navigation buttons
        this.prevBtn.addEventListener('click', () => this.prevSlide());
        this.nextBtn.addEventListener('click', () => this.nextSlide());
        
        // Event listeners for dots
        this.dots.forEach((dot, index) => {
            dot.addEventListener('click', () => this.goToSlide(index));
        });
        
        // Start auto-slide
        this.startAutoSlide();
        
        // Pause auto-slide on hover
        const sliderContainer = document.querySelector('.slider-container');
        sliderContainer.addEventListener('mouseenter', () => this.stopAutoSlide());
        sliderContainer.addEventListener('mouseleave', () => this.startAutoSlide());
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.prevSlide();
            if (e.key === 'ArrowRight') this.nextSlide();
        });
    }
    
    goToSlide(index) {
        // Remove active class from current slide and dot
        this.slides[this.currentSlide].classList.remove('active');
        this.dots[this.currentSlide].classList.remove('active');
        
        // Update current slide
        this.currentSlide = index;
        
        // Add active class to new slide and dot
        this.slides[this.currentSlide].classList.add('active');
        this.dots[this.currentSlide].classList.add('active');
    }
    
    nextSlide() {
        const nextIndex = (this.currentSlide + 1) % this.slides.length;
        this.goToSlide(nextIndex);
    }
    
    prevSlide() {
        const prevIndex = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
        this.goToSlide(prevIndex);
    }
    
    startAutoSlide() {
        this.slideInterval = setInterval(() => {
            this.nextSlide();
        }, 5000); // Change slide every 5 seconds
    }
    
    stopAutoSlide() {
        if (this.slideInterval) {
            clearInterval(this.slideInterval);
            this.slideInterval = null;
        }
    }
}

// ===== MOBILE MENU FUNCTIONALITY =====
class MobileMenu {
    constructor() {
        this.hamburger = document.querySelector('.hamburger');
        this.navMenu = document.querySelector('.nav-menu');
        this.navLinks = document.querySelectorAll('.nav-link');
        
        this.init();
    }
    
    init() {
        // Toggle mobile menu
        this.hamburger.addEventListener('click', () => this.toggleMenu());
        
        // Close menu when clicking on a link
        this.navLinks.forEach(link => {
            link.addEventListener('click', () => this.closeMenu());
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.hamburger.contains(e.target) && !this.navMenu.contains(e.target)) {
                this.closeMenu();
            }
        });
        
        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeMenu();
            }
        });
    }
    
    toggleMenu() {
        this.hamburger.classList.toggle('active');
        this.navMenu.classList.toggle('active');
        
        // Animate hamburger bars
        const bars = this.hamburger.querySelectorAll('.bar');
        bars.forEach((bar, index) => {
            if (this.hamburger.classList.contains('active')) {
                if (index === 0) bar.style.transform = 'rotate(45deg) translate(5px, 5px)';
                if (index === 1) bar.style.opacity = '0';
                if (index === 2) bar.style.transform = 'rotate(-45deg) translate(7px, -6px)';
            } else {
                bar.style.transform = 'none';
                bar.style.opacity = '1';
            }
        });
    }
    
    closeMenu() {
        this.hamburger.classList.remove('active');
        this.navMenu.classList.remove('active');
        
        // Reset hamburger bars
        const bars = this.hamburger.querySelectorAll('.bar');
        bars.forEach(bar => {
            bar.style.transform = 'none';
            bar.style.opacity = '1';
        });
    }
}

// ===== SMOOTH SCROLLING =====
class SmoothScroll {
    constructor() {
        this.init();
    }
    
    init() {
        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    const offsetTop = target.offsetTop - 80; // Account for fixed navbar
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }
}

// ===== SCROLL ANIMATIONS =====
class ScrollAnimations {
    constructor() {
        this.init();
    }
    
    init() {
        // Intersection Observer for fade-in animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in-up');
                }
            });
        }, observerOptions);
        
        // Observe elements for animation
        const animateElements = document.querySelectorAll('.feature-card, .instrument-card, .about-content, .section-title');
        animateElements.forEach(el => observer.observe(el));
    }
}

// ===== NAVBAR SCROLL EFFECT =====
class NavbarScroll {
    constructor() {
        this.navbar = document.querySelector('.navbar');
        this.init();
    }
    
    init() {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                this.navbar.style.background = 'rgba(30, 55, 153, 0.95)';
                this.navbar.style.backdropFilter = 'blur(10px)';
            } else {
                this.navbar.style.background = '#1e3799';
                this.navbar.style.backdropFilter = 'none';
            }
        });
    }
}

// ===== PRICE UPDATES SIMULATION =====
class PriceUpdates {
    constructor() {
        this.init();
    }
    
    init() {
        // Simulate live price updates
        setInterval(() => {
            this.updatePrices();
        }, 3000);
    }
    
    updatePrices() {
        const priceElements = document.querySelectorAll('.price');
        const changeElements = document.querySelectorAll('.change');
        
        priceElements.forEach((priceEl, index) => {
            const currentPrice = parseFloat(priceEl.textContent.replace(/[^\d.]/g, ''));
            const change = (Math.random() - 0.5) * 0.02; // Random change between -1% and +1%
            const newPrice = currentPrice * (1 + change);
            
            // Update price with animation
            priceEl.style.transition = 'color 0.3s ease';
            priceEl.style.color = change > 0 ? '#10b981' : '#ef4444';
            
            setTimeout(() => {
                priceEl.style.color = change > 0 ? '#10b981' : '#ef4444';
            }, 300);
            
            // Update change indicator
            if (changeElements[index]) {
                const changeEl = changeElements[index];
                const changePercent = (change * 100).toFixed(2);
                const isPositive = change > 0;
                
                changeEl.textContent = `${isPositive ? '+' : ''}${changePercent}%`;
                changeEl.className = `change ${isPositive ? 'positive' : 'negative'}`;
            }
        });
    }
}

// ===== SCROLLING COINS ANIMATION =====
class ScrollingCoins {
    constructor() {
        this.init();
    }
    
    init() {
        // Add hover pause functionality
        const scrollContainer = document.querySelector('.coins-scroll-container');
        const scrollElement = document.querySelector('.coins-scroll');
        
        if (scrollContainer && scrollElement) {
            // Pause on hover
            scrollContainer.addEventListener('mouseenter', () => {
                scrollElement.style.animationPlayState = 'paused';
            });
            
            scrollContainer.addEventListener('mouseleave', () => {
                scrollElement.style.animationPlayState = 'running';
            });
            
            // Add touch support for mobile
            let isTouching = false;
            
            scrollContainer.addEventListener('touchstart', () => {
                isTouching = true;
                scrollElement.style.animationPlayState = 'paused';
            });
            
            scrollContainer.addEventListener('touchend', () => {
                isTouching = false;
                setTimeout(() => {
                    if (!isTouching) {
                        scrollElement.style.animationPlayState = 'running';
                    }
                }, 1000);
            });
        }
    }
}

// ===== FORM VALIDATION =====
class FormValidation {
    constructor() {
        this.init();
    }
    
    init() {
        // Add form validation if forms exist
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        });
    }
    
    handleSubmit(e) {
        e.preventDefault();
        
        // Basic form validation
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const name = formData.get('name');
        
        if (!email || !name) {
            this.showMessage('Lütfen tüm alanları doldurun.', 'error');
            return;
        }
        
        if (!this.isValidEmail(email)) {
            this.showMessage('Geçerli bir e-posta adresi girin.', 'error');
            return;
        }
        
        // Simulate form submission
        this.showMessage('Form başarıyla gönderildi!', 'success');
        e.target.reset();
    }
    
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    showMessage(message, type) {
        // Create message element
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            background: ${type === 'success' ? '#10b981' : '#ef4444'};
        `;
        
        document.body.appendChild(messageEl);
        
        // Remove message after 3 seconds
        setTimeout(() => {
            messageEl.remove();
        }, 3000);
    }
}

// ===== UTILITY FUNCTIONS =====
class Utils {
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// ===== SCROLL TO TOP BUTTON =====
function createScrollToTopButton() {
    const button = document.createElement('button');
    button.innerHTML = '<i class="fas fa-chevron-up"></i>';
    button.className = 'scroll-to-top';
    button.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: #1e3799;
        color: white;
        border: none;
        cursor: pointer;
        font-size: 1.2rem;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        z-index: 1000;
        box-shadow: 0 4px 15px rgba(30, 55, 153, 0.3);
    `;
    
    document.body.appendChild(button);
    
    // Show/hide button based on scroll position
    window.addEventListener('scroll', Utils.throttle(() => {
        if (window.scrollY > 300) {
            button.style.opacity = '1';
            button.style.visibility = 'visible';
        } else {
            button.style.opacity = '0';
            button.style.visibility = 'hidden';
        }
    }, 100));
    
    // Scroll to top on click
    button.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // Hover effects
    button.addEventListener('mouseenter', () => {
        button.style.transform = 'translateY(-3px)';
        button.style.boxShadow = '0 6px 20px rgba(30, 55, 153, 0.4)';
    });
    
    button.addEventListener('mouseleave', () => {
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = '0 4px 15px rgba(30, 55, 153, 0.3)';
    });
}

// ===== ANALYTICS SIMULATION =====
class Analytics {
    static trackEvent(eventName, data = {}) {
        // Simulate analytics tracking
        console.log('Analytics Event:', eventName, data);
    }
    
    static trackPageView() {
        this.trackEvent('page_view', {
            page: window.location.pathname,
            title: document.title
        });
    }
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all classes
    new HeroSlider();
    new MobileMenu();
    new SmoothScroll();
    new ScrollAnimations();
    new NavbarScroll();
    new PriceUpdates();
    new ScrollingCoins();
    new FormValidation();
    
    // Create scroll to top button
    createScrollToTopButton();
    
    // Track page view
    Analytics.trackPageView();
    
    // Performance optimization: Lazy load images
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                observer.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
    
    // Error handling
    window.addEventListener('error', (e) => {
        console.error('JavaScript Error:', e.error);
        Analytics.trackEvent('error', {
            message: e.error.message,
            filename: e.filename,
            lineno: e.lineno
        });
    });
});

// ===== CSS ANIMATIONS =====
const style = document.createElement('style');
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
    
    .lazy {
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    
    .lazy.loaded {
        opacity: 1;
    }
`;
document.head.appendChild(style); 