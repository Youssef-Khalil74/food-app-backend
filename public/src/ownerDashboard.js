/**
 * Owner Dashboard JavaScript
 */
$(document).ready(function() {
    loadTruckInfo();
    loadStats();
    loadRecentOrders();
    
    // Order status toggle
    $('#orderStatusToggle').on('change', updateOrderStatus);
});

function loadTruckInfo() {
    $.ajax({
        url: '/api/v1/restaurant/my-trucks',
        method: 'GET',
        headers: getAuthHeaders(),
        success: function(trucks) {
            if (trucks && trucks.length > 0) {
                const truck = trucks[0];
                $('#truckName').text(truck.truckName);
                const isAccepting = truck.orderStatus === 'available';
                $('#truckStatus').text(isAccepting ? 'Accepting Orders' : 'Not Accepting');
                $('#orderStatusToggle').val(isAccepting ? 'available' : 'busy');
            }
        }
    });
}

function loadStats() {
    // Load pending orders count only
    $.ajax({
        url: '/api/v1/order?view=truck',
        method: 'GET',
        headers: getAuthHeaders(),
        success: function(orders) {
            const pending = orders.filter(o => 
                o.orderStatus === 'pending' || o.orderStatus === 'confirmed' || o.orderStatus === 'preparing'
            ).length;
            
            $('#pendingOrdersCount').text(pending);
        }
    });
}

function loadRecentOrders() {
    $.ajax({
        url: '/api/v1/order?view=truck',
        method: 'GET',
        headers: getAuthHeaders(),
        success: function(orders) {
            $('#ordersLoading').hide();
            
            if (orders && orders.length > 0) {
                // Show only pending/active orders first, then recent
                const activeOrders = orders.filter(o => 
                    o.orderStatus === 'pending' || o.orderStatus === 'confirmed' || o.orderStatus === 'preparing' || o.orderStatus === 'ready'
                );
                renderRecentOrders(activeOrders.slice(0, 5));
            } else {
                $('#recentOrdersContainer').hide();
                $('#noOrders').show();
            }
        },
        error: function() {
            $('#ordersLoading').hide();
            $('#noOrders').show();
        }
    });
}

function renderRecentOrders(orders) {
    let html = '<table class="table mb-0"><thead><tr><th>Order ID</th><th>Customer</th><th>Status</th><th>Total</th></tr></thead><tbody>';
    
    orders.forEach(function(order) {
        html += `
            <tr>
                <td>#${order.orderId}</td>
                <td>${order.customerName || 'Customer'}</td>
                <td><span class="order-status ${order.orderStatus}">${order.orderStatus.toUpperCase()}</span></td>
                <td>EGP ${parseFloat(order.totalPrice).toFixed(2)}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    $('#recentOrdersContainer').html(html);
}

function updateOrderStatus() {
    const newStatus = $('#orderStatusToggle').val();
    
    $.ajax({
        url: '/api/v1/restaurant/status',
        method: 'PUT',
        contentType: 'application/json',
        headers: getAuthHeaders(),
        data: JSON.stringify({ orderStatus: newStatus }),
        success: function() {
            const isAccepting = newStatus === 'available';
            $('#truckStatus').text(isAccepting ? 'Accepting Orders' : 'Not Accepting');
            showAlert('success', 'Status updated to: ' + (isAccepting ? 'Accepting Orders' : 'Not Accepting'));
        },
        error: function(xhr) {
            const error = xhr.responseJSON || {};
            showAlert('danger', error.message || 'Failed to update status');
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
    
    if (type === 'success') {
        setTimeout(() => $('.alert').fadeOut(), 2000);
    }
}

