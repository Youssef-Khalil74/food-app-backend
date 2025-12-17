/**
 * Account Page JavaScript
 */
let isEditMode = false;
let originalValues = {};

$(document).ready(function() {
    // First load account info from server, then setup navbar with correct role
    loadAccountInfo();
    
    // Form submit handler
    $('#profileForm').on('submit', saveChanges);
});

function setupNavbar(role) {
    let navHtml = '';
    
    if (role === 'truckOwner') {
        navHtml = `
            <li class="nav-item">
                <a class="nav-link" href="#" onclick="goToDashboard(); return false;">Dashboard</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="/menuItems">Menu Items</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="/truckOrders">Orders</a>
            </li>
        `;
        $('#cartNavItem').hide();
    } else if (role === 'admin') {
        navHtml = `
            <li class="nav-item">
                <a class="nav-link" href="#" onclick="goToDashboard(); return false;">Dashboard</a>
            </li>
        `;
        $('#cartNavItem').hide();
    } else {
        // Customer - show cart
        $('#cartNavItem').show();
        navHtml = `
            <li class="nav-item">
                <a class="nav-link" href="#" onclick="goToDashboard(); return false;">Dashboard</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="/trucks">Browse Trucks</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="/myOrders">My Orders</a>
            </li>
        `;
        updateCartCount();
    }
    
    $('#mainNav').html(navHtml);
}

function loadAccountInfo() {
    $.ajax({
        url: '/api/v1/account',
        method: 'GET',
        headers: getAuthHeaders(),
        success: function(data) {
            // Update sessionStorage with correct data from server
            sessionStorage.setItem('user', JSON.stringify({
                userId: data.userId,
                name: data.name,
                email: data.email,
                role: data.role
            }));
            
            // Setup navbar with the CORRECT role from server
            setupNavbar(data.role);
            
            // Update profile card
            $('#displayName').text(data.name);
            $('#displayEmail').text(data.email);
            $('#displayRole').text(formatRole(data.role));
            $('#userInitial').text(data.name.charAt(0).toUpperCase());
            
            // Update stats based on role
            if (data.role === 'admin') {
                // Hide stats for admin
                $('#statsSection').hide();
            } else if (data.stats) {
                $('#totalOrders').text(data.stats.totalOrders);
                
                if (data.stats.statsType === 'truckOwner') {
                    $('#ordersLabel').text('Orders Received');
                    $('#moneyLabel').text('Total Earned');
                    $('#totalMoney').text('EGP ' + parseFloat(data.stats.totalEarned || 0).toFixed(2));
                } else {
                    $('#ordersLabel').text('Orders Placed');
                    $('#moneyLabel').text('Total Spent');
                    $('#totalMoney').text('EGP ' + parseFloat(data.stats.totalSpent || 0).toFixed(2));
                }
            }
            
            // Update form fields
            $('#editName').val(data.name);
            $('#editEmail').val(data.email);
            if (data.birthDate) {
                $('#editBirthDate').val(data.birthDate.split('T')[0]);
            }
            if (data.createdAt) {
                const date = new Date(data.createdAt);
                $('#memberSince').text(date.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                }));
            }
            
            // Store original values
            originalValues = {
                name: data.name,
                email: data.email,
                birthDate: data.birthDate ? data.birthDate.split('T')[0] : ''
            };
        },
        error: function(xhr) {
            if (xhr.status === 401) {
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('user');
                window.location.href = '/';
            } else {
                showAlert('danger', 'Failed to load account info');
            }
        }
    });
}

function formatRole(role) {
    const roles = {
        'customer': 'Customer',
        'truckOwner': 'Truck Owner',
        'admin': 'Admin'
    };
    return roles[role] || role;
}

function toggleEditMode() {
    isEditMode = !isEditMode;
    
    if (isEditMode) {
        // Enable editing
        $('#editName, #editEmail, #editBirthDate, #editPassword').prop('disabled', false);
        $('#editBtn').html('❌ Cancel').removeClass('btn-outline-primary').addClass('btn-outline-secondary');
        $('#editActions').show();
        $('#personalInfoCard').addClass('edit-mode');
        $('#editPassword').attr('placeholder', 'Enter new password (leave blank to keep current)');
    } else {
        // Disable editing and restore original values
        cancelEdit();
    }
}

function cancelEdit() {
    isEditMode = false;
    
    // Restore original values
    $('#editName').val(originalValues.name);
    $('#editEmail').val(originalValues.email);
    $('#editBirthDate').val(originalValues.birthDate);
    $('#editPassword').val('');
    
    // Disable inputs
    $('#editName, #editEmail, #editBirthDate, #editPassword').prop('disabled', true);
    $('#editBtn').html('✏️ Edit').removeClass('btn-outline-secondary').addClass('btn-outline-primary');
    $('#editActions').hide();
    $('#personalInfoCard').removeClass('edit-mode');
    $('#editPassword').attr('placeholder', '••••••••');
}

function saveChanges(e) {
    e.preventDefault();
    
    const name = $('#editName').val().trim();
    const email = $('#editEmail').val().trim();
    const birthDate = $('#editBirthDate').val();
    const password = $('#editPassword').val();
    
    if (!name) {
        showAlert('warning', 'Name is required');
        return;
    }
    
    if (!email) {
        showAlert('warning', 'Email is required');
        return;
    }
    
    // Build update data
    const updateData = {};
    let hasChanges = false;
    
    if (name !== originalValues.name) {
        updateData.name = name;
        hasChanges = true;
    }
    
    if (email !== originalValues.email) {
        updateData.email = email;
        hasChanges = true;
    }
    
    if (birthDate !== originalValues.birthDate) {
        updateData.birthDate = birthDate;
        hasChanges = true;
    }
    
    if (password) {
        if (password.length < 6) {
            showAlert('warning', 'Password must be at least 6 characters');
            return;
        }
        updateData.password = password;
        hasChanges = true;
    }
    
    if (!hasChanges) {
        showAlert('info', 'No changes to save');
        cancelEdit();
        return;
    }
    
    // Save changes
    $.ajax({
        url: '/api/v1/account',
        method: 'PUT',
        headers: getAuthHeaders(),
        contentType: 'application/json',
        data: JSON.stringify(updateData),
        success: function(data) {
            showAlert('success', 'Profile updated successfully!');
            
            // Update original values
            if (updateData.name) {
                originalValues.name = name;
                $('#displayName').text(name);
                $('#userInitial').text(name.charAt(0).toUpperCase());
            }
            if (updateData.email) {
                originalValues.email = email;
                $('#displayEmail').text(email);
            }
            if (updateData.birthDate) {
                originalValues.birthDate = birthDate;
            }
            
            // Update sessionStorage
            const user = JSON.parse(sessionStorage.getItem('user') || '{}');
            if (updateData.name) user.name = name;
            if (updateData.email) user.email = email;
            sessionStorage.setItem('user', JSON.stringify(user));
            
            // Exit edit mode
            cancelEdit();
        },
        error: function(xhr) {
            const error = xhr.responseJSON;
            showAlert('danger', error?.message || 'Failed to update profile');
        }
    });
}

function deleteAccount() {
    const password = $('#deletePassword').val();
    const confirm = $('#deleteConfirm').val();
    
    if (!password) {
        showAlert('warning', 'Please enter your password');
        return;
    }
    
    if (confirm !== 'DELETE') {
        showAlert('warning', 'Please type DELETE to confirm');
        return;
    }
    
    $.ajax({
        url: '/api/v1/account',
        method: 'DELETE',
        headers: getAuthHeaders(),
        contentType: 'application/json',
        data: JSON.stringify({ password: password, confirmDelete: confirm }),
        success: function(data) {
            sessionStorage.clear();
            window.location.href = '/';
        },
        error: function(xhr) {
            const error = xhr.responseJSON;
            showAlert('danger', error?.message || 'Failed to delete account');
            bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
        }
    });
}

function showAlert(type, message) {
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    $('#alertContainer').html(alertHtml);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        $('.alert').alert('close');
    }, 5000);
}

function updateCartCount() {
    $.ajax({
        url: '/api/v1/cart',
        method: 'GET',
        headers: getAuthHeaders(),
        success: function(data) {
            $('#cartCount').text(data.totalItems || 0);
        }
    });
}

function getAuthHeaders() {
    const token = sessionStorage.getItem('token');
    return token ? { 'Authorization': 'Bearer ' + token } : {};
}
