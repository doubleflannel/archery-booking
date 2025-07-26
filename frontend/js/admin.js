// admin.js - Admin functionality

function toggleAddSlot() {
    const content = document.getElementById('addSlotContent');
    const isVisible = content.style.display !== 'none';
    content.style.display = isVisible ? 'none' : 'block';
}

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
    
    // Set default date to today for new slot creation
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('newDate').value = today;
    
    // Leave admin date filter empty to show all dates by default
    document.getElementById('adminDateFilter').value = '';
    
    // Set up form handler
    document.getElementById('addSlotForm').addEventListener('submit', handleAddSlot);
    
    // Auto-load all slots on page load
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
    const rangeTypeId = document.getElementById('adminRangeFilter').value;
    const date = document.getElementById('adminDateFilter').value;
    
    hideError();
    
    try {
        // Get all slots for admin view
        const result = await apiCall('getAllSlots', { 
            userId: session.userId,
            rangeTypeId: rangeTypeId,
            date: date
        });
        
        if (result.success) {
            displayAllSlots(result.slots);
        } else {
            showError(result.message || 'Failed to load slots');
        }
    } catch (error) {
        showError('Failed to load slots');
    }
}

function displayAllSlots(slots) {
    const container = document.getElementById('allSlots');
    
    if (slots.length === 0) {
        container.innerHTML = '<p>No slots found for the selected filters</p>';
        return;
    }
    
    // Debug: Log the first few slots to see the data structure
    console.log('Admin slots data:', slots.slice(0, 3));
    
    const slotsHTML = slots.map(slot => {
        const statusClass = slot.isBooked ? 'status-booked' : 'status-available';
        const statusText = slot.isBooked ? 'Booked' : 'Available';
        
        let customerInfo = '';
        let actionButton = '';
        
        if (slot.isBooked && slot.customer) {
            customerInfo = `
                <p><strong>Customer:</strong> ${slot.customer.name} (${slot.customer.email}) - ${slot.customer.type}</p>
                <p><strong>Lane Code:</strong> <span class="lane-code-small">${slot.laneCode || 'N/A'}</span></p>
            `;
            actionButton = `
                <button onclick="adminCancelBooking('${slot.bookingId}')" class="btn-danger">
                    🔄 Free Up Slot
                </button>
            `;
        } else {
            customerInfo = '<p><em>Available for booking</em></p>';
            actionButton = `
                <button onclick="deleteSlot('${slot.timeSlotId}')" class="btn-secondary">
                    🗑️ Remove Permanently
                </button>
            `;
        }
        
        return `
            <div class="admin-slot-card">
                <div class="slot-details">
                    <h4>${slot.rangeTypeId} Range - Slot #${slot.timeSlotId}</h4>
                    <p><strong>Date:</strong> ${formatDate(slot.date)}</p>
                    <p><strong>Time:</strong> ${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}</p>
                    <p><strong>Status:</strong> <span class="${statusClass}">${statusText}</span></p>
                    ${customerInfo}
                </div>
                <div class="slot-actions">
                    ${actionButton}
                </div>
            </div>
        `;
    }).join('');
    
    const bookedCount = slots.filter(slot => slot.isBooked).length;
    const availableCount = slots.length - bookedCount;
    
    container.innerHTML = `
        <div class="slots-header">
            <h3>All Time Slots</h3>
            <p>📊 <strong>${bookedCount} Booked</strong> • <strong>${availableCount} Available</strong> • Total: ${slots.length}</p>
            <p>Manage all time slots and their bookings. Use filters to narrow down results.</p>
        </div>
        ${slotsHTML}
    `;
}

async function deleteSlot(timeSlotId) {
    if (!confirm('⚠️ PERMANENTLY REMOVE this time slot?\n\nThis will completely delete the slot and cannot be undone.\nAny future bookings for this time will no longer be possible.')) {
        return;
    }
    
    // Note: We don't have a deleteSlot endpoint in our current API
    // This would need to be implemented in the backend
    alert('⚠️ Permanent slot removal functionality needs to be implemented in the backend API.\n\nFor now, you can manually remove slots from the Google Sheet.');
}

// Function to cancel any booking (admin privilege)
async function adminCancelBooking(bookingId) {
    const session = Session.get();
    
    if (!confirm('🔄 FREE UP this booked slot?\n\nThis will cancel the customer\'s booking and make the slot available for others to book.')) {
        return;
    }
    
    hideError();
    
    try {
        const result = await apiCall('cancel', {
            userId: session.userId, // Admin can cancel any booking
            bookingId: bookingId
        });
        
        if (result.success) {
            alert('✅ Slot freed up successfully!\n\nThe booking has been cancelled and the slot is now available for new bookings.');
            loadAllSlots(); // Refresh view
        } else {
            showError(result.message || 'Failed to free up slot');
        }
    } catch (error) {
        showError('Cancellation failed. Please try again.');
    }
}