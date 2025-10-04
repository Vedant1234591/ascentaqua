// Auth form enhancements
document.addEventListener('DOMContentLoaded', function() {
    initializeAuthForms();
});

function initializeAuthForms() {
    // Password strength indicator
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('input', updatePasswordStrength);
    }

    // Password visibility toggle
    const toggleButtons = document.querySelectorAll('.password-toggle');
    toggleButtons.forEach(button => {
        button.addEventListener('click', togglePasswordVisibility);
    });

    // Form submission handling
    const forms = document.querySelectorAll('.auth-form');
    forms.forEach(form => {
        form.addEventListener('submit', handleAuthFormSubmit);
    });

    // Real-time validation
    const inputs = document.querySelectorAll('.auth-form input[required]');
    inputs.forEach(input => {
        input.addEventListener('blur', validateField);
        input.addEventListener('input', clearFieldError);
    });
}

function updatePasswordStrength() {
    const password = this.value;
    const strengthBar = document.querySelector('.strength-fill');
    const strengthText = document.querySelector('.strength-text');
    
    if (!strengthBar || !strengthText) return;

    let strength = 0;
    let text = 'Password Strength';
    let className = '';

    // Length check
    if (password.length >= 8) strength += 1;
    // Lowercase check
    if (/[a-z]/.test(password)) strength += 1;
    // Uppercase check
    if (/[A-Z]/.test(password)) strength += 1;
    // Number check
    if (/[0-9]/.test(password)) strength += 1;
    // Special character check
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;

    switch(strength) {
        case 0:
        case 1:
            className = 'weak';
            text = 'Weak password';
            break;
        case 2:
        case 3:
            className = 'medium';
            text = 'Medium strength';
            break;
        case 4:
        case 5:
            className = 'strong';
            text = 'Strong password';
            break;
    }

    strengthBar.className = `strength-fill ${className}`;
    strengthText.textContent = text;
}

function togglePasswordVisibility(e) {
    e.preventDefault();
    const button = e.target.closest('.password-toggle');
    const input = button.previousElementSibling;
    const icon = button.querySelector('i');

    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
        button.setAttribute('aria-label', 'Hide password');
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
        button.setAttribute('aria-label', 'Show password');
    }
}

function handleAuthFormSubmit(e) {
    const form = e.target;
    const button = form.querySelector('button[type="submit"]');
    const inputs = form.querySelectorAll('input[required]');
    
    let isValid = true;

    // Validate all required fields
    inputs.forEach(input => {
        if (!validateField.call(input)) {
            isValid = false;
        }
    });

    if (!isValid) {
        e.preventDefault();
        showNotification('Please fix the errors before submitting.', 'error');
        return;
    }

    // Show loading state
    if (button) {
        button.classList.add('loading');
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner"></i> Processing...';
    }
}

function validateField() {
    const field = this;
    const value = field.value.trim();
    const formGroup = field.closest('.form-group');
    
    // Remove existing error
    clearFieldError.call(field);

    // Required field validation
    if (field.hasAttribute('required') && !value) {
        showFieldError(formGroup, 'This field is required');
        return false;
    }

    // Email validation
    if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            showFieldError(formGroup, 'Please enter a valid email address');
            return false;
        }
    }

    // Password validation
    if (field.type === 'password' && value) {
        if (value.length < 6) {
            showFieldError(formGroup, 'Password must be at least 6 characters long');
            return false;
        }
    }

    // Phone validation
    if (field.type === 'tel' && value) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
            showFieldError(formGroup, 'Please enter a valid phone number');
            return false;
        }
    }

    return true;
}

function showFieldError(formGroup, message) {
    formGroup.classList.add('error');
    
    let errorElement = formGroup.querySelector('.error-message');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        formGroup.appendChild(errorElement);
    }
    
    errorElement.textContent = message;
}

function clearFieldError() {
    const formGroup = this.closest('.form-group');
    if (formGroup) {
        formGroup.classList.remove('error');
        const errorElement = formGroup.querySelector('.error-message');
        if (errorElement) {
            errorElement.remove();
        }
    }
}

// Enhanced notification system for auth pages
function showAuthNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    // Add to page
    const authCard = document.querySelector('.auth-card');
    if (authCard) {
        authCard.insertBefore(notification, authCard.firstChild);
    }
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideInDown 0.5s ease reverse';
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Auto-focus first input
document.addEventListener('DOMContentLoaded', function() {
    const firstInput = document.querySelector('.auth-form input');
    if (firstInput) {
        setTimeout(() => firstInput.focus(), 300);
    }
});