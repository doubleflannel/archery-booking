// admin.gs - Admin functions

function admin_addSlot({ userId, rangeTypeId, date, startTime, endTime }) {
  if (!userId || !rangeTypeId || !date || !startTime || !endTime) {
    return { success: false, message: 'Missing required fields' };
  }

  // Check if user is admin
  const user = findRowByValue('Users', 'UserID', userId);
  if (!user) {
    return { success: false, message: 'User not found' };
  }
  
  const roleIndex = user.headers.indexOf('Role');
  if (user.values[roleIndex] !== 'admin') {
    return { success: false, message: 'Unauthorized - admin access required' };
  }
  
  // Check for duplicate slots
  const sheet = getSheet('TimeSlots');
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  
  const iRange = headers.indexOf('RangeTypeID');
  const iDate = headers.indexOf('Date');
  const iStart = headers.indexOf('StartTime');
  
  for (let row of data) {
    if (row[iRange] == rangeTypeId && 
        row[iDate] == date && 
        row[iStart] == startTime) {
      return { success: false, message: 'Slot already exists for this time' };
    }
  }
  
  // Create new slot
  const timeSlotId = nextId('TimeSlotsNextID');
  appendRowToSheet('TimeSlots', {
    TimeSlotID: timeSlotId,
    RangeTypeID: rangeTypeId,
    Date: date,
    StartTime: startTime,
    EndTime: endTime,
    Status: 'Available'
  });
  
  return { success: true, timeSlotId };
}

function admin_getAll({ userId }) {
  if (!userId) {
    return { success: false, message: 'userId required' };
  }

  // Check if user is admin
  const user = findRowByValue('Users', 'UserID', userId);
  if (!user) {
    return { success: false, message: 'User not found' };
  }
  
  const roleIndex = user.headers.indexOf('Role');
  if (user.values[roleIndex] !== 'admin') {
    return { success: false, message: 'Unauthorized - admin access required' };
  }

  // Get all bookings with joined slot and user info
  const bookingsSheet = getSheet('Bookings');
  const bookingsData = bookingsSheet.getDataRange().getValues();
  const bookingsHeaders = bookingsData.shift();
  
  const slotsSheet = getSheet('TimeSlots');
  const slotsData = slotsSheet.getDataRange().getValues();
  const slotsHeaders = slotsData.shift();
  
  const usersSheet = getSheet('Users');
  const usersData = usersSheet.getDataRange().getValues();
  const usersHeaders = usersData.shift();
  
  const allBookings = [];
  
  bookingsData.forEach(bookingRow => {
    const statusIndex = bookingsHeaders.indexOf('Status');
    
    // Only get active bookings
    if (bookingRow[statusIndex] === 'Active') {
      const timeSlotIdIndex = bookingsHeaders.indexOf('TimeSlotID');
      const userIdIndex = bookingsHeaders.indexOf('UserID');
      const timeSlotId = bookingRow[timeSlotIdIndex];
      const bookingUserId = bookingRow[userIdIndex];
      
      // Find the corresponding slot details
      const slot = slotsData.find(slotRow => 
        slotRow[slotsHeaders.indexOf('TimeSlotID')] == timeSlotId
      );
      
      // Find the corresponding user details
      const bookingUser = usersData.find(userRow => 
        userRow[usersHeaders.indexOf('UserID')] == bookingUserId
      );
      
      if (slot && bookingUser) {
        allBookings.push({
          bookingId: bookingRow[bookingsHeaders.indexOf('BookingID')],
          timeSlotId: timeSlotId,
          rangeTypeId: slot[slotsHeaders.indexOf('RangeTypeID')],
          date: slot[slotsHeaders.indexOf('Date')],
          startTime: slot[slotsHeaders.indexOf('StartTime')],
          endTime: slot[slotsHeaders.indexOf('EndTime')],
          bookingTime: bookingRow[bookingsHeaders.indexOf('BookingTime')],
          status: bookingRow[statusIndex],
          userName: bookingUser[usersHeaders.indexOf('Name')],
          userEmail: bookingUser[usersHeaders.indexOf('Email')],
          userId: bookingUserId
        });
      }
    }
  });
  
  return { success: true, bookings: allBookings };
}

function admin_getAllSlots({ userId, rangeTypeId, date }) {
  if (!userId) {
    return { success: false, message: 'userId required' };
  }

  // Check if user is admin
  const user = findRowByValue('Users', 'UserID', userId);
  if (!user) {
    return { success: false, message: 'User not found' };
  }
  
  const roleIndex = user.headers.indexOf('Role');
  if (user.values[roleIndex] !== 'admin') {
    return { success: false, message: 'Unauthorized - admin access required' };
  }

  // Get all time slots with booking status
  const slotsSheet = getSheet('TimeSlots');
  const slotsData = slotsSheet.getDataRange().getValues();
  const slotsHeaders = slotsData.shift();
  
  const bookingsSheet = getSheet('Bookings');
  const bookingsData = bookingsSheet.getDataRange().getValues();
  const bookingsHeaders = bookingsData.shift();
  
  const allSlots = [];
  
  slotsData.forEach(slotRow => {
    const slotRange = slotRow[slotsHeaders.indexOf('RangeTypeID')];
    const slotDate = slotRow[slotsHeaders.indexOf('Date')];
    const slotId = slotRow[slotsHeaders.indexOf('TimeSlotID')];
    
    // Apply filters
    const matchesRange = !rangeTypeId || slotRange == rangeTypeId;
    let matchesDate = !date;
    if (date && slotDate) {
      try {
        const inputDate = new Date(date);
        const sheetDate = new Date(slotDate);
        const inputDateStr = inputDate.toISOString().split('T')[0];
        const sheetDateStr = sheetDate.toISOString().split('T')[0];
        matchesDate = inputDateStr === sheetDateStr;
      } catch (e) {
        matchesDate = false;
      }
    }
    
    if (matchesRange && matchesDate) {
      // Check if slot is booked
      const booking = bookingsData.find(bookingRow => 
        bookingRow[bookingsHeaders.indexOf('TimeSlotID')] == slotId &&
        bookingRow[bookingsHeaders.indexOf('Status')] === 'Active'
      );
      
      let customerInfo = null;
      if (booking) {
        // Handle both old and new schema
        if (bookingsHeaders.includes('CustomerID')) {
          // New schema: CustomerID + CustomerType
          const customerId = booking[bookingsHeaders.indexOf('CustomerID')];
          const customerType = booking[bookingsHeaders.indexOf('CustomerType')];
          
          if (customerType === 'Member') {
            const usersSheet = getSheet('Users');
            const usersData = usersSheet.getDataRange().getValues();
            const usersHeaders = usersData.shift();
            const member = usersData.find(userRow => 
              userRow[usersHeaders.indexOf('UserID')] == customerId
            );
            if (member) {
              customerInfo = {
                name: member[usersHeaders.indexOf('Name')] || member[usersHeaders.indexOf('Email')],
                email: member[usersHeaders.indexOf('Email')],
                type: 'Member'
              };
            }
          } else if (customerType === 'Guest') {
            const guestsSheet = getSheet('Guests');
            const guestsData = guestsSheet.getDataRange().getValues();
            const guestsHeaders = guestsData.shift();
            const guest = guestsData.find(guestRow => 
              guestRow[guestsHeaders.indexOf('GuestID')] == customerId
            );
            if (guest) {
              customerInfo = {
                name: guest[guestsHeaders.indexOf('Name')],
                email: guest[guestsHeaders.indexOf('Email')],
                type: 'Guest'
              };
            }
          }
        } else {
          // Old schema: UserID only
          const userId = booking[bookingsHeaders.indexOf('UserID')];
          const usersSheet = getSheet('Users');
          const usersData = usersSheet.getDataRange().getValues();
          const usersHeaders = usersData.shift();
          const member = usersData.find(userRow => 
            userRow[usersHeaders.indexOf('UserID')] == userId
          );
          if (member) {
            customerInfo = {
              name: member[usersHeaders.indexOf('Name')] || member[usersHeaders.indexOf('Email')],
              email: member[usersHeaders.indexOf('Email')],
              type: 'Member'
            };
          }
        }
      }
      
      allSlots.push({
        timeSlotId: slotId,
        rangeTypeId: slotRange,
        date: slotDate,
        startTime: slotRow[slotsHeaders.indexOf('StartTime')],
        endTime: slotRow[slotsHeaders.indexOf('EndTime')],
        status: slotRow[slotsHeaders.indexOf('Status')],
        isBooked: !!booking,
        bookingId: booking ? booking[bookingsHeaders.indexOf('BookingID')] : null,
        laneCode: booking ? booking[bookingsHeaders.indexOf('LaneCode')] : null,
        customer: customerInfo
      });
    }
  });
  
  return { success: true, slots: allSlots };
}