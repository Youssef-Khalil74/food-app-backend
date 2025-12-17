/**
 * Login Page JavaScript
 * 🏴󠁧󠁢󠁳󠁣󠁴󠁿 Built with love by Scotland
 */

// Easter Egg #7: Secret console greeting
console.log('%c🏴󠁧󠁢󠁳󠁣󠁴󠁿 Och aye! Ye found the dev console! 🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'font-size: 20px; color: #005EB8; font-weight: bold;');
console.log('%cBuilt by Scotland • Alba gu bràth!', 'font-size: 14px; color: #800020;');
console.log('%cTry the secret endpoint: /api/v1/scotland 🥃', 'font-size: 12px; color: #666; font-style: italic;');

// Easter Egg #4: Konami-style "scotland" code - type "scotland" anywhere
let scottishCode = '';
const SECRET_WORD = 'scotland';
document.addEventListener('keydown', function(e) {
    scottishCode += e.key.toLowerCase();
    if (scottishCode.length > SECRET_WORD.length) {
        scottishCode = scottishCode.slice(-SECRET_WORD.length);
    }
    if (scottishCode === SECRET_WORD) {
        scottishCode = '';
        showScotlandEasterEgg();
    }
});

function showScotlandEasterEgg() {
    const overlay = document.createElement('div');
    overlay.id = 'scotland-easter-egg';
    overlay.innerHTML = `
        <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:linear-gradient(135deg,#005EB8 0%,#FFFFFF 50%,#005EB8 100%);display:flex;align-items:center;justify-content:center;z-index:99999;animation:fadeIn 0.5s;">
            <div style="text-align:center;background:white;padding:60px;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-width:500px;">
                <div style="font-size:5rem;margin-bottom:20px;">🏴󠁧󠁢󠁳󠁣󠁴󠁿</div>
                <h1 style="color:#005EB8;margin-bottom:10px;font-size:2.5rem;">Alba gu bràth!</h1>
                <p style="color:#333;font-size:1.2rem;margin-bottom:5px;">Scotland Forever!</p>
                <p style="color:#666;font-style:italic;margin-bottom:20px;">"Wha daur meddle wi' me?"</p>
                <p style="color:#800020;font-weight:bold;">🥃 Crafted by Scotland 🥃</p>
                <button onclick="this.parentElement.parentElement.remove()" style="margin-top:20px;padding:10px 30px;background:#005EB8;color:white;border:none;border-radius:8px;cursor:pointer;font-size:1rem;">Haste ye back!</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

// Easter Egg #5: St. Andrew's Day special (November 30)
function checkStAndrewsDay() {
    const today = new Date();
    if (today.getMonth() === 10 && today.getDate() === 30) { // November is 10 (0-indexed)
        console.log('%c🏴󠁧󠁢󠁳󠁣󠁴󠁿 Happy St. Andrew\'s Day! 🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'font-size: 16px; color: #005EB8; font-weight: bold;');
        const banner = document.createElement('div');
        banner.innerHTML = `
            <div style="background:linear-gradient(90deg,#005EB8,#003366);color:white;text-align:center;padding:10px;font-size:0.9rem;">
                🏴󠁧󠁢󠁳󠁣󠁴󠁿 Happy St. Andrew's Day! Alba gu bràth! 🏴󠁧󠁢󠁳󠁣󠁴󠁿
            </div>
        `;
        document.body.insertBefore(banner.firstChild, document.body.firstChild);
    }
}

$(document).ready(function() {
    checkStAndrewsDay();
    // Handle login form submission
    $('#loginForm').on('submit', function(e) {
        e.preventDefault();
        
        const email = $('#email').val().trim();
        const password = $('#password').val();
        
        // Validate
        if (!email) {
            showAlert('danger', 'Please enter your email address');
            return;
        }
        if (!password) {
            showAlert('danger', 'Please enter your password');
            return;
        }
        
        // Show loading state
        $('#loginBtn').prop('disabled', true).text('Logging in...');
        
        // Send login request
        $.ajax({
            url: '/api/v1/registration/login',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ email, password }),
            success: function(response) {
                showAlert('success', 'Login successful! Redirecting...');
                
                // Clear ALL old data first
                sessionStorage.clear();
                
                // Store new token and user data
                if (response.token) {
                    sessionStorage.setItem('token', response.token);
                }
                if (response.user) {
                    sessionStorage.setItem('user', JSON.stringify(response.user));
                }
                
                // Redirect based on role
                setTimeout(function() {
                    if (response.user && response.user.role === 'admin') {
                        window.location.href = '/adminDashboard';
                    } else if (response.user && response.user.role === 'truckOwner') {
                        window.location.href = '/ownerDashboard';
                    } else {
                        window.location.href = '/dashboard';
                    }
                }, 500);
            },
            error: function(xhr) {
                const error = xhr.responseJSON || {};
                showAlert('danger', error.message || 'Login failed. Please check your credentials.');
                $('#loginBtn').prop('disabled', false).text('Login');
            }
        });
    });
});

function showAlert(type, message) {
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    $('#alertContainer').html(alertHtml);
}

