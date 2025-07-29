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
        
        // Load widget when slider is ready
        this.loadWidget();
    }
    
    loadWidget() {
        // Widget'ın yüklenmesini bekle
        setTimeout(() => {
            const widget = document.querySelector('gecko-coin-heatmap-widget');
            if (widget) {
                // Widget'ın tam yüklenmesini bekle
                const checkWidget = setInterval(() => {
                    if (widget.shadowRoot || widget.children.length > 0) {
                        clearInterval(checkWidget);
                        this.adjustWidgetStyles();
                    }
                }, 100);
            }
        }, 2000);
    }
    
    adjustWidgetStyles() {
        const widget = document.querySelector('gecko-coin-heatmap-widget');
        if (widget) {
            // Widget'ın stillerini ayarla
            widget.style.width = '100%';
            widget.style.height = '400px';
            widget.style.margin = '0';
            widget.style.display = 'block';
        }
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
        // Smooth scroll for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    const offsetTop = target.offsetTop - 70; // Account for fixed navbar
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
        this.observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        this.init();
    }
    
    init() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in-up');
                }
            });
        }, this.observerOptions);
        
        // Observe elements for animation
        const animatedElements = document.querySelectorAll('.feature-card, .instrument-card, .about-content, .footer-column');
        animatedElements.forEach(el => observer.observe(el));
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
            if (window.scrollY > 50) {
                this.navbar.style.background = 'rgba(30, 58, 138, 0.95)';
                this.navbar.style.backdropFilter = 'blur(10px)';
            } else {
                this.navbar.style.background = '#1e3a8a';
                this.navbar.style.backdropFilter = 'none';
            }
        });
    }
}

// ===== INSTRUMENT PRICE UPDATES =====
class PriceUpdates {
    constructor() {
        this.instruments = document.querySelectorAll('.instrument-card');
        this.init();
    }
    
    init() {
        // Simulate price updates every 3 seconds
        setInterval(() => {
            this.updatePrices();
        }, 3000);
    }
    
    updatePrices() {
        this.instruments.forEach(instrument => {
            const priceElement = instrument.querySelector('.price');
            const changeElement = instrument.querySelector('.change');
            
            if (priceElement && changeElement) {
                const currentPrice = parseFloat(priceElement.textContent.replace(',', ''));
                const change = (Math.random() - 0.5) * 0.01; // Random change between -0.5% and +0.5%
                const newPrice = currentPrice * (1 + change);
                
                // Update price
                priceElement.textContent = newPrice.toFixed(4);
                
                // Update change indicator
                const changeValue = (change * 100).toFixed(2);
                changeElement.textContent = change > 0 ? `+${changeValue}%` : `${changeValue}%`;
                changeElement.className = `change ${change > 0 ? 'positive' : 'negative'}`;
            }
        });
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
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        
        // Basic validation
        if (!data.name || !data.email || !data.message) {
            this.showMessage('Lütfen tüm alanları doldurun.', 'error');
            return;
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            this.showMessage('Lütfen geçerli bir e-posta adresi girin.', 'error');
            return;
        }
        
        // Success message
        this.showMessage('Mesajınız başarıyla gönderildi!', 'success');
        e.target.reset();
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
            border-radius: 5px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        if (type === 'success') {
            messageEl.style.background = '#10b981';
        } else {
            messageEl.style.background = '#ef4444';
        }
        
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

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all components
    new HeroSlider();
    new MobileMenu();
    new SmoothScroll();
    new ScrollAnimations();
    new NavbarScroll();
    new PriceUpdates();
    new FormValidation();
    
    // Add loading animation
    document.body.classList.add('loaded');
    
    // Add scroll to top functionality
    createScrollToTopButton();
});

// ===== SCROLL TO TOP BUTTON =====
function createScrollToTopButton() {
    const button = document.createElement('button');
    button.innerHTML = '<i class="fas fa-arrow-up"></i>';
    button.className = 'scroll-to-top';
    button.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: #2563eb;
        color: white;
        border: none;
        cursor: pointer;
        display: none;
        z-index: 1000;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        font-size: 1.2rem;
    `;
    
    document.body.appendChild(button);
    
    // Show/hide button based on scroll position
    window.addEventListener('scroll', Utils.throttle(() => {
        if (window.scrollY > 300) {
            button.style.display = 'block';
        } else {
            button.style.display = 'none';
        }
    }, 100));
    
    // Scroll to top when clicked
    button.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // Hover effects
    button.addEventListener('mouseenter', () => {
        button.style.transform = 'scale(1.1)';
        button.style.background = '#1d4ed8';
    });
    
    button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
        button.style.background = '#2563eb';
    });
}

// ===== KEYBOARD NAVIGATION =====
document.addEventListener('keydown', (e) => {
    // Arrow key navigation for slider
    if (e.key === 'ArrowLeft') {
        document.querySelector('.prev-btn').click();
    } else if (e.key === 'ArrowRight') {
        document.querySelector('.next-btn').click();
    }
    
    // Escape key to close mobile menu
    if (e.key === 'Escape') {
        const mobileMenu = document.querySelector('.nav-menu');
        if (mobileMenu.classList.contains('active')) {
            document.querySelector('.hamburger').click();
        }
    }
});

// ===== PERFORMANCE OPTIMIZATION =====
// Lazy loading for images
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// ===== ERROR HANDLING =====
window.addEventListener('error', (e) => {
    console.error('JavaScript Error:', e.error);
});

// ===== ANALYTICS SIMULATION =====
class Analytics {
    static trackEvent(eventName, data = {}) {
        console.log('Analytics Event:', eventName, data);
        // In a real application, this would send data to analytics service
    }
    
    static trackPageView() {
        this.trackEvent('page_view', {
            url: window.location.href,
            title: document.title
        });
    }
}

// Track page view on load
Analytics.trackPageView(); 