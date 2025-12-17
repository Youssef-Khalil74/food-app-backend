/**
 * My Orders Page JavaScript
 */
let allOrders = [];

$(document).ready(function() {
    loadOrders();
    
    // Status filter click handlers
    $(document).on('click', '.status-filter', function() {
        $('.status-filter').removeClass('active btn-primary').addClass('btn-outline-primary');
        $(this).removeClass('btn-outline-primary').addClass('active btn-primary');
        filterOrders($(this).data('status'));
    });
});

function loadOrders() {
    $.ajax({
        url: '/api/v1/order',
        method: 'GET',
        headers: getAuthHeaders(),
        success: function(orders) {
            $('#ordersLoading').hide();
            allOrders = orders || [];
            
            if (allOrders.length > 0) {
                renderOrders(allOrders);
            } else {
                $('#ordersContainer').hide();
                $('#noOrders').show();
            }
        },
        error: function() {
            $('#ordersLoading').hide();
            showAlert('danger', 'Failed to load orders');
        }
    });
}

function filterOrders(status) {
    if (!status) {
        renderOrders(allOrders);
    } else {
        const filtered = allOrders.filter(order => order.orderStatus === status);
        if (filtered.length > 0) {
            renderOrders(filtered);
            $('#noOrders').hide();
        } else {
            $('#ordersContainer').html('');
            $('#noOrders').show();
        }
    }
}

function renderOrders(orders) {
    let html = '';
    orders.forEach(function(order) {
        const date = new Date(order.createdAt).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        
        html += `
            <div class="order-card">
                <div class="order-card-header">
                    <div>
                        <span class="order-id">Order #${order.orderId}</span>
                        <span class="text-muted ms-3">${date}</span>
                    </div>
                    <span class="order-status ${order.orderStatus}">${order.orderStatus.toUpperCase()}</span>
                </div>
                <div class="order-card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <p class="mb-1"><strong>🚚 ${order.truckName}</strong></p>
                            ${order.scheduledPickupTime ? `<p class="text-muted small mb-0">Pickup: ${new Date(order.scheduledPickupTime).toLocaleString()}</p>` : ''}
                        </div>
                        <div class="col-md-6 text-md-end">
                            <p class="mb-1"><strong class="text-maroon">EGP ${parseFloat(order.totalPrice).toFixed(2)}</strong></p>
                            <button class="btn btn-outline-primary btn-sm" onclick="viewOrderDetails(${order.orderId})">
                                View Details
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    $('#ordersContainer').html(html);
    $('#noOrders').hide();
}

function viewOrderDetails(orderId) {
    const modal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
    modal.show();
    
    $.ajax({
        url: '/api/v1/order/' + orderId,
        method: 'GET',
        headers: getAuthHeaders(),
        success: function(order) {
            let itemsHtml = '';
            if (order.items && order.items.length > 0) {
                itemsHtml = '<table class="table"><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead><tbody>';
                order.items.forEach(function(item) {
                    itemsHtml += `
                        <tr>
                            <td>${item.name}</td>
                            <td>${item.quantity}</td>
                            <td>EGP ${parseFloat(item.price).toFixed(2)}</td>
                            <td>EGP ${(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                    `;
                });
                itemsHtml += '</tbody></table>';
            }
            
            const date = new Date(order.createdAt).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            
            const html = `
                <div class="mb-3">
                    <span class="order-status ${order.orderStatus} mb-2">${order.orderStatus.toUpperCase()}</span>
                </div>
                <p><strong>Order ID:</strong> #${order.orderId}</p>
                <p><strong>Truck:</strong> ${order.truckName}</p>
                <p><strong>Date:</strong> ${date}</p>
                ${order.scheduledPickupTime ? `<p><strong>Scheduled Pickup:</strong> ${new Date(order.scheduledPickupTime).toLocaleString()}</p>` : ''}
                <hr>
                <h6>Order Items</h6>
                ${itemsHtml}
                <hr>
                <div class="text-end">
                    <h5><strong>Total: EGP ${parseFloat(order.totalPrice).toFixed(2)}</strong></h5>
                </div>
            `;
            $('#orderDetailsContent').html(html);
        },
        error: function() {
            $('#orderDetailsContent').html('<p class="text-danger">Failed to load order details</p>');
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

