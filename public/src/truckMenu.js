/**
 * Truck Menu Page JavaScript
 */
let truckId = null;
let allMenuItems = [];
let categories = [];
let truckIsAvailable = true;

$(document).ready(function() {
    // Extract truck ID from URL
    const pathParts = window.location.pathname.split('/');
    truckId = pathParts[pathParts.length - 1];
    
    if (!truckId || isNaN(truckId)) {
        showAlert('danger', 'Invalid truck ID');
        return;
    }
    
    // Load truck info and menu
    loadTruckInfo();
    loadMenu();
    loadCartPreview();
    
    // Category filter click handler
    $(document).on('click', '.category-btn', function() {
        $('.category-btn').removeClass('active btn-primary').addClass('btn-outline-primary');
        $(this).removeClass('btn-outline-primary').addClass('active btn-primary');
        filterByCategory($(this).data('category'));
    });
});

function loadTruckInfo() {
    $.ajax({
        url: '/api/v1/trucks/' + truckId,
        method: 'GET',
        success: function(truck) {
            $('#truckName').text(truck.truckName);
            if (truck.truckLogo) {
                $('#truckLogo').html(`<img src="${truck.truckLogo}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;">`);
            }
            
            truckIsAvailable = truck.orderStatus === 'available';
            const statusClass = truckIsAvailable ? 'available' : 'unavailable';
            const statusText = truckIsAvailable ? 'Open for Orders' : 'Not Accepting Orders';
            $('#truckStatus').removeClass('available unavailable').addClass(statusClass).html(`<span>●</span> ${statusText}`);
            
            // Show warning if truck is not accepting orders
            if (!truckIsAvailable) {
                showAlert('warning', '⚠️ This truck is not currently accepting orders. You can browse the menu but cannot place orders.');
                // Re-render menu to disable add to cart buttons
                if (allMenuItems.length > 0) {
                    renderMenu(allMenuItems);
                }
            }
        },
        error: function() {
            showAlert('danger', 'Failed to load truck information');
        }
    });
}

function loadMenu() {
    $.ajax({
        url: '/api/v1/trucks/' + truckId + '/menu',
        method: 'GET',
        success: function(items) {
            $('#menuLoading').hide();
            allMenuItems = items || [];
            
            if (allMenuItems.length > 0) {
                // Extract unique categories
                categories = [...new Set(allMenuItems.map(item => item.category))];
                renderCategoryFilters();
                renderMenu(allMenuItems);
            } else {
                $('#menuContainer').hide();
                $('#noMenu').show();
            }
        },
        error: function() {
            $('#menuLoading').hide();
            showAlert('danger', 'Failed to load menu');
        }
    });
}

function renderCategoryFilters() {
    let html = '<button class="btn btn-primary btn-sm category-btn active" data-category="">All</button>';
    categories.forEach(function(category) {
        html += `<button class="btn btn-outline-primary btn-sm category-btn" data-category="${category}">${category}</button>`;
    });
    $('#categoryFilters').html(html);
}

function filterByCategory(category) {
    if (!category) {
        renderMenu(allMenuItems);
    } else {
        const filtered = allMenuItems.filter(item => item.category === category);
        renderMenu(filtered);
    }
}

function renderMenu(items) {
    let html = '';
    items.forEach(function(item) {
        const disabledClass = truckIsAvailable ? '' : 'disabled';
        const disabledAttr = truckIsAvailable ? '' : 'disabled';
        const buttonText = truckIsAvailable ? 'Add to Cart' : 'Unavailable';
        
        html += `
            <div class="menu-item-card">
                <div class="menu-item-content">
                    <div class="menu-item-info">
                        <h4>${item.name}</h4>
                        <span class="category">${item.category}</span>
                        <p class="description">${item.description || 'No description'}</p>
                        <div class="price">EGP ${parseFloat(item.price).toFixed(2)}</div>
                    </div>
                    <div class="menu-item-actions">
                        <div class="quantity-control">
                            <button onclick="decrementQty(${item.itemId})" ${disabledAttr}>−</button>
                            <input type="number" id="qty-${item.itemId}" value="1" min="1" readonly ${disabledAttr}>
                            <button onclick="incrementQty(${item.itemId})" ${disabledAttr}>+</button>
                        </div>
                        <button class="btn btn-primary btn-sm ${disabledClass}" onclick="addToCart(${item.itemId})" ${disabledAttr}>
                            ${buttonText}
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    $('#menuContainer').html(html);
}

function incrementQty(itemId) {
    const input = $(`#qty-${itemId}`);
    input.val(parseInt(input.val()) + 1);
}

function decrementQty(itemId) {
    const input = $(`#qty-${itemId}`);
    if (parseInt(input.val()) > 1) {
        input.val(parseInt(input.val()) - 1);
    }
}

function addToCart(itemId) {
    const quantity = parseInt($(`#qty-${itemId}`).val()) || 1;
    
    $.ajax({
        url: '/api/v1/cart',
        method: 'POST',
        contentType: 'application/json',
        headers: getAuthHeaders(),
        data: JSON.stringify({ itemId, quantity }),
        success: function(response) {
            showAlert('success', 'Item added to cart!');
            loadCartPreview();
            updateCartCount();
            $(`#qty-${itemId}`).val(1);
        },
        error: function(xhr) {
            const error = xhr.responseJSON || {};
            showAlert('danger', error.message || 'Failed to add item to cart');
        }
    });
}

function loadCartPreview() {
    $.ajax({
        url: '/api/v1/cart',
        method: 'GET',
        headers: getAuthHeaders(),
        success: function(data) {
            if (data.items && data.items.length > 0) {
                let html = '';
                data.items.slice(0, 3).forEach(function(item) {
                    html += `
                        <div class="d-flex justify-content-between mb-2">
                            <span>${item.name} x${item.quantity}</span>
                            <span>EGP ${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                    `;
                });
                if (data.items.length > 3) {
                    html += `<p class="text-muted small">+${data.items.length - 3} more items</p>`;
                }
                $('#cartPreview').html(html);
                $('#cartTotal').show();
                $('#totalAmount').text(data.totalPrice.toFixed(2));
                $('#viewCartBtn').show();
            } else {
                $('#cartPreview').html('<p class="text-muted text-center">Your cart is empty</p>');
                $('#cartTotal').hide();
                $('#viewCartBtn').hide();
            }
        }
    });
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

