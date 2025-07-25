// admin.js - Admin functionality

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication and admin role
    if (!Session.requireAuth()) return;
    
    const session = Session.get();
    if (session.role !== 'admin') {
        alert('Access denied. Admin privileges required.');
        window.location.href = 'dashboard.html';
        return;
    }
    
    document.getElementById('userName').textContent = `Admin: ${session.name}`;
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('newDate').value = today;
    document.getElementById('adminDateFilter').value = today;
    
    // Set up form handler
    document.getElementById('addSlotForm').addEventListener('submit', handleAddSlot);
    
    // Load initial data
    loadAllSlots();
});

async function handleAddSlot(e) {
    e.preventDefault();
    hideError();
    
    const session = Session.get();
    const addSlotBtn = document.getElementById('addSlotBtn');
    
    const slotData = {
        userId: session.userId,
        rangeTypeId: document.getElementById('newRangeType').value,
        date: document.getElementById('newDate').value,
        startTime: document.getElementById('newStartTime').value,
        endTime: document.getElementById('newEndTime').value
    };
    
    showLoading(addSlotBtn);
    
    try {
        const result = await apiCall('addSlot', slotData);
        
        if (result.success) {
            alert(`Slot added successfully! Slot ID: ${result.timeSlotId}`);
            document.getElementById('addSlotForm').reset();
            
            // Reset default date
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('newDate').value = today;
            
            // Refresh slots view
            loadAllSlots();
        } else {
            showError(result.message || 'Failed to add slot');
        }
    } catch (error) {
        showError('Failed to add slot. Please try again.');
    } finally {
        hideLoading(addSlotBtn, 'Add Slot');
    }
}

async function loadAllSlots() {
    const session = Session.get();
    hideError();
    
    try {
        // Get all bookings for admin view
        const result = await apiCall('getAllBookings', { userId: session.userId });
        
        if (result.success) {
            displayAllBookings(result.bookings);
        } else {
            showError(result.message || 'Failed to load bookings');
        }
    } catch (error) {
        showError('Failed to load bookings');
    }
}

function displayAllBookings(bookings) {
    const container = document.getElementById('allSlots');
    
    if (bookings.length === 0) {
        container.innerHTML = '<p>No active bookings found</p>';
        return;
    }
    
    const bookingsHTML = bookings.map(booking => `
        <div class="admin-slot-card">
            <div class="slot-details">
                <h4>Booking #${booking.bookingId}</h4>
                <p><strong>Customer:</strong> ${booking.userName} (${booking.userEmail})</p>
                <p><strong>Range:</strong> ${booking.rangeTypeId}</p>
                <p><strong>Date:</strong> ${formatDate(booking.date)}</p>
                <p><strong>Time:</strong> ${formatTime(booking.startTime)} - ${formatTime(booking.endTime)}</p>
                <p><strong>Booked:</strong> ${formatDate(booking.bookingTime)}</p>
                <p><strong>Status:</strong> <span class="status-booked">${booking.status}</span></p>
            </div>
            <div class="slot-actions">
                <button onclick="adminCancelBooking('${booking.bookingId}')" class="btn-danger">
                    Cancel Booking
                </button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = `
        <div class="slots-header">
            <h3>All Active Bookings</h3>
            <p>Manage all customer bookings from this admin panel.</p>
        </div>
        ${bookingsHTML}
    `;
}

async function deleteSlot(timeSlotId) {
    if (!confirm('Are you sure you want to delete this slot? This action cannot be undone.')) {
        return;
    }
    
    // Note: We don't have a deleteSlot endpoint in our current API
    // This would need to be implemented in the backend
    alert('Delete slot functionality would be implemented in the backend API.');
}

// Function to cancel any booking (admin privilege)
async function adminCancelBooking(bookingId) {
    const session = Session.get();
    
    if (!confirm('Are you sure you want to cancel this booking?')) {
        return;
    }
    
    hideError();
    
    try {
        const result = await apiCall('cancel', {
            userId: session.userId, // Admin can cancel any booking
            bookingId: bookingId
        });
        
        if (result.success) {
            alert('Booking cancelled successfully');
            loadAllSlots(); // Refresh view
        } else {
            showError(result.message || 'Cancellation failed');
        }
    } catch (error) {
        showError('Cancellation failed. Please try again.');
    }
}