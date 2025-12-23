/**
 * Menu Items Management Page JavaScript
 */
let allMenuItems = [];

$(document).ready(function() {
    loadMenuItems();
    
    // Save edit button
    $('#saveEditBtn').on('click', saveEdit);
});

function loadMenuItems() {
    $.ajax({
        url: '/api/v1/food',
        method: 'GET',
        headers: getAuthHeaders(),
        success: function(items) {
            $('#menuLoading').hide();
            allMenuItems = items || [];
            
            if (allMenuItems.length > 0) {
                renderMenuItems(allMenuItems);
            } else {
                $('#menuItemsBody').closest('.card').hide();
                $('#noItems').show();
            }
        },
        error: function() {
            $('#menuLoading').hide();
            showAlert('danger', 'Failed to load menu items');
        }
    });
}

function renderMenuItems(items) {
    let html = '';
    items.forEach(function(item) {
        const isAvailable = item.status === 'available';
        const statusClass = isAvailable ? 'text-success' : 'text-danger';
        const statusText = isAvailable ? 'Available' : 'Sold Out';
        const toggleBtnClass = isAvailable ? 'btn-success' : 'btn-outline-secondary';
        const toggleIcon = isAvailable ? '✓' : '✗';
        const toggleTitle = isAvailable ? 'Mark as Sold Out' : 'Mark as Available';
        const rowClass = isAvailable ? '' : 'table-secondary';
        
        html += `
            <tr class="${rowClass}">
                <td>${item.name}</td>
                <td><span class="category">${item.category}</span></td>
                <td>${item.description ? item.description.substring(0, 50) + '...' : '-'}</td>
                <td>EGP ${parseFloat(item.price).toFixed(2)}</td>
                <td>
                    <button class="btn ${toggleBtnClass} btn-sm availability-toggle" 
                            onclick="toggleAvailability(${item.itemId})" 
                            title="${toggleTitle}"
                            data-item-id="${item.itemId}">
                        ${toggleIcon} ${statusText}
                    </button>
                </td>
                <td>
                    <button class="btn btn-outline-primary btn-sm me-1" onclick="viewItem(${item.itemId})" title="View">
                        👁️
                    </button>
                    <button class="btn btn-outline-primary btn-sm me-1" onclick="editItem(${item.itemId})" title="Edit">
                        ✏️
                    </button>
                    <button class="btn btn-outline-danger btn-sm" onclick="deleteItem(${item.itemId})" title="Delete">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    });
    $('#menuItemsBody').html(html);
}

function viewItem(itemId) {
    const item = allMenuItems.find(i => i.itemId === itemId);
    if (!item) return;
    
    const html = `
        <p><strong>Name:</strong> ${item.name}</p>
        <p><strong>Category:</strong> ${item.category}</p>
        <p><strong>Description:</strong> ${item.description || 'No description'}</p>
        <p><strong>Price:</strong> EGP ${parseFloat(item.price).toFixed(2)}</p>
        <p><strong>Status:</strong> ${item.status || 'available'}</p>
    `;
    
    $('#viewContent').html(html);
    new bootstrap.Modal(document.getElementById('viewModal')).show();
}

function editItem(itemId) {
    const item = allMenuItems.find(i => i.itemId === itemId);
    if (!item) return;
    
    $('#editItemId').val(item.itemId);
    $('#editName').val(item.name);
    $('#editCategory').val(item.category);
    $('#editDescription').val(item.description || '');
    $('#editPrice').val(item.price);
    $('#editStatus').val(item.status || 'available');
    
    new bootstrap.Modal(document.getElementById('editModal')).show();
}

function saveEdit() {
    const itemId = $('#editItemId').val();
    const data = {
        name: $('#editName').val(),
        category: $('#editCategory').val(),
        description: $('#editDescription').val(),
        price: parseFloat($('#editPrice').val()),
        status: $('#editStatus').val()
    };
    
    $('#saveEditBtn').prop('disabled', true).text('Saving...');
    
    $.ajax({
        url: '/api/v1/food/' + itemId,
        method: 'PUT',
        contentType: 'application/json',
        headers: getAuthHeaders(),
        data: JSON.stringify(data),
        success: function() {
            bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
            showAlert('success', 'Menu item updated successfully');
            loadMenuItems();
            $('#saveEditBtn').prop('disabled', false).text('Save Changes');
        },
        error: function(xhr) {
            const error = xhr.responseJSON || {};
            showAlert('danger', error.message || 'Failed to update menu item');
            $('#saveEditBtn').prop('disabled', false).text('Save Changes');
        }
    });
}

function deleteItem(itemId) {
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    
    $.ajax({
        url: '/api/v1/food/' + itemId,
        method: 'DELETE',
        headers: getAuthHeaders(),
        success: function() {
            showAlert('success', 'Menu item deleted successfully');
            loadMenuItems();
        },
        error: function(xhr) {
            const error = xhr.responseJSON || {};
            showAlert('danger', error.message || 'Failed to delete menu item');
        }
    });
}

function getAuthHeaders() {
    const token = sessionStorage.getItem('token');
    return token ? { 'Authorization': 'Bearer ' + token } : {};
}

function toggleAvailability(itemId) {
    const btn = $(`.availability-toggle[data-item-id="${itemId}"]`);
    btn.prop('disabled', true);
    
    $.ajax({
        url: '/api/v1/food/' + itemId + '/toggle-availability',
        method: 'PATCH',
        headers: getAuthHeaders(),
        success: function(response) {
            // Update local data
            const item = allMenuItems.find(i => i.itemId === itemId);
            if (item) {
                item.status = response.status;
            }
            
            // Re-render to update UI
            renderMenuItems(allMenuItems);
            
            const statusText = response.status === 'available' ? 'available' : 'sold out';
            showAlert('success', `Item marked as ${statusText}`);
        },
        error: function(xhr) {
            const error = xhr.responseJSON || {};
            showAlert('danger', error.message || 'Failed to update availability');
            btn.prop('disabled', false);
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
    
    // Auto dismiss success alerts
    if (type === 'success') {
        setTimeout(function() {
            $('.alert').fadeOut();
        }, 2000);
    }
}

