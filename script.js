// ============================================
// CONFIGURATION - CHANGE THESE VALUES
// ============================================

// Replace with your n8n webhook URL after you create it
const N8N_WEBHOOK_URL = 'https://YOUR-N8N-INSTANCE.app.n8n.cloud/webhook/niche-quiz';

// Replace with your GTM container ID
const GTM_ID = 'GTM-XXXXXXX';

// ============================================
// QUIZ NAVIGATION
// ============================================

let currentStep = 1;
const totalSteps = 7;

function scrollToQuiz() {
    document.getElementById('quiz').scrollIntoView({ 
        behavior: 'smooth',
        block: 'center'
    });
    trackEvent('quiz_started');
}

function updateProgress() {
    const progressFill = document.getElementById('progressFill');
    const currentStepText = document.getElementById('currentStep');
    
    const percentage = (currentStep / totalSteps) * 100;
    progressFill.style.width = percentage + '%';
    currentStepText.textContent = currentStep;
}

function nextStep() {
    const currentStepElement = document.querySelector(`.quiz-step[data-step="${currentStep}"]`);
    
    // Validate current step
    const inputs = currentStepElement.querySelectorAll('input[required], textarea[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (input.type === 'radio') {
            const radioGroup = currentStepElement.querySelectorAll(`input[name="${input.name}"]`);
            const isChecked = Array.from(radioGroup).some(radio => radio.checked);
            if (!isChecked) {
                isValid = false;
            }
        } else {
            if (!input.value.trim()) {
                isValid = false;
                input.focus();
            }
        }
    });
    
    if (!isValid) {
        alert('Please answer this question before continuing.');
        return;
    }
    
    // Track email capture at step 3
    if (currentStep === 3) {
        const email = document.querySelector('input[name="email"]').value;
        trackEvent('lead_captured', { user_email: email });
    }
    
    // Move to next step
    if (currentStep < totalSteps) {
        currentStepElement.classList.remove('active');
        currentStep++;
        document.querySelector(`.quiz-step[data-step="${currentStep}"]`).classList.add('active');
        updateProgress();
        
        // Scroll to top of quiz container
        document.getElementById('quiz').scrollIntoView({ 
            behavior: 'smooth',
            block: 'center'
        });
    }
}

function prevStep() {
    if (currentStep > 1) {
        document.querySelector(`.quiz-step[data-step="${currentStep}"]`).classList.remove('active');
        currentStep--;
        document.querySelector(`.quiz-step[data-step="${currentStep}"]`).classList.add('active');
        updateProgress();
        
        // Scroll to top of quiz container
        document.getElementById('quiz').scrollIntoView({ 
            behavior: 'smooth',
            block: 'center'
        });
    }
}

// ============================================
// LOCATION DATA COLLECTION
// ============================================

async function getUserLocation() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        return {
            ip: data.ip || 'unknown',
            city: data.city || 'unknown',
            state: data.region || 'unknown',
            country: data.country_name || 'unknown'
        };
    } catch (error) {
        console.error('Error getting location:', error);
        return {
            ip: 'unknown',
            city: 'unknown',
            state: 'unknown',
            country: 'unknown'
        };
    }
}

// ============================================
// FORM SUBMISSION
// ============================================

document.getElementById('quizForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Show loading state
    document.querySelector('.quiz-container').style.display = 'none';
    document.getElementById('loadingState').style.display = 'block';
    
    trackEvent('quiz_completed');
    
    // Get form data
    const formData = new FormData(e.target);
    const data = {};
    formData.forEach((value, key) => {
        data[key] = value;
    });
    
    // Get location data
    const location = await getUserLocation();
    
    // Prepare payload
    const payload = {
        ...data,
        ...location,
        timestamp: new Date().toISOString(),
        source: 'niche-quiz'
    };
    
    console.log('Submitting data:', payload);
    
    // Send to n8n webhook
    try {
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            // Success - redirect to thank you page
            window.location.href = 'thank-you.html';
        } else {
            throw new Error('Submission failed');
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        alert('Something went wrong. Please try again or email us at support@trustfunnels.com');
        
        // Show form again
        document.getElementById('loadingState').style.display = 'none';
        document.querySelector('.quiz-container').style.display = 'block';
    }
});

// ============================================
// GOOGLE TAG MANAGER TRACKING
// ============================================

function trackEvent(eventName, eventData = {}) {
    if (typeof window.dataLayer !== 'undefined') {
        window.dataLayer.push({
            'event': eventName,
            ...eventData
        });
        console.log('Tracked event:', eventName, eventData);
    } else {
        console.warn('GTM dataLayer not found. Event not tracked:', eventName);
    }
}

// Track page load
document.addEventListener('DOMContentLoaded', function() {
    trackEvent('page_loaded');
});

// ============================================
// HELPER FUNCTIONS
// ============================================

// Prevent form submission on Enter key (except in textareas)
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (currentStep < totalSteps) {
            nextStep();
        }
    }
});

// Initialize progress bar
updateProgress();
