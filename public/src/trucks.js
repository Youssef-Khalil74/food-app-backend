/**
 * Browse Trucks Page JavaScript
 */
let allTrucks = [];

$(document).ready(function() {
    // Load trucks
    loadTrucks();
    
    // Search functionality
    $('#searchInput').on('keyup', filterTrucks);
    $('#statusFilter').on('change', filterTrucks);
});

function loadTrucks() {
    $.ajax({
        url: '/api/v1/trucks',
        method: 'GET',
        success: function(trucks) {
            $('#trucksLoading').hide();
            allTrucks = trucks || [];
            
            if (allTrucks.length > 0) {
                renderTrucks(allTrucks);
            } else {
                $('#noTrucks').show();
            }
        },
        error: function() {
            $('#trucksLoading').hide();
            showAlert('danger', 'Failed to load trucks. Please try again.');
        }
    });
}

function filterTrucks() {
    const searchTerm = $('#searchInput').val().toLowerCase();
    const statusFilter = $('#statusFilter').val();
    
    let filtered = allTrucks;
    
    // Filter by search term
    if (searchTerm) {
        filtered = filtered.filter(truck => 
            truck.truckName.toLowerCase().includes(searchTerm)
        );
    }
    
    // Filter by status
    if (statusFilter) {
        filtered = filtered.filter(truck => 
            truck.orderStatus === statusFilter || truck.truckStatus === statusFilter
        );
    }
    
    if (filtered.length > 0) {
        renderTrucks(filtered);
        $('#noTrucks').hide();
    } else {
        $('#trucksContainer').html('');
        $('#noTrucks').show();
    }
}

function renderTrucks(trucks) {
    let html = '';
    trucks.forEach(function(truck) {
        const statusClass = truck.orderStatus === 'available' ? 'available' : 'unavailable';
        const statusText = truck.orderStatus === 'available' ? 'Open for Orders' : 'Not Accepting Orders';
        
        html += `
            <div class="col-md-4 col-lg-3 mb-4">
                <div class="card h-100" style="cursor: pointer;" onclick="viewTruck(${truck.truckId})">
                    <div class="truck-card-image" style="height: 160px; background: linear-gradient(135deg, var(--primary-maroon-light), var(--primary-maroon)); display: flex; align-items: center; justify-content: center; color: white; font-size: 3.5rem;">
                        ${truck.truckLogo ? `<img src="${truck.truckLogo}" alt="${truck.truckName}" style="width: 100%; height: 100%; object-fit: cover;">` : '🚚'}
                    </div>
                    <div class="card-body">
                        <h5 class="card-title">${truck.truckName}</h5>
                        <span class="truck-status ${statusClass}">
                            <span>●</span> ${statusText}
                        </span>
                    </div>
                    <div class="card-footer bg-white border-0">
                        <button class="btn btn-primary w-100">View Menu</button>
                    </div>
                </div>
            </div>
        `;
    });
    $('#trucksContainer').html(html);
}

function viewTruck(truckId) {
    window.location.href = '/truckMenu/' + truckId;
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

