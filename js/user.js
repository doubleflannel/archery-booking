// user.js - User dashboard functionality

let currentBookings = [];

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!Session.requireAuth()) return;
    
    const session = Session.get();
    document.getElementById('userName').textContent = `Welcome, ${session.name}`;
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateFilter').value = today;
    
    // Load initial data
    loadAvailability();
    loadMyBookings();
});

async function loadAvailability() {
    const rangeTypeId = document.getElementById('rangeFilter').value;
    const date = document.getElementById('dateFilter').value;
    
    hideError();
    
    try {
        const result = await apiCall('getAvailability', { rangeTypeId, date });
        
        if (result.success) {
            displayAvailableSlots(result.slots);
        } else {
            showError(result.error || 'Failed to load availability');
        }
    } catch (error) {
        showError('Failed to load availability');
    }
}

function displayAvailableSlots(slots) {
    const container = document.getElementById('availableSlots');
    
    if (slots.length === 0) {
        container.innerHTML = '<p>No available slots found</p>';
        return;
    }
    
    const slotsHTML = slots.map(slot => `
        <div class="slot-card">
            <div class="slot-info">
                <h3>${slot.rangeTypeId} Range</h3>
                <p><strong>Date:</strong> ${formatDate(slot.date)}</p>
                <p><strong>Time:</strong> ${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}</p>
            </div>
            <button onclick="bookSlot('${slot.timeSlotId}')" class="btn-primary">
                Book Now
            </button>
        </div>
    `).join('');
    
    container.innerHTML = slotsHTML;
}

async function bookSlot(timeSlotId) {
    const session = Session.get();
    hideError();
    
    try {
        const result = await apiCall('book', {
            userId: session.userId,
            timeSlotId: timeSlotId
        });
        
        if (result.success) {
            alert(`Booking confirmed! Booking ID: ${result.bookingId}`);
            loadAvailability(); // Refresh available slots
            loadMyBookings(); // Refresh my bookings
        } else {
            showError(result.message || 'Booking failed');
        }
    } catch (error) {
        showError('Booking failed. Please try again.');
    }
}

async function loadMyBookings() {
    // Since we don't have a getMyBookings endpoint, we'll simulate it
    // In a real app, you'd add this endpoint to the backend
    const container = document.getElementById('myBookings');
    container.innerHTML = '<p>Note: This demo shows a simplified booking list. In production, you would implement a getMyBookings API endpoint.</p>';
}

async function cancelBooking(bookingId) {
    const session = Session.get();
    
    if (!confirm('Are you sure you want to cancel this booking?')) {
        return;
    }
    
    hideError();
    
    try {
        const result = await apiCall('cancel', {
            userId: session.userId,
            bookingId: bookingId
        });
        
        if (result.success) {
            alert('Booking cancelled successfully');
            loadAvailability(); // Refresh available slots
            loadMyBookings(); // Refresh my bookings
        } else {
            showError(result.message || 'Cancellation failed');
        }
    } catch (error) {
        showError('Cancellation failed. Please try again.');
    }
}