// guest.js - Guest booking functionality

let selectedSlotData = null;

document.addEventListener('DOMContentLoaded', function() {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateFilter').value = today;
    
    // Load initial data - show all available slots by default
    document.getElementById('rangeFilter').value = '';
    document.getElementById('dateFilter').value = '';
    loadAvailability();
    
    // Set up guest form handler
    document.getElementById('guestInfoForm').addEventListener('submit', handleGuestBooking);
});

function goToLogin() {
    window.location.href = 'index.html';
}

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
        <div class="slot-card ${selectedSlotData?.timeSlotId === slot.timeSlotId ? 'selected' : ''}">
            <div class="slot-info">
                <h3>${slot.rangeTypeId} Range</h3>
                <p><strong>Date:</strong> ${formatDate(slot.date)}</p>
                <p><strong>Time:</strong> ${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}</p>
            </div>
            <button onclick="selectSlot('${slot.timeSlotId}', '${slot.rangeTypeId}', '${slot.date}', '${slot.startTime}', '${slot.endTime}')" class="btn-primary">
                ${selectedSlotData?.timeSlotId === slot.timeSlotId ? 'Selected' : 'Select Slot'}
            </button>
        </div>
    `).join('');
    
    container.innerHTML = slotsHTML;
}

function selectSlot(timeSlotId, rangeTypeId, date, startTime, endTime) {
    selectedSlotData = {
        timeSlotId,
        rangeTypeId,
        date,
        startTime,
        endTime
    };
    
    // Update selected slot display
    const selectedSlotDiv = document.getElementById('selectedSlot');
    selectedSlotDiv.innerHTML = `
        <div class="selected-slot-details">
            <h4>${rangeTypeId} Range</h4>
            <p><strong>Date:</strong> ${formatDate(date)}</p>
            <p><strong>Time:</strong> ${formatTime(startTime)} - ${formatTime(endTime)}</p>
        </div>
    `;
    
    // Enable booking button
    document.getElementById('bookGuestBtn').disabled = false;
    
    // Update slot cards to show selection
    displayAvailableSlots(document.getElementById('availableSlots').slotData || []);
    
    // Scroll to guest form
    document.getElementById('guestForm').scrollIntoView({ behavior: 'smooth' });
}

async function handleGuestBooking(e) {
    e.preventDefault();
    
    const name = document.getElementById('guestName').value;
    const email = document.getElementById('guestEmail').value;
    
    if (!name || !email || !selectedSlotData) {
        showError('Please fill in all fields and select a time slot');
        return;
    }
    
    const submitBtn = document.getElementById('bookGuestBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '⏳ Booking...';
    submitBtn.disabled = true;
    
    hideError();
    
    try {
        const result = await apiCall('bookGuest', {
            name: name,
            email: email,
            timeSlotId: selectedSlotData.timeSlotId
        });
        
        if (result.success) {
            alert(`Guest booking confirmed!\nBooking ID: ${result.bookingId}\n🎯 Lane Code: ${result.laneCode}\n\nName: ${name}\nEmail: ${email}\n\nSlot: ${selectedSlotData.rangeTypeId} Range\nDate: ${formatDate(selectedSlotData.date)}\nTime: ${formatTime(selectedSlotData.startTime)} - ${formatTime(selectedSlotData.endTime)}\n\nUse this code to unlock your lane!`);
            
            // Reset form and selection
            document.getElementById('guestInfoForm').reset();
            selectedSlotData = null;
            document.getElementById('selectedSlot').innerHTML = '<p>No slot selected</p>';
            document.getElementById('bookGuestBtn').disabled = true;
            
            // Refresh available slots
            loadAvailability();
        } else {
            showError(result.message || 'Guest booking failed');
        }
    } catch (error) {
        showError('Guest booking failed. Please try again.');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}