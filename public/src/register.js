/**
 * Register Page JavaScript
 */
$(document).ready(function() {
    // Handle registration form submission
    $('#registerForm').on('submit', function(e) {
        e.preventDefault();
        
        const name = $('#name').val().trim();
        const email = $('#email').val().trim();
        const password = $('#password').val();
        const birthDate = $('#birthDate').val();
        const role = $('#role').val();
        
        // Validate
        if (!name) {
            showAlert('danger', 'Please enter your name');
            return;
        }
        if (!email) {
            showAlert('danger', 'Please enter your email address');
            return;
        }
        if (!password) {
            showAlert('danger', 'Please enter a password');
            return;
        }
        if (password.length < 6) {
            showAlert('danger', 'Password must be at least 6 characters');
            return;
        }
        
        // Show loading state
        $('#registerBtn').prop('disabled', true).text('Creating Account...');
        
        // Send registration request
        $.ajax({
            url: '/api/v1/registration',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ name, email, password, birthDate, role }),
            success: function(response) {
                showAlert('success', 'Registration successful! Redirecting to login...');
                setTimeout(function() {
                    window.location.href = '/';
                }, 1500);
            },
            error: function(xhr) {
                const error = xhr.responseJSON || {};
                showAlert('danger', error.message || 'Registration failed. Please try again.');
                $('#registerBtn').prop('disabled', false).text('Create Account');
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

