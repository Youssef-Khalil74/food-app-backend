/**
 * Customer Dashboard JavaScript
 */
$(document).ready(function() {
    // Load user info
    loadUserInfo();
    
    // Load habits (frequent orders)
    loadHabits();
    
    // Load available trucks
    loadTrucks();
    
    // Load specials/announcements
    loadSpecials();
    
    // Update cart count
    updateCartCount();
});

function loadUserInfo() {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    if (user.name) {
        $('#userName').text(user.name);
    }
}

function loadHabits() {
    $.ajax({
        url: '/api/v1/habits',
        method: 'GET',
        headers: getAuthHeaders(),
        success: function(data) {
            $('#habitsLoading').hide();
            
            if (data.yourFavorites && data.yourFavorites.length > 0) {
                renderHabits(data.yourFavorites);
            } else {
                $('#habitsContainer').hide();
                $('#noHabits').show();
            }
        },
        error: function() {
            $('#habitsLoading').hide();
            $('#habitsContainer').hide();
            $('#noHabits').show();
        }
    });
}

function renderHabits(favorites) {
    let html = '';
    // Limit to 4 items for compact view
    const displayItems = favorites.slice(0, 4);
    displayItems.forEach(function(item) {
        html += `
            <div class="habit-item habit-item-compact" onclick="window.location.href='/truckMenu/${item.truckId}'">
                <div class="habit-icon">🍽️</div>
                <div class="habit-info">
                    <h5>${item.name}</h5>
                    <p>${item.truckName}</p>
                    <div class="price">EGP ${parseFloat(item.price).toFixed(2)}</div>
                </div>
            </div>
        `;
    });
    $('#habitsContainer').html(html);
}

function loadTrucks() {
    $.ajax({
        url: '/api/v1/trucks',
        method: 'GET',
        success: function(trucks) {
            $('#trucksLoading').hide();
            
            if (trucks && trucks.length > 0) {
                renderTrucks(trucks);
            } else {
                $('#trucksContainer').hide();
                $('#noTrucks').show();
            }
        },
        error: function() {
            $('#trucksLoading').hide();
            $('#trucksContainer').html('<p class="text-muted">Failed to load trucks</p>');
        }
    });
}

function renderTrucks(trucks) {
    let html = '';
    trucks.forEach(function(truck) {
        const statusClass = truck.orderStatus === 'available' ? 'available' : 'unavailable';
        const statusText = truck.orderStatus === 'available' ? 'Available' : 'Unavailable';
        
        // Use truck image if available, otherwise show gradient with icon
        const imageContent = truck.truckLogo 
            ? `<img src="${truck.truckLogo}" alt="${truck.truckName}">`
            : `<div class="truck-placeholder">🚚</div>`;
        
        html += `
            <div class="truck-card" onclick="window.location.href='/truckMenu/${truck.truckId}'">
                <div class="truck-card-image">
                    ${imageContent}
                </div>
                <div class="truck-card-body">
                    <h4>${truck.truckName}</h4>
                    <span class="truck-status ${statusClass}">
                        <span>●</span> ${statusText}
                    </span>
                </div>
            </div>
        `;
    });
    $('#trucksContainer').html(html);
}

function loadSpecials() {
    $.ajax({
        url: '/api/v1/specials',
        method: 'GET',
        success: function(specials) {
            $('#specialsLoading').hide();
            
            if (specials && specials.length > 0) {
                renderSpecials(specials);
            } else {
                $('#specialsContainer').hide();
                $('#noSpecials').show();
            }
        },
        error: function() {
            $('#specialsLoading').hide();
            $('#specialsContainer').hide();
            $('#noSpecials').show();
        }
    });
}

function renderSpecials(specials) {
    let html = '';
    specials.forEach(function(special) {
        const imageContent = special.image 
            ? `<img src="${special.image}" alt="${special.title}">`
            : `<div class="special-placeholder">${special.icon || '🔥'}</div>`;
        
        html += `
            <div class="special-card" onclick="${special.truckId ? `window.location.href='/truckMenu/${special.truckId}'` : ''}">
                <div class="special-image">
                    ${imageContent}
                </div>
                <div class="special-content">
                    <span class="special-badge">${special.type || 'Special'}</span>
                    <h4>${special.title}</h4>
                    <p>${special.description}</p>
                    <div class="special-footer">
                        <span class="truck-name">${special.truckName || ''}</span>
                        ${special.validUntil ? `<span class="valid-until">Until ${special.validUntil}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    $('#specialsContainer').html(html);
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
