/**
 * Admin Dashboard JavaScript
 */
let allUsers = [];

$(document).ready(function() {
    // Check if user is admin
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    if (user.role !== 'admin') {
        window.location.href = '/';
        return;
    }
    
    loadStats();
    loadUsers();
    loadTrucks();
    
    // Form handlers
    $('#addTruckForm').on('submit', handleAddTruck);
    $('#addMenuItemForm').on('submit', handleAddMenuItem);
    
    // User filter handlers
    $(document).on('click', '.user-filter', function() {
        $('.user-filter').removeClass('active btn-primary').addClass('btn-outline-primary');
        $(this).removeClass('btn-outline-primary').addClass('active btn-primary');
        filterUsers($(this).data('role'));
    });
});

function getAuthHeaders() {
    const token = sessionStorage.getItem('token');
    return token ? { 'Authorization': 'Bearer ' + token } : {};
}

function loadStats() {
    // Load users and trucks count
    $.ajax({
        url: '/api/v1/admin/stats',
        method: 'GET',
        headers: getAuthHeaders(),
        success: function(stats) {
            $('#totalUsers').text(stats.totalUsers || 0);
            $('#totalTrucks').text(stats.totalTrucks || 0);
        },
        error: function() {
            console.log('Could not load stats');
        }
    });
}

function loadUsers() {
    $.ajax({
        url: '/api/v1/admin/users',
        method: 'GET',
        headers: getAuthHeaders(),
        success: function(users) {
            allUsers = users || [];
            renderUsers(allUsers);
            populateTruckOwnerDropdown(allUsers);
        },
        error: function(xhr) {
            $('#usersList').html('<div class="text-center py-4 text-muted">Failed to load users</div>');
        }
    });
}

function filterUsers(role) {
    if (!role) {
        renderUsers(allUsers);
    } else {
        const filtered = allUsers.filter(user => user.role === role);
        renderUsers(filtered);
    }
}

function renderUsers(users) {
    if (!users || users.length === 0) {
        $('#usersList').html('<div class="text-center py-4 text-muted">No users found</div>');
        return;
    }
    
    let html = '';
    users.forEach(function(user) {
        const roleClass = 'role-' + user.role;
        const roleLabel = user.role === 'truckOwner' ? 'Truck Owner' : 
                         user.role === 'admin' ? 'Admin' : 'Customer';
        
        html += `
            <div class="user-list-item">
                <div>
                    <strong>${user.name}</strong>
                    <br><small class="text-muted">${user.email}</small>
                </div>
                <span class="role-badge ${roleClass}">${roleLabel}</span>
            </div>
        `;
    });
    
    $('#usersList').html(html);
}

function populateTruckOwnerDropdown(users) {
    const truckOwners = users.filter(u => u.role === 'truckOwner');
    
    let options = '<option value="">Select a truck owner...</option>';
    truckOwners.forEach(function(owner) {
        options += `<option value="${owner.userId}">${owner.name} (${owner.email})</option>`;
    });
    
    $('#truckOwner').html(options);
}

function loadTrucks() {
    $.ajax({
        url: '/api/v1/admin/trucks',
        method: 'GET',
        headers: getAuthHeaders(),
        success: function(trucks) {
            renderTrucks(trucks);
            populateTruckDropdown(trucks);
        },
        error: function() {
            $('#trucksList').html('<div class="text-center py-4 text-muted">Failed to load trucks</div>');
        }
    });
}

function renderTrucks(trucks) {
    if (!trucks || trucks.length === 0) {
        $('#trucksList').html('<div class="text-center py-4 text-muted">No trucks yet. Create one above!</div>');
        return;
    }
    
    let html = '';
    trucks.forEach(function(truck) {
        const statusBadge = truck.truckStatus === 'available' 
            ? '<span class="badge bg-success">Available</span>'
            : '<span class="badge bg-secondary">Unavailable</span>';
        
        html += `
            <div class="truck-list-item">
                <div>
                    <strong>🚚 ${truck.truckName}</strong>
                    <br><small class="text-muted">Owner: ${truck.ownerName || 'Unknown'}</small>
                </div>
                <div>
                    ${statusBadge}
                    <button class="btn btn-sm btn-outline-danger ms-2" onclick="deleteTruck(${truck.truckId}, '${truck.truckName}')">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    });
    
    $('#trucksList').html(html);
}

function populateTruckDropdown(trucks) {
    let options = '<option value="">Select a truck...</option>';
    trucks.forEach(function(truck) {
        options += `<option value="${truck.truckId}">${truck.truckName}</option>`;
    });
    
    $('#menuTruckSelect').html(options);
}

function handleAddTruck(e) {
    e.preventDefault();
    
    const truckName = $('#truckName').val().trim();
    const ownerId = $('#truckOwner').val();
    
    if (!truckName || !ownerId) {
        showAlert('danger', 'Please fill in all fields');
        return;
    }
    
    $.ajax({
        url: '/api/v1/admin/trucks',
        method: 'POST',
        contentType: 'application/json',
        headers: getAuthHeaders(),
        data: JSON.stringify({ truckName, ownerId }),
        success: function(response) {
            showAlert('success', 'Food truck created successfully!');
            $('#addTruckForm')[0].reset();
            loadTrucks();
            loadStats();
        },
        error: function(xhr) {
            const error = xhr.responseJSON || {};
            showAlert('danger', error.message || 'Failed to create truck');
        }
    });
}

function handleAddMenuItem(e) {
    e.preventDefault();
    
    const truckId = $('#menuTruckSelect').val();
    const name = $('#itemName').val().trim();
    const description = $('#itemDescription').val().trim();
    const price = parseFloat($('#itemPrice').val());
    const category = $('#itemCategory').val();
    
    if (!truckId || !name || !price || !category) {
        showAlert('danger', 'Please fill in all required fields');
        return;
    }
    
    $.ajax({
        url: '/api/v1/admin/menu-items',
        method: 'POST',
        contentType: 'application/json',
        headers: getAuthHeaders(),
        data: JSON.stringify({ truckId, name, description, price, category }),
        success: function(response) {
            showAlert('success', 'Menu item added successfully!');
            $('#addMenuItemForm')[0].reset();
        },
        error: function(xhr) {
            const error = xhr.responseJSON || {};
            showAlert('danger', error.message || 'Failed to add menu item');
        }
    });
}

let truckToDelete = null;

function deleteTruck(truckId, truckName) {
    truckToDelete = truckId;
    $('#deleteTruckName').text(truckName);
    new bootstrap.Modal(document.getElementById('deleteTruckModal')).show();
}

$('#confirmDeleteTruck').on('click', function() {
    if (!truckToDelete) return;
    
    $.ajax({
        url: '/api/v1/admin/trucks/' + truckToDelete,
        method: 'DELETE',
        headers: getAuthHeaders(),
        success: function() {
            bootstrap.Modal.getInstance(document.getElementById('deleteTruckModal')).hide();
            showAlert('success', 'Truck deleted successfully');
            loadTrucks();
            loadStats();
            truckToDelete = null;
        },
        error: function(xhr) {
            const error = xhr.responseJSON || {};
            showAlert('danger', error.message || 'Failed to delete truck');
        }
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
    
    if (type === 'success') {
        setTimeout(() => $('.alert').fadeOut(), 3000);
    }
}




