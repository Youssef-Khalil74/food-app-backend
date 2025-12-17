/**
 * Shopping Cart Page JavaScript
 */
let cartItems = [];

$(document).ready(function() {
    loadCart();
    
    // Set minimum pickup time (20 minutes from now)
    const now = new Date();
    now.setMinutes(now.getMinutes() + 20);
    $('#pickupTime').attr('min', now.toISOString().slice(0, 16));
    $('#pickupTime').val(now.toISOString().slice(0, 16));
    
    // Place order click handler
    $('#placeOrderBtn').on('click', placeOrder);
});

function loadCart() {
    $.ajax({
        url: '/api/v1/cart',
        method: 'GET',
        headers: getAuthHeaders(),
        success: function(data) {
            $('#cartLoading').hide();
            cartItems = data.items || [];
            
            if (cartItems.length > 0) {
                renderCart(data);
                $('#orderSummary').show();
            } else {
                $('#cartContainer').hide();
                $('#emptyCart').show();
            }
        },
        error: function() {
            $('#cartLoading').hide();
            showAlert('danger', 'Failed to load cart');
        }
    });
}

function renderCart(data) {
    // Group items by truck
    if (data.groupedByTruck && data.groupedByTruck.length > 0) {
        let html = '';
        data.groupedByTruck.forEach(function(group) {
            html += `
                <div class="card mb-4">
                    <div class="card-header">
                        <h5 class="mb-0">🚚 ${group.truckName}</h5>
                    </div>
                    <div class="card-body">
            `;
            
            group.items.forEach(function(item) {
                html += `
                    <div class="cart-item">
                        <div class="cart-item-info">
                            <h5>${item.name}</h5>
                            <p class="truck-name mb-0">${item.category}</p>
                        </div>
                        <div class="quantity-control">
                            <button onclick="updateQuantity(${item.cartId}, ${item.quantity - 1})">−</button>
                            <input type="number" value="${item.quantity}" readonly>
                            <button onclick="updateQuantity(${item.cartId}, ${item.quantity + 1})">+</button>
                        </div>
                        <div class="cart-item-price">
                            EGP ${(item.price * item.quantity).toFixed(2)}
                        </div>
                        <button class="btn btn-outline-danger btn-sm" onclick="removeItem(${item.cartId})">
                            🗑️
                        </button>
                    </div>
                `;
            });
            
            html += `
                        <div class="text-end mt-3">
                            <strong>Subtotal: EGP ${group.subtotal.toFixed(2)}</strong>
                        </div>
                    </div>
                </div>
            `;
        });
        $('#cartContainer').html(html);
    }
    
    // Update summary
    renderSummary(data);
}

function renderSummary(data) {
    let summaryHtml = '';
    if (data.groupedByTruck) {
        data.groupedByTruck.forEach(function(group) {
            summaryHtml += `
                <div class="d-flex justify-content-between mb-2">
                    <span>${group.truckName}</span>
                    <span>EGP ${group.subtotal.toFixed(2)}</span>
                </div>
            `;
        });
    }
    $('#summaryItems').html(summaryHtml);
    $('#subtotal').text('EGP ' + data.totalPrice.toFixed(2));
    $('#totalAmount').text(data.totalPrice.toFixed(2));
}

function updateQuantity(cartId, newQuantity) {
    if (newQuantity < 1) {
        removeItem(cartId);
        return;
    }
    
    $.ajax({
        url: '/api/v1/cart/' + cartId,
        method: 'PUT',
        contentType: 'application/json',
        headers: getAuthHeaders(),
        data: JSON.stringify({ quantity: newQuantity }),
        success: function() {
            loadCart();
            updateCartCount();
        },
        error: function(xhr) {
            const error = xhr.responseJSON || {};
            showAlert('danger', error.message || 'Failed to update quantity');
        }
    });
}

function removeItem(cartId) {
    if (!confirm('Remove this item from cart?')) return;
    
    $.ajax({
        url: '/api/v1/cart/' + cartId,
        method: 'DELETE',
        headers: getAuthHeaders(),
        success: function() {
            loadCart();
            updateCartCount();
            showAlert('success', 'Item removed from cart');
        },
        error: function() {
            showAlert('danger', 'Failed to remove item');
        }
    });
}

function placeOrder() {
    if (cartItems.length === 0) {
        showAlert('warning', 'Your cart is empty');
        return;
    }
    
    const scheduledPickupTime = $('#pickupTime').val();
    
    // Get unique truck IDs from cart
    const truckIds = [...new Set(cartItems.map(item => item.truckId))];
    
    if (truckIds.length > 1) {
        showAlert('warning', 'You have items from multiple trucks. Please place separate orders for each truck.');
        return;
    }
    
    const truckId = truckIds[0];
    
    $('#placeOrderBtn').prop('disabled', true).text('Placing Order...');
    
    $.ajax({
        url: '/api/v1/order',
        method: 'POST',
        contentType: 'application/json',
        headers: getAuthHeaders(),
        data: JSON.stringify({ truckId, scheduledPickupTime }),
        success: function(response) {
            showAlert('success', 'Order placed successfully!');
            setTimeout(function() {
                window.location.href = '/myOrders';
            }, 1500);
        },
        error: function(xhr) {
            const error = xhr.responseJSON || {};
            showAlert('danger', error.message || 'Failed to place order');
            $('#placeOrderBtn').prop('disabled', false).text('Place Order');
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
}

