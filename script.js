// ===== DOM CONTENT LOADED =====
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initNavbar();
    initHeroSlider();
    initMobileMenu();
    initSmoothScroll();
    initContactForm();
    initLiveSupport();
    initScrollAnimations();
    initMarketIndicators();
});

// ===== NAVBAR FUNCTIONALITY =====
function initNavbar() {
    const navbar = document.getElementById('navbar');
    
    // Add scroll effect to navbar
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// ===== HERO SLIDER =====
function initHeroSlider() {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.slider-dot');
    let currentSlide = 0;
    let slideInterval;

    // Function to show specific slide
    function showSlide(index) {
        // Remove active class from all slides and dots
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        
        // Add active class to current slide and dot
        slides[index].classList.add('active');
        dots[index].classList.add('active');
        
        currentSlide = index;
    }

    // Auto-slide functionality
    function startAutoSlide() {
        slideInterval = setInterval(() => {
            currentSlide = (currentSlide + 1) % slides.length;
            showSlide(currentSlide);
        }, 5000); // Change slide every 5 seconds
    }

    // Stop auto-slide
    function stopAutoSlide() {
        clearInterval(slideInterval);
    }

    // Add click event to dots
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            showSlide(index);
            stopAutoSlide();
            setTimeout(startAutoSlide, 10000); // Restart auto-slide after 10 seconds
        });
    });

    // Pause on hover
    const sliderContainer = document.querySelector('.slider-container');
    sliderContainer.addEventListener('mouseenter', stopAutoSlide);
    sliderContainer.addEventListener('mouseleave', startAutoSlide);

    // Initialize auto-slide
    startAutoSlide();

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            currentSlide = currentSlide === 0 ? slides.length - 1 : currentSlide - 1;
            showSlide(currentSlide);
            stopAutoSlide();
            setTimeout(startAutoSlide, 10000);
        } else if (e.key === 'ArrowRight') {
            currentSlide = (currentSlide + 1) % slides.length;
            showSlide(currentSlide);
            stopAutoSlide();
            setTimeout(startAutoSlide, 10000);
        }
    });
}

// ===== MOBILE MENU =====
function initMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Toggle mobile menu
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
        
        // Animate hamburger
        const spans = hamburger.querySelectorAll('span');
        spans.forEach((span, index) => {
            if (hamburger.classList.contains('active')) {
                if (index === 0) span.style.transform = 'rotate(45deg) translate(5px, 5px)';
                if (index === 1) span.style.opacity = '0';
                if (index === 2) span.style.transform = 'rotate(-45deg) translate(7px, -6px)';
            } else {
                span.style.transform = 'none';
                span.style.opacity = '1';
            }
        });
    });

    // Close menu on link click
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
            
            const spans = hamburger.querySelectorAll('span');
            spans.forEach(span => {
                span.style.transform = 'none';
                span.style.opacity = '1';
            });
        });
    });

    // Close menu on outside click
    document.addEventListener('click', (e) => {
        if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
            
            const spans = hamburger.querySelectorAll('span');
            spans.forEach(span => {
                span.style.transform = 'none';
                span.style.opacity = '1';
            });
        }
    });
}

// ===== SMOOTH SCROLL =====
function initSmoothScroll() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 80; // Account for navbar height
                
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ===== CONTACT FORM =====
function initContactForm() {
    const form = document.getElementById('callbackForm');
    const inputs = form.querySelectorAll('input, select');
    
    // Form validation
    function validateForm() {
        let isValid = true;
        
        inputs.forEach(input => {
            if (input.hasAttribute('required') && !input.value.trim()) {
                input.style.borderColor = '#ff3f34';
                isValid = false;
            } else {
                input.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }
            
            // Email validation
            if (input.type === 'email' && input.value) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(input.value)) {
                    input.style.borderColor = '#ff3f34';
                    isValid = false;
                }
            }
            
            // Phone validation
            if (input.type === 'tel' && input.value) {
                const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
                if (!phoneRegex.test(input.value)) {
                    input.style.borderColor = '#ff3f34';
                    isValid = false;
                }
            }
        });
        
        return isValid;
    }

    // Form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (validateForm()) {
            const submitBtn = form.querySelector('.submit-btn');
            const originalText = submitBtn.textContent;
            
            // Show loading state
            submitBtn.textContent = 'Gönderiliyor...';
            submitBtn.disabled = true;
            
            // Simulate form submission
            setTimeout(() => {
                submitBtn.textContent = 'Başarıyla Gönderildi!';
                submitBtn.style.background = '#22c55e';
                
                // Reset form after 3 seconds
                setTimeout(() => {
                    form.reset();
                    submitBtn.textContent = originalText;
                    submitBtn.style.background = '#2563eb';
                    submitBtn.disabled = false;
                }, 3000);
            }, 2000);
        } else {
            // Show error message
            const submitBtn = form.querySelector('.submit-btn');
            const originalText = submitBtn.textContent;
            
            submitBtn.textContent = 'Lütfen Tüm Alanları Doldurun';
            submitBtn.style.background = '#ff3f34';
            
            setTimeout(() => {
                submitBtn.textContent = originalText;
                submitBtn.style.background = '#2563eb';
            }, 3000);
        }
    });

    // Real-time validation
    inputs.forEach(input => {
        input.addEventListener('blur', validateForm);
        input.addEventListener('focus', () => {
            input.style.borderColor = '#2563eb';
        });
    });
}

// ===== LIVE SUPPORT =====
function initLiveSupport() {
    const supportBtn = document.querySelector('.support-btn');
    
    supportBtn.addEventListener('click', () => {
        // Create support popup
        const popup = document.createElement('div');
        popup.className = 'support-popup';
        popup.innerHTML = `
            <div class="popup-content">
                <div class="popup-header">
                    <h3>Canlı Destek</h3>
                    <button class="close-popup">&times;</button>
                </div>
                <div class="popup-body">
                    <p>Merhaba! Size nasıl yardımcı olabiliriz?</p>
                    <div class="support-options">
                        <button class="support-option">Hesap Açma</button>
                        <button class="support-option">Platform Desteği</button>
                        <button class="support-option">Teknik Destek</button>
                        <button class="support-option">Genel Bilgi</button>
                    </div>
                    <div class="contact-methods">
                        <a href="tel:08501234567" class="contact-method">
                            <i class="fas fa-phone"></i>
                            0850 123 45 67
                        </a>
                        <a href="mailto:info@globaltradepro.com" class="contact-method">
                            <i class="fas fa-envelope"></i>
                            E-posta Gönder
                        </a>
                        <a href="#" class="contact-method">
                            <i class="fab fa-whatsapp"></i>
                            WhatsApp
                        </a>
                    </div>
                </div>
            </div>
        `;
        
        // Add styles
        popup.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        const popupContent = popup.querySelector('.popup-content');
        popupContent.style.cssText = `
            background: #fff;
            border-radius: 15px;
            max-width: 400px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            transform: scale(0.8);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(popup);
        
        // Show popup
        setTimeout(() => {
            popup.style.opacity = '1';
            popupContent.style.transform = 'scale(1)';
        }, 10);
        
        // Close popup functionality
        const closeBtn = popup.querySelector('.close-popup');
        const closePopup = () => {
            popup.style.opacity = '0';
            popupContent.style.transform = 'scale(0.8)';
            setTimeout(() => {
                document.body.removeChild(popup);
            }, 300);
        };
        
        closeBtn.addEventListener('click', closePopup);
        popup.addEventListener('click', (e) => {
            if (e.target === popup) closePopup();
        });
        
        // Support option handlers
        const supportOptions = popup.querySelectorAll('.support-option');
        supportOptions.forEach(option => {
            option.addEventListener('click', () => {
                alert(`${option.textContent} konusunda size yardımcı olmak için temsilcimiz en kısa sürede iletişime geçecek.`);
                closePopup();
            });
        });
    });
}

// ===== SCROLL ANIMATIONS =====
function initScrollAnimations() {
    const animateElements = document.querySelectorAll('.service-card, .education-card, .indicator-item');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    animateElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(element);
    });
}

// ===== MARKET INDICATORS ANIMATION =====
function initMarketIndicators() {
    const indicators = document.querySelectorAll('.indicator-item');
    
    // Animate price changes
    function animatePriceChange() {
        indicators.forEach(indicator => {
            const priceElement = indicator.querySelector('.price');
            const changeElement = indicator.querySelector('.change');
            
            // Random price simulation
            if (Math.random() > 0.7) { // 30% chance of change
                const currentPrice = parseFloat(priceElement.textContent.replace(',', ''));
                const changePercent = (Math.random() - 0.5) * 0.02; // ±1% change
                const newPrice = currentPrice * (1 + changePercent);
                
                // Update price with animation
                priceElement.style.transform = 'scale(1.05)';
                priceElement.style.color = changePercent > 0 ? '#22c55e' : '#ef4444';
                
                setTimeout(() => {
                    priceElement.textContent = newPrice.toFixed(indicator.querySelector('.pair').textContent.includes('/') ? 4 : 2);
                    
                    setTimeout(() => {
                        priceElement.style.transform = 'scale(1)';
                        priceElement.style.color = '#fff';
                    }, 300);
                }, 150);
                
                // Update change indicator
                const changeValue = changePercent * currentPrice;
                changeElement.textContent = (changePercent > 0 ? '+' : '') + changeValue.toFixed(changePercent > 0 ? 4 : 4);
                changeElement.className = 'change ' + (changePercent > 0 ? 'positive' : 'negative');
            }
        });
    }
    
    // Run price animation every 3-8 seconds
    setInterval(animatePriceChange, 3000 + Math.random() * 5000);
}

// ===== UTILITY FUNCTIONS =====

// Smooth scroll to top
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Add scroll to top functionality
window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollTop > 300) {
        if (!document.querySelector('.scroll-to-top')) {
            const scrollBtn = document.createElement('button');
            scrollBtn.className = 'scroll-to-top';
            scrollBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
            scrollBtn.style.cssText = `
                position: fixed;
                bottom: 100px;
                right: 30px;
                background: #2563eb;
                color: #fff;
                border: none;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 1.2rem;
                z-index: 999;
                transition: all 0.3s ease;
                opacity: 0.8;
            `;
            
            scrollBtn.addEventListener('click', scrollToTop);
            scrollBtn.addEventListener('mouseenter', () => {
                scrollBtn.style.background = '#1d4ed8';
                scrollBtn.style.transform = 'translateY(-3px)';
            });
            scrollBtn.addEventListener('mouseleave', () => {
                scrollBtn.style.background = '#2563eb';
                scrollBtn.style.transform = 'translateY(0)';
            });
            
            document.body.appendChild(scrollBtn);
        }
    } else {
        const scrollBtn = document.querySelector('.scroll-to-top');
        if (scrollBtn) {
            document.body.removeChild(scrollBtn);
        }
    }
});

// ===== CTA BUTTON EFFECTS =====
document.addEventListener('DOMContentLoaded', () => {
    const ctaButtons = document.querySelectorAll('.btn-cta, .card-btn, .submit-btn');
    
    ctaButtons.forEach(button => {
        button.addEventListener('mouseenter', () => {
            const ripple = document.createElement('span');
            ripple.style.cssText = `
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.3);
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
            `;
            
            const rect = button.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = '50%';
            ripple.style.top = '50%';
            ripple.style.marginLeft = -size / 2 + 'px';
            ripple.style.marginTop = -size / 2 + 'px';
            
            button.style.position = 'relative';
            button.style.overflow = 'hidden';
            button.appendChild(ripple);
            
            setTimeout(() => {
                try {
                    button.removeChild(ripple);
                } catch (e) {
                    // Ripple already removed
                }
            }, 600);
        });
    });
    
    // Add ripple animation CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(2);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
});

// ===== PERFORMANCE OPTIMIZATION =====
// Debounce function for scroll events
function debounce(func, wait) {
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

// Optimized scroll handler
const optimizedScrollHandler = debounce(() => {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
}, 10);

window.addEventListener('scroll', optimizedScrollHandler); 