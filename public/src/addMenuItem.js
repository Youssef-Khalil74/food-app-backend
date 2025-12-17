/**
 * Add Menu Item Page JavaScript
 */
$(document).ready(function() {
    $('#addMenuItemForm').on('submit', function(e) {
        e.preventDefault();
        addMenuItem();
    });
});

function addMenuItem() {
    const name = $('#name').val().trim();
    const category = $('#category').val().trim();
    const description = $('#description').val().trim();
    const price = parseFloat($('#price').val());
    
    // Validation
    if (!name) {
        showAlert('danger', 'Please enter item name');
        return;
    }
    if (!category) {
        showAlert('danger', 'Please enter category');
        return;
    }
    if (isNaN(price) || price < 0) {
        showAlert('danger', 'Please enter a valid price');
        return;
    }
    
    const data = { name, category, description, price };
    
    $('button[type="submit"]').prop('disabled', true).text('Adding...');
    
    $.ajax({
        url: '/api/v1/food',
        method: 'POST',
        contentType: 'application/json',
        headers: getAuthHeaders(),
        data: JSON.stringify(data),
        success: function(response) {
            showAlert('success', 'Menu item added successfully!');
            setTimeout(function() {
                window.location.href = '/menuItems';
            }, 1500);
        },
        error: function(xhr) {
            const error = xhr.responseJSON || {};
            showAlert('danger', error.message || 'Failed to add menu item');
            $('button[type="submit"]').prop('disabled', false).text('Add Menu Item');
        }
    });
}

function getAuthHeaders() {
    const token = sessionStorage.getItem('token');
    return token ? { 'Authorization': 'Bearer ' + token } : {};
}

function showAlert(type, message) {
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    $('#alertContainer').html(alertHtml);
}

