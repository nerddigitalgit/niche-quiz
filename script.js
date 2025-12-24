// Quiz Navigation
let currentStep = 1;
const totalSteps = 7;

function updateProgress() {
    const progressFill = document.getElementById('progressFill');
    const currentStepText = document.getElementById('currentStep');
    const progress = (currentStep / totalSteps) * 100;
    
    progressFill.style.width = progress + '%';
    currentStepText.textContent = currentStep;
}

function showStep(step) {
    // Hide all steps
    document.querySelectorAll('.quiz-step').forEach(el => {
        el.classList.remove('active');
    });
    
    // Show current step
    const currentStepEl = document.querySelector(`.quiz-step[data-step="${step}"]`);
    if (currentStepEl) {
        currentStepEl.classList.add('active');
    }
    
    updateProgress();
}

function nextStep() {
    // Validate current step
    const currentStepEl = document.querySelector(`.quiz-step[data-step="${currentStep}"]`);
    const inputs = currentStepEl.querySelectorAll('input[required], textarea[required]');
    
    let isValid = true;
    inputs.forEach(input => {
        if (input.type === 'radio') {
            const radioGroup = currentStepEl.querySelectorAll(`input[name="${input.name}"]`);
            const isChecked = Array.from(radioGroup).some(r => r.checked);
            if (!isChecked) isValid = false;
        } else if (!input.value.trim()) {
            isValid = false;
            input.classList.add('error');
        }
    });
    
    if (!isValid) {
        alert('Please complete this step before continuing.');
        return;
    }

    // Track email capture (step 3)
    if (currentStep === 3) {
        const email = document.querySelector('input[name="email"]').value;
        if (email) {
            // GTM tracking
            if (typeof dataLayer !== 'undefined') {
                dataLayer.push({
                    'event': 'lead_captured',
                    'email': email
                });
            }
        }
    }
    
    if (currentStep < totalSteps) {
        currentStep++;
        showStep(currentStep);
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
    }
}

function scrollToQuiz() {
    document.getElementById('quiz').scrollIntoView({ behavior: 'smooth' });
    
    // Track quiz start
    if (typeof dataLayer !== 'undefined') {
        dataLayer.push({
            'event': 'quiz_started'
        });
    }
}

// Form Submission
document.getElementById('quizForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitButton = document.getElementById('submitButton');
    const loadingState = document.getElementById('loadingState');
    const quizForm = document.getElementById('quizForm');
    
    // Show loading state
    submitButton.disabled = true;
    submitButton.textContent = 'Analyzing...';
    quizForm.style.display = 'none';
    loadingState.style.display = 'block';
    
    // Collect form data
    const formData = new FormData(this);
    const data = {
        avatar: formData.get('avatar'),
        revenue: formData.get('revenue'),
        email: formData.get('email'),
        skills_developed: formData.get('skills_developed'),
        career_history: formData.get('career_history'),
        certain_outcome: formData.get('certain_outcome'),
        challenges_overcome: formData.get('challenges_overcome'),
        timestamp: new Date().toISOString(),
        source: 'niche-quiz'
    };
    
    // Get location data
    try {
        const locationResponse = await fetch('https://ipapi.co/json/');
        const locationData = await locationResponse.json();
        data.ip = locationData.ip || '';
        data.city = locationData.city || '';
        data.state = locationData.region || '';
        data.country = locationData.country_name || '';
    } catch (error) {
        console.log('Could not get location data:', error);
        data.ip = '';
        data.city = '';
        data.state = '';
        data.country = '';
    }
    
    // Track form submission
    if (typeof dataLayer !== 'undefined') {
        dataLayer.push({
            'event': 'quiz_completed',
            'avatar': data.avatar,
            'revenue': data.revenue
        });
    }
    
    // Submit to n8n webhook and WAIT for response
    try {
        const response = await fetch('https://nerddigital.app.n8n.cloud/webhook/niche-quiz', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error('Webhook response not ok');
        }
        
        // Parse the response (contains AI analysis)
        const result = await response.json();
        
        // Store the analysis in localStorage for results page
        localStorage.setItem('nicheAnalysis', JSON.stringify(result));
        
        // Also store user email for potential follow-up
        localStorage.setItem('userEmail', data.email);
        
        // Track success
        if (typeof dataLayer !== 'undefined') {
            dataLayer.push({
                'event': 'analysis_complete',
                'success': true
            });
        }
        
        // Redirect to results page
        window.location.href = 'results.html';
        
    } catch (error) {
        console.error('Error submitting quiz:', error);
        
        // Track error
        if (typeof dataLayer !== 'undefined') {
            dataLayer.push({
                'event': 'analysis_error',
                'error_message': error.message
            });
        }
        
        // Show error state
        loadingState.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <h3 style="color: #DC2626; margin-bottom: 15px;">Something went wrong</h3>
                <p style="margin-bottom: 20px;">We couldn't process your quiz. Please try again.</p>
                <button onclick="window.location.reload()" style="background: #EC4899; color: white; padding: 12px 24px; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer;">
                    Try Again
                </button>
            </div>
        `;
    }
});

// Remove error class on input
document.querySelectorAll('input, textarea').forEach(input => {
    input.addEventListener('input', function() {
        this.classList.remove('error');
    });
});

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    showStep(1);
    
    // Track page load
    if (typeof dataLayer !== 'undefined') {
        dataLayer.push({
            'event': 'page_loaded',
            'page': 'niche_quiz'
        });
    }
});
