// booking.gs - Book and cancel reservations

function booking_create({ userId, timeSlotId }) {
  if (!userId || !timeSlotId) {
    return { success: false, message: 'userId and timeSlotId required' };
  }

  return withLock(() => {
    // Check if slot exists and is available
    const slot = findRowByValue('TimeSlots', 'TimeSlotID', timeSlotId);
    if (!slot) {
      return { success: false, message: 'Slot not found' };
    }
    
    const statusIndex = slot.headers.indexOf('Status');
    if (slot.values[statusIndex] !== 'Available') {
      return { success: false, message: 'Slot unavailable' };
    }
    
    // Mark slot as booked
    updateRowInSheet('TimeSlots', slot.row, { Status: 'Booked' });
    
    // Generate unique lane code
    const laneCode = generateUniqueLaneCode();
    
    // Create booking record
    const bookingId = nextId('BookingsNextID');
    appendRowToSheet('Bookings', {
      BookingID: bookingId,
      TimeSlotID: timeSlotId,
      CustomerID: userId,
      CustomerType: 'member',
      BookingTime: new Date(),
      Status: 'Active',
      LaneCode: laneCode
    });
    
    return { success: true, bookingId, laneCode };
  });
}

function booking_cancel({ userId, bookingId }) {
  if (!userId || !bookingId) {
    return { success: false, message: 'userId and bookingId required' };
  }

  // Find booking
  const booking = findRowByValue('Bookings', 'BookingID', bookingId);
  if (!booking) {
    return { success: false, message: 'Booking not found' };
  }
  
  // Check authorization - updated for new schema
  const bookingCustomerId = booking.values[booking.headers.indexOf('CustomerID')];
  const bookingCustomerType = booking.values[booking.headers.indexOf('CustomerType')];
  const user = findRowByValue('Users', 'UserID', userId);
  const userRole = user ? user.values[user.headers.indexOf('Role')] : null;
  
  // Check if user owns this booking or is admin
  const userOwnsBooking = (bookingCustomerType === 'member' && bookingCustomerId == userId);
  
  if (!userOwnsBooking && userRole !== 'admin') {
    return { success: false, message: 'Not authorized' };
  }
  
  // Get associated time slot
  const timeSlotId = booking.values[booking.headers.indexOf('TimeSlotID')];
  const slot = findRowByValue('TimeSlots', 'TimeSlotID', timeSlotId);
  if (!slot) {
    return { success: false, message: 'Time slot not found' };
  }
  
  // Check 12-hour cancellation rule (admin can override)
  if (userRole !== 'admin') {
    const slotDate = slot.values[slot.headers.indexOf('Date')];
    const slotStartTime = slot.values[slot.headers.indexOf('StartTime')];
    
    // Parse the date and time properly
    const bookingDate = new Date(slotDate);
    const startTime = new Date(slotStartTime);
    
    // Combine date and time correctly
    const bookingDateTime = new Date(bookingDate);
    bookingDateTime.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
    
    const now = new Date();
    const hoursUntilBooking = (bookingDateTime - now) / (1000 * 60 * 60);
    
    if (hoursUntilBooking < 12) {
      return { 
        success: false, 
        message: `Cannot cancel within 12 hours of booking start time. Hours until booking: ${hoursUntilBooking.toFixed(1)}`
      };
    }
  }
  
  // Delete booking
  getSheet('Bookings').deleteRow(booking.row);
  
  // Free the slot
  updateRowInSheet('TimeSlots', slot.row, { Status: 'Available' });
  
  return { success: true };
}

function booking_getMy({ userId }) {
  if (!userId) {
    return { success: false, message: 'userId required' };
  }

  // Get all bookings for this user
  const bookingsSheet = getSheet('Bookings');
  const bookingsData = bookingsSheet.getDataRange().getValues();
  const bookingsHeaders = bookingsData.shift();
  
  const slotsSheet = getSheet('TimeSlots');
  const slotsData = slotsSheet.getDataRange().getValues();
  const slotsHeaders = slotsData.shift();
  
  const userBookings = [];
  
  bookingsData.forEach(bookingRow => {
    const customerIdIndex = bookingsHeaders.indexOf('CustomerID');
    const customerTypeIndex = bookingsHeaders.indexOf('CustomerType');
    const statusIndex = bookingsHeaders.indexOf('Status');
    
    // Only get active member bookings for this user
    const isUserBooking = (bookingRow[customerIdIndex] == userId && 
                          bookingRow[customerTypeIndex] === 'member');
    
    if (isUserBooking && bookingRow[statusIndex] === 'Active') {
      const timeSlotIdIndex = bookingsHeaders.indexOf('TimeSlotID');
      const timeSlotId = bookingRow[timeSlotIdIndex];
      
      // Find the corresponding slot details
      const slot = slotsData.find(slotRow => 
        slotRow[slotsHeaders.indexOf('TimeSlotID')] == timeSlotId
      );
      
      if (slot) {
        userBookings.push({
          bookingId: bookingRow[bookingsHeaders.indexOf('BookingID')],
          timeSlotId: timeSlotId,
          rangeTypeId: slot[slotsHeaders.indexOf('RangeTypeID')],
          date: slot[slotsHeaders.indexOf('Date')],
          startTime: slot[slotsHeaders.indexOf('StartTime')],
          endTime: slot[slotsHeaders.indexOf('EndTime')],
          bookingTime: bookingRow[bookingsHeaders.indexOf('BookingTime')],
          status: bookingRow[statusIndex],
          laneCode: bookingRow[bookingsHeaders.indexOf('LaneCode')]
        });
      }
    }
  });
  
  // Sort by booking time (newest first)
  userBookings.sort((a, b) => new Date(b.bookingTime) - new Date(a.bookingTime));
  
  return { success: true, bookings: userBookings };
}

function booking_createGuest({ timeSlotId, guestEmail, guestName }) {
  if (!timeSlotId || !guestEmail || !guestName) {
    return { success: false, message: 'timeSlotId, guestEmail, and guestName required' };
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
    return { success: false, message: 'Invalid email format' };
  }

  return withLock(() => {
    // Check if slot exists and is available
    const slot = findRowByValue('TimeSlots', 'TimeSlotID', timeSlotId);
    if (!slot) {
      return { success: false, message: 'Slot not found' };
    }
    
    const statusIndex = slot.headers.indexOf('Status');
    if (slot.values[statusIndex] !== 'Available') {
      return { success: false, message: 'Slot unavailable' };
    }
    
    // Mark slot as booked
    updateRowInSheet('TimeSlots', slot.row, { Status: 'Booked' });
    
    // Generate unique lane code
    const laneCode = generateUniqueLaneCode();
    
    // Find or create guest record (tracks repeat guests!)
    const guestId = findOrCreateGuest(guestEmail, guestName);
    
    // Create booking record with clean schema
    const bookingId = nextId('BookingsNextID');
    appendRowToSheet('Bookings', {
      BookingID: bookingId,
      TimeSlotID: timeSlotId,
      CustomerID: guestId,
      CustomerType: 'guest',
      BookingTime: new Date(),
      Status: 'Active',
      LaneCode: laneCode
    });
    
    // Get guest info for response
    const guestInfo = getGuestInfo(guestId);
    
    return { 
      success: true, 
      bookingId, 
      laneCode, 
      guestEmail, 
      guestName,
      guestId,
      isReturningGuest: guestInfo.totalBookings > 1
    };
  });
}

function booking_cancelGuest({ bookingId, guestEmail }) {
  if (!bookingId || !guestEmail) {
    return { success: false, message: 'bookingId and guestEmail required' };
  }

  // Find booking
  const booking = findRowByValue('Bookings', 'BookingID', bookingId);
  if (!booking) {
    return { success: false, message: 'Booking not found' };
  }
  
  // Check if this is a guest booking and get guest info
  const bookingCustomerId = booking.values[booking.headers.indexOf('CustomerID')];
  const bookingCustomerType = booking.values[booking.headers.indexOf('CustomerType')];
  
  if (bookingCustomerType !== 'guest') {
    return { success: false, message: 'Invalid booking type' };
  }
  
  // Verify the guest email matches
  const guestInfo = getGuestInfo(bookingCustomerId);
  if (!guestInfo || guestInfo.email !== guestEmail) {
    return { success: false, message: 'Invalid booking or email' };
  }
  
  // Get associated time slot for 12-hour rule check
  const timeSlotId = booking.values[booking.headers.indexOf('TimeSlotID')];
  const slot = findRowByValue('TimeSlots', 'TimeSlotID', timeSlotId);
  if (!slot) {
    return { success: false, message: 'Time slot not found' };
  }
  
  // Check 12-hour cancellation rule (same as member cancellation)
  const slotDate = slot.values[slot.headers.indexOf('Date')];
  const slotStartTime = slot.values[slot.headers.indexOf('StartTime')];
  
  const bookingDate = new Date(slotDate);
  const startTime = new Date(slotStartTime);
  const bookingDateTime = new Date(bookingDate);
  bookingDateTime.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
  
  const now = new Date();
  const hoursUntilBooking = (bookingDateTime - now) / (1000 * 60 * 60);
  
  if (hoursUntilBooking < 12) {
    return { 
      success: false, 
      message: `Cannot cancel within 12 hours of booking start time. Hours until booking: ${hoursUntilBooking.toFixed(1)}`
    };
  }
  
  // Delete booking
  getSheet('Bookings').deleteRow(booking.row);
  
  // Free the slot
  updateRowInSheet('TimeSlots', slot.row, { Status: 'Available' });
  
  return { success: true };
}