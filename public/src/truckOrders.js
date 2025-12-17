/**
 * Truck Orders Page JavaScript
 */
let allOrders = [];
let activeOrders = [];
let completedOrders = [];
let sortByPickup = true; // Default sort by pickup time

$(document).ready(function() {
    loadOrders();
    
    // Status filter click handlers (for active orders only)
    $(document).on('click', '.status-filter', function() {
        $('.status-filter').removeClass('active btn-primary').addClass('btn-outline-primary');
        $(this).removeClass('btn-outline-primary').addClass('active btn-primary');
        filterActiveOrders($(this).data('status'));
    });
    
    // Sort toggle handlers
    $(document).on('click', '.sort-toggle', function() {
        $('.sort-toggle').removeClass('active');
        $(this).addClass('active');
        sortByPickup = $(this).data('sort') === 'pickup';
        sortAndRenderActiveOrders();
    });
    
    // Confirm status update
    $('#confirmStatusBtn').on('click', updateOrderStatus);
});

function loadOrders() {
    $.ajax({
        url: '/api/v1/order?view=truck',
        method: 'GET',
        headers: getAuthHeaders(),
        success: function(orders) {
            $('#ordersLoading').hide();
            allOrders = orders || [];
            
            // Separate active and completed orders
            activeOrders = allOrders.filter(order => order.orderStatus !== 'completed');
            completedOrders = allOrders.filter(order => order.orderStatus === 'completed');
            
            // Sort and render both sections
            sortAndRenderActiveOrders();
            renderCompletedOrders(completedOrders);
        },
        error: function() {
            $('#ordersLoading').hide();
            showAlert('danger', 'Failed to load orders');
        }
    });
}

function sortAndRenderActiveOrders() {
    let sortedOrders = [...activeOrders];
    
    if (sortByPickup) {
        // Sort by scheduled pickup time (earliest first), then by order time
        sortedOrders.sort((a, b) => {
            const pickupA = a.scheduledPickupTime ? new Date(a.scheduledPickupTime) : new Date(a.createdAt);
            const pickupB = b.scheduledPickupTime ? new Date(b.scheduledPickupTime) : new Date(b.createdAt);
            return pickupA - pickupB;
        });
    } else {
        // Sort by order creation time (newest first)
        sortedOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    renderActiveOrders(sortedOrders);
}

function filterActiveOrders(status) {
    let filtered;
    if (!status) {
        // Show all active orders (pending + ready)
        filtered = activeOrders;
    } else {
        filtered = activeOrders.filter(order => order.orderStatus === status);
    }
    
    // Apply sorting
    if (sortByPickup) {
        filtered.sort((a, b) => {
            const pickupA = a.scheduledPickupTime ? new Date(a.scheduledPickupTime) : new Date(a.createdAt);
            const pickupB = b.scheduledPickupTime ? new Date(b.scheduledPickupTime) : new Date(b.createdAt);
            return pickupA - pickupB;
        });
    } else {
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    if (filtered.length > 0) {
        renderActiveOrders(filtered);
        $('#noActiveOrders').hide();
        $('#activeOrdersCard').show();
    } else {
        $('#ordersBody').html('');
        $('#activeOrdersCard').hide();
        $('#noActiveOrders').show();
    }
}

function renderActiveOrders(orders) {
    if (orders.length === 0) {
        $('#activeOrdersCard').hide();
        $('#noActiveOrders').show();
        return;
    }
    
    $('#activeOrdersCard').show();
    $('#noActiveOrders').hide();
    
    let html = '';
    orders.forEach(function(order) {
        const date = new Date(order.createdAt).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
        
        // Format pickup time with urgency indicator
        let pickupDisplay = 'Not scheduled';
        let pickupClass = '';
        if (order.scheduledPickupTime) {
            const pickupDate = new Date(order.scheduledPickupTime);
            const now = new Date();
            const minutesUntil = Math.round((pickupDate - now) / 60000);
            
            pickupDisplay = pickupDate.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            if (minutesUntil <= 5) {
                pickupClass = 'text-danger fw-bold';
                pickupDisplay = `⚠️ ${pickupDisplay}`;
            } else if (minutesUntil <= 15) {
                pickupClass = 'text-warning fw-bold';
                pickupDisplay = `⏰ ${pickupDisplay}`;
            }
        }
        
        const statusDisplay = getStatusDisplay(order.orderStatus);
        
        html += `
            <tr>
                <td>#${order.orderId}</td>
                <td>${order.customerName || 'Customer'}</td>
                <td><span class="order-status ${order.orderStatus}">${statusDisplay}</span></td>
                <td>EGP ${parseFloat(order.totalPrice).toFixed(2)}</td>
                <td class="${pickupClass}">${pickupDisplay}</td>
                <td>${date}</td>
                <td>
                    <button class="btn btn-outline-primary btn-sm me-1" onclick="viewOrderDetails(${order.orderId})" title="View">
                        👁️
                    </button>
                    <button class="btn btn-outline-primary btn-sm" onclick="openUpdateModal(${order.orderId}, '${order.orderStatus}')" title="Update Status">
                        ✏️
                    </button>
                </td>
            </tr>
        `;
    });
    $('#ordersBody').html(html);
}

function renderCompletedOrders(orders) {
    if (orders.length === 0) {
        $('#completedOrdersCard').hide();
        $('#noCompletedOrders').show();
        return;
    }
    
    $('#completedOrdersCard').show();
    $('#noCompletedOrders').hide();
    
    let html = '';
    orders.forEach(function(order) {
        const date = new Date(order.updatedAt || order.createdAt).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        
        html += `
            <tr>
                <td>#${order.orderId}</td>
                <td>${order.customerName || 'Customer'}</td>
                <td>EGP ${parseFloat(order.totalPrice).toFixed(2)}</td>
                <td>${date}</td>
                <td>
                    <button class="btn btn-outline-primary btn-sm" onclick="viewOrderDetails(${order.orderId})" title="View Details">
                        👁️
                    </button>
                </td>
            </tr>
        `;
    });
    $('#completedOrdersBody').html(html);
}

function getStatusDisplay(status) {
    switch(status) {
        case 'pending': return 'PENDING';
        case 'ready': return 'READY';
        case 'completed': return 'COMPLETE';
        default: return status.toUpperCase();
    }
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
            
            const html = `
                <div class="mb-3">
                    <span class="order-status ${order.orderStatus}">${getStatusDisplay(order.orderStatus)}</span>
                </div>
                <p><strong>Order ID:</strong> #${order.orderId}</p>
                <p><strong>Customer:</strong> ${order.customerName || 'Customer'}</p>
                <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
                ${order.scheduledPickupTime ? `<p><strong>Pickup Time:</strong> ${new Date(order.scheduledPickupTime).toLocaleString()}</p>` : ''}
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

function openUpdateModal(orderId, currentStatus) {
    $('#updateOrderId').val(orderId);
    $('#newStatus').val(currentStatus);
    new bootstrap.Modal(document.getElementById('updateStatusModal')).show();
}

function updateOrderStatus() {
    const orderId = $('#updateOrderId').val();
    const newStatus = $('#newStatus').val();
    
    $('#confirmStatusBtn').prop('disabled', true).text('Updating...');
    
    $.ajax({
        url: '/api/v1/order/' + orderId,
        method: 'PUT',
        contentType: 'application/json',
        headers: getAuthHeaders(),
        data: JSON.stringify({ orderStatus: newStatus }),
        success: function() {
            bootstrap.Modal.getInstance(document.getElementById('updateStatusModal')).hide();
            showAlert('success', 'Order status updated successfully');
            loadOrders(); // Reload to move order to correct section
            $('#confirmStatusBtn').prop('disabled', false).text('Update Status');
        },
        error: function(xhr) {
            const error = xhr.responseJSON || {};
            showAlert('danger', error.message || 'Failed to update order status');
            $('#confirmStatusBtn').prop('disabled', false).text('Update Status');
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
