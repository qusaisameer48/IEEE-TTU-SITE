/* ===================================
   JOIN PAGE JAVASCRIPT
   File: assets/js/join.js
=================================== */

document.addEventListener('DOMContentLoaded', function() {

  // ===== FAQ TOGGLE FUNCTIONALITY =====
  const faqQuestions = document.querySelectorAll('.faq-question');
  
  faqQuestions.forEach(question => {
    question.addEventListener('click', () => {
      const faqItem = question.parentElement;
      const isActive = faqItem.classList.contains('active');
      
      document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
      });
      
      if (!isActive) {
        faqItem.classList.add('active');
      }
    });
  });

  // ===== FORM SUBMISSION HANDLER (WHATSAPP) =====
  const contactForm = document.getElementById('contactForm');
  
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const phone = document.getElementById("phone").value.trim();
      const message = document.getElementById("message").value.trim();

      const whatsappNumber = "0775726812"; // حط رقم واتساب تبعكم بدون +

      const text =
        `New Contact Message:\n` +
        `Name: ${name}\n` +
        `Email: ${email}\n` +
        `Phone: ${phone || "Not provided"}\n` +
        `Message: ${message}`;

      const encodedText = encodeURIComponent(text);
      const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodedText}`;

      window.open(whatsappURL, "_blank");

      this.reset();
    });
  }

  // ===== THEME TOGGLE =====
  const themeToggle = document.getElementById('themeToggle');
  const html = document.documentElement;
  
  if (themeToggle) {
    const savedTheme = localStorage.getItem('theme') || 'light';
    html.setAttribute('data-theme', savedTheme);
    
    themeToggle.addEventListener('click', () => {
      const currentTheme = html.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      html.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
    });
  }

  // ===== FORM VALIDATION ENHANCEMENTS =====
  const formInputs = document.querySelectorAll('.form-group input, .form-group textarea');
  
  formInputs.forEach(input => {
    input.addEventListener('focus', function() {
      this.parentElement.classList.add('focused');
    });
    
    input.addEventListener('blur', function() {
      this.parentElement.classList.remove('focused');
      
      if (this.required && !this.value.trim()) {
        this.classList.add('error');
      } else {
        this.classList.remove('error');
      }
    });
    
    input.addEventListener('input', function() {
      if (this.classList.contains('error') && this.value.trim()) {
        this.classList.remove('error');
      }
    });
  });

  // ===== EMAIL VALIDATION =====
  const emailInput = document.getElementById('email');
  
  if (emailInput) {
    emailInput.addEventListener('blur', function() {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      if (this.value && !emailPattern.test(this.value)) {
        this.classList.add('error');
        this.setCustomValidity('Please enter a valid email address');
      } else {
        this.classList.remove('error');
        this.setCustomValidity('');
      }
    });
  }

  // ===== PHONE FILTER =====
  const phoneInput = document.getElementById('phone');
  
  if (phoneInput) {
    phoneInput.addEventListener('input', function() {
      this.value = this.value.replace(/[^\d+\s]/g, '');
    });
  }

  // ===== SCROLL ANIMATIONS =====
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.video-section, .faq-section, .contact-section')
    .forEach(section => observer.observe(section));
});

window.addEventListener('load', function() {
  document.body.classList.add('loaded');
});
