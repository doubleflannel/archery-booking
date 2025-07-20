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
    const rangeTypeId = document.getElementById('adminRangeFilter').value;
    const date = document.getElementById('adminDateFilter').value;
    
    hideError();
    
    try {
        // Get all slots (available and booked)
        const result = await apiCall('getAvailability', { rangeTypeId, date });
        
        if (result.success) {
            displayAllSlots(result.slots);
        } else {
            showError(result.error || 'Failed to load slots');
        }
    } catch (error) {
        showError('Failed to load slots');
    }
}

function displayAllSlots(slots) {
    const container = document.getElementById('allSlots');
    
    if (slots.length === 0) {
        container.innerHTML = '<p>No slots found for the selected criteria</p>';
        return;
    }
    
    // Note: This currently only shows available slots since our API doesn't return booked slots
    // In a full implementation, you'd add a getAllSlots endpoint
    const slotsHTML = slots.map(slot => `
        <div class="admin-slot-card">
            <div class="slot-details">
                <h4>Slot ID: ${slot.timeSlotId}</h4>
                <p><strong>Range:</strong> ${slot.rangeTypeId}</p>
                <p><strong>Date:</strong> ${formatDate(slot.date)}</p>
                <p><strong>Time:</strong> ${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}</p>
                <p><strong>Status:</strong> <span class="status-available">Available</span></p>
            </div>
            <div class="slot-actions">
                <button onclick="deleteSlot('${slot.timeSlotId}')" class="btn-danger">
                    Delete Slot
                </button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = `
        <div class="slots-header">
            <p><strong>Note:</strong> This view currently shows only available slots. 
            In production, you would implement a comprehensive admin API to view all slots and bookings.</p>
        </div>
        ${slotsHTML}
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