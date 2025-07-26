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
    
    // Load initial data - show all available slots by default
    document.getElementById('rangeFilter').value = '';
    document.getElementById('dateFilter').value = '';
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
    const button = event.target;
    
    // Show loading state
    const originalText = button.innerHTML;
    button.innerHTML = '⏳ Booking...';
    button.disabled = true;
    button.classList.add('loading');
    
    hideError();
    
    try {
        const result = await apiCall('book', {
            userId: session.userId,
            timeSlotId: timeSlotId
        });
        
        if (result.success) {
            alert(`Booking confirmed!\nBooking ID: ${result.bookingId}\n🎯 Lane Code: ${result.laneCode}\n\nUse this code to unlock your lane!`);
            loadAvailability(); // Refresh available slots
            loadMyBookings(); // Refresh my bookings
        } else {
            showError(result.message || 'Booking failed');
        }
    } catch (error) {
        showError('Booking failed. Please try again.');
    } finally {
        // Reset button state
        button.innerHTML = originalText;
        button.disabled = false;
        button.classList.remove('loading');
    }
}

async function loadMyBookings() {
    const session = Session.get();
    const container = document.getElementById('myBookings');
    
    try {
        const result = await apiCall('getMyBookings', { userId: session.userId });
        
        if (result.success) {
            displayMyBookings(result.bookings);
        } else {
            container.innerHTML = `<p>Error loading bookings: ${result.message}</p>`;
        }
    } catch (error) {
        container.innerHTML = '<p>Failed to load bookings</p>';
    }
}

function canCancelBooking(booking) {
    // Check if booking is more than 12 hours away
    const bookingDateTime = new Date(booking.date + ' ' + booking.startTime);
    const now = new Date();
    const hoursUntilBooking = (bookingDateTime - now) / (1000 * 60 * 60);
    return hoursUntilBooking >= 12;
}

function displayMyBookings(bookings) {
    const container = document.getElementById('myBookings');
    
    if (bookings.length === 0) {
        container.innerHTML = '<p>You have no active bookings</p>';
        return;
    }
    
    const bookingsHTML = bookings.map(booking => {
        const canCancel = canCancelBooking(booking);
        const cancelButton = canCancel 
            ? `<button onclick="cancelBooking('${booking.bookingId}')" class="btn-danger">Cancel</button>`
            : `<button class="btn-disabled" disabled title="Cannot cancel within 12 hours">Cannot Cancel</button>`;
            
        return `
            <div class="booking-card">
                <div class="booking-info">
                    <h4>${formatDate(booking.date)} • ${formatTime(booking.startTime)} - ${formatTime(booking.endTime)}</h4>
                    <p><strong>Range:</strong> ${booking.rangeTypeId}</p>
                    <p class="lane-code-small">🎯 Code: <strong>${booking.laneCode || 'N/A'}</strong></p>
                    <p class="booking-meta">Booked ${formatDate(booking.bookingTime)}</p>
                    ${!canCancel ? '<p class="cancellation-warning">⚠️ Cannot cancel within 12 hours of start time</p>' : ''}
                </div>
                <div class="booking-actions">
                    ${cancelButton}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = bookingsHTML;
}

async function cancelBooking(bookingId) {
    const session = Session.get();
    
    if (!confirm('Are you sure you want to cancel this booking?')) {
        return;
    }
    
    const button = event.target;
    const originalText = button.innerHTML;
    button.innerHTML = '⏳ Cancelling...';
    button.disabled = true;
    button.classList.add('loading');
    
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
    } finally {
        // Reset button state if button still exists
        if (button && button.parentNode) {
            button.innerHTML = originalText;
            button.disabled = false;
            button.classList.remove('loading');
        }
    }
}

