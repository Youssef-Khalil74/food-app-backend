/**
 * Role Guard - Ensures users can only access pages for their role
 */

function checkRole(allowedRoles) {
    const token = sessionStorage.getItem('token');
    
    // If no token, redirect to login
    if (!token) {
        window.location.href = '/';
        return false;
    }
    
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    
    // If no user data or no role, redirect to login
    if (!user || !user.role) {
        sessionStorage.clear();
        window.location.href = '/';
        return false;
    }
    
    // Check if user's role is allowed
    if (!allowedRoles.includes(user.role)) {
        // Redirect to appropriate dashboard
        redirectToDashboard(user.role);
        return false;
    }
    
    return true;
}

function redirectToDashboard(role) {
    const dashboardUrl = getDashboardUrl(role);
    if (window.location.pathname !== dashboardUrl) {
        window.location.href = dashboardUrl;
    }
}

function getDashboardUrl(role) {
    switch(role) {
        case 'customer':
            return '/dashboard';
        case 'truckOwner':
            return '/ownerDashboard';
        case 'admin':
            return '/adminDashboard';
        default:
            return '/';
    }
}

// Check authentication only (no role check)
function requireAuth() {
    const token = sessionStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return false;
    }
    return true;
}

// Get current user's role
function getCurrentRole() {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    return user.role || null;
}
