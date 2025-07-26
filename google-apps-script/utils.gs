// utils.gs - Sheet helpers and utilities

function getSheet(name) {
  return SpreadsheetApp.getActive().getSheetByName(name);
}

function findRowByValue(sheetName, columnName, value) {
  const sheet = getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colIdx = headers.indexOf(columnName) + 1;
  
  if (colIdx === 0) return null; // Column not found
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return null; // No data rows, only headers
  
  const data = sheet.getRange(2, colIdx, lastRow - 1, 1).getValues();
  
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] == value) {
      const row = i + 2;
      const fullRow = sheet.getRange(row, 1, 1, headers.length).getValues()[0];
      return { row, values: fullRow, headers };
    }
  }
  return null;
}

function appendRowToSheet(sheetName, obj) {
  const sheet = getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => obj[h] || '');
  sheet.appendRow(row);
}

function updateRowInSheet(sheetName, row, obj) {
  const sheet = getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  headers.forEach((h, i) => {
    if (obj.hasOwnProperty(h)) {
      sheet.getRange(row, i + 1).setValue(obj[h]);
    }
  });
}

function withLock(fn) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function nextId(counterName) {
  const sheet = getSheet('Counters');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === counterName) {
      const currentValue = data[i][1];
      sheet.getRange(i + 1, 2).setValue(currentValue + 1);
      return currentValue + 1;
    }
  }
  
  // Auto-create missing counter
  console.log(`Counter ${counterName} not found, creating with initial value 1`);
  appendRowToSheet('Counters', {
    CounterName: counterName,
    Value: 1
  });
  return 1;
}

function initializeRequiredCounters() {
  const requiredCounters = [
    'UsersNextID',
    'BookingsNextID', 
    'GuestsNextID',
    'TimeSlotsNextID'
  ];
  
  const sheet = getSheet('Counters');
  const data = sheet.getDataRange().getValues();
  const existingCounters = data.slice(1).map(row => row[0]); // Skip header
  
  const results = [];
  
  requiredCounters.forEach(counterName => {
    if (!existingCounters.includes(counterName)) {
      // Determine appropriate starting value
      let startValue = 1;
      
      // For existing data, start from max existing ID + 1
      try {
        if (counterName === 'UsersNextID') {
          const users = getSheet('Users').getDataRange().getValues().slice(1);
          startValue = users.length > 0 ? Math.max(...users.map(row => row[0] || 0)) + 1 : 1;
        } else if (counterName === 'BookingsNextID') {
          const bookings = getSheet('Bookings').getDataRange().getValues().slice(1);
          startValue = bookings.length > 0 ? Math.max(...bookings.map(row => row[0] || 0)) + 1 : 1;
        } else if (counterName === 'GuestsNextID') {
          const guests = getSheet('Guests').getDataRange().getValues().slice(1);
          startValue = guests.length > 0 ? Math.max(...guests.map(row => row[0] || 0)) + 1 : 1;
        } else if (counterName === 'TimeSlotsNextID') {
          const timeSlots = getSheet('TimeSlots').getDataRange().getValues().slice(1);
          startValue = timeSlots.length > 0 ? Math.max(...timeSlots.map(row => row[0] || 0)) + 1 : 1;
        }
      } catch (e) {
        console.log(`Could not determine start value for ${counterName}, using 1`);
      }
      
      appendRowToSheet('Counters', {
        CounterName: counterName,
        Value: startValue
      });
      
      results.push(`Created counter ${counterName} with value ${startValue}`);
    } else {
      results.push(`Counter ${counterName} already exists`);
    }
  });
  
  return results;
}

function generateLaneCode() {
  // Generate 6-digit numeric code
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isLaneCodeUnique(laneCode) {
  // Check if lane code is already in use for active bookings
  const sheet = getSheet('Bookings');
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  
  const laneCodeIndex = headers.indexOf('LaneCode');
  const statusIndex = headers.indexOf('Status');
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row[statusIndex] === 'Active' && row[laneCodeIndex] === laneCode) {
      return false;
    }
  }
  return true;
}

function generateUniqueLaneCode() {
  let laneCode;
  let attempts = 0;
  
  do {
    laneCode = generateLaneCode();
    attempts++;
    
    // Prevent infinite loop
    if (attempts > 50) {
      throw new Error('Unable to generate unique lane code');
    }
  } while (!isLaneCodeUnique(laneCode));
  
  return laneCode;
}

function hashPassword(password) {
  // Use SHA-256 to hash the password
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  return digest.map(function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
}

function verifyPassword(plainPassword, hashedPassword) {
  return hashPassword(plainPassword) === hashedPassword;
}

// Helper function to hash all existing plain text passwords
function hashExistingPasswords() {
  const sheet = getSheet('Users');
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  
  const passwordIndex = headers.indexOf('Password');
  if (passwordIndex === -1) {
    throw new Error('Password column not found');
  }
  
  let updatedCount = 0;
  
  for (let i = 0; i < data.length; i++) {
    const password = data[i][passwordIndex];
    
    // Check if password is already hashed
    const isHashed = /^[a-f0-9]{64}$/i.test(password);
    
    if (!isHashed && password) {
      // Hash the plain text password
      const hashedPassword = hashPassword(password);
      
      // Update the sheet
      sheet.getRange(i + 2, passwordIndex + 1).setValue(hashedPassword);
      updatedCount++;
      
      console.log(`Updated password for row ${i + 2}`);
    }
  }
  
  console.log(`Hashed ${updatedCount} passwords`);
  return `Successfully hashed ${updatedCount} passwords`;
}

// Guest tracking functions
function findOrCreateGuest(email, name) {
  // First, try to find existing guest by email
  const existingGuest = findRowByValue('Guests', 'Email', email);
  
  if (existingGuest) {
    // Update last booking time and increment total bookings
    const guestId = existingGuest.values[existingGuest.headers.indexOf('GuestID')];
    const totalBookings = existingGuest.values[existingGuest.headers.indexOf('TotalBookings')] || 0;
    
    updateRowInSheet('Guests', existingGuest.row, {
      Name: name, // Update name in case it changed
      TotalBookings: totalBookings + 1,
      LastBooking: new Date(),
      Status: 'Active'
    });
    
    return guestId;
  } else {
    // Create new guest record
    const guestId = nextId('GuestsNextID');
    appendRowToSheet('Guests', {
      GuestID: guestId,
      Email: email,
      Name: name,
      FirstBooking: new Date(),
      TotalBookings: 1,
      LastBooking: new Date(),
      Status: 'Active'
    });
    
    return guestId;
  }
}

function getGuestInfo(guestId) {
  const guest = findRowByValue('Guests', 'GuestID', guestId);
  if (!guest) return null;
  
  return {
    guestId: guest.values[guest.headers.indexOf('GuestID')],
    email: guest.values[guest.headers.indexOf('Email')],
    name: guest.values[guest.headers.indexOf('Name')],
    firstBooking: guest.values[guest.headers.indexOf('FirstBooking')],
    totalBookings: guest.values[guest.headers.indexOf('TotalBookings')],
    lastBooking: guest.values[guest.headers.indexOf('LastBooking')],
    status: guest.values[guest.headers.indexOf('Status')]
  };
}

// Guest analytics functions
function getGuestAnalytics() {
  const sheet = getSheet('Guests');
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  
  let totalGuests = 0;
  let returningGuests = 0;
  let totalGuestBookings = 0;
  
  data.forEach(row => {
    const totalBookings = row[headers.indexOf('TotalBookings')] || 0;
    totalGuests++;
    totalGuestBookings += totalBookings;
    
    if (totalBookings > 1) {
      returningGuests++;
    }
  });
  
  return {
    totalGuests,
    returningGuests,
    returningGuestRate: Math.round((returningGuests / totalGuests) * 100),
    totalGuestBookings,
    avgBookingsPerGuest: Math.round((totalGuestBookings / totalGuests) * 10) / 10
  };
}

function testSheets() {
  console.log('Testing sheet structures...');
  
  try {
    console.log('Bookings headers:', getSheet('Bookings').getRange(1, 1, 1, 7).getValues()[0]);
  } catch (e) {
    console.log('Bookings sheet error:', e.message);
  }
  
  try {
    console.log('Guests headers:', getSheet('Guests').getRange(1, 1, 1, 7).getValues()[0]);
  } catch (e) {
    console.log('Guests sheet error:', e.message);
  }
  
  try {
    console.log('Counters data:', getSheet('Counters').getDataRange().getValues());
  } catch (e) {
    console.log('Counters sheet error:', e.message);
  }
  
  try {
    console.log('TimeSlots headers:', getSheet('TimeSlots').getRange(1, 1, 1, 6).getValues()[0]);
  } catch (e) {
    console.log('TimeSlots sheet error:', e.message);
  }
}

function debugGuestCreation() {
  console.log('Testing guest creation...');
  
  try {
    const guestId = findOrCreateGuest('debug@test.com', 'Debug User');
    console.log('Created guest ID:', guestId);
    
    const guestInfo = getGuestInfo(guestId);
    console.log('Retrieved guest info:', guestInfo);
  } catch (e) {
    console.log('Guest creation error:', e.message);
    console.log('Stack trace:', e.stack);
  }
}

function debugFindRowByValue() {
  console.log('Testing findRowByValue...');
  
  try {
    const sheet = getSheet('Guests');
    console.log('Guests sheet found');
    console.log('Last row:', sheet.getLastRow());
    console.log('Last column:', sheet.getLastColumn());
    
    if (sheet.getLastRow() > 0) {
      console.log('Headers:', sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
    } else {
      console.log('Sheet is completely empty - no rows at all');
    }
  } catch (e) {
    console.log('Sheet access error:', e.message);
  }
}

// Version tracking and system health check
function getSystemHealth() {
  const timestamp = new Date();
  const health = {
    version: 'unified-dashboard-v2.0',
    timestamp: timestamp.toISOString(),
    deployment: timestamp.getTime(),
    sheets: {},
    counters: {},
    functions: []
  };
  
  // Check all sheets
  const expectedSheets = ['Users', 'TimeSlots', 'Bookings', 'Guests', 'Counters'];
  expectedSheets.forEach(sheetName => {
    try {
      const sheet = getSheet(sheetName);
      health.sheets[sheetName] = {
        exists: true,
        headers: sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0],
        rowCount: sheet.getLastRow() - 1, // Exclude header
        lastModified: sheet.getLastModified().toISOString()
      };
    } catch (e) {
      health.sheets[sheetName] = { exists: false, error: e.message };
    }
  });
  
  // Check counters
  try {
    const countersSheet = getSheet('Counters');
    const data = countersSheet.getDataRange().getValues();
    const headers = data.shift();
    data.forEach(row => {
      health.counters[row[0]] = row[1];
    });
  } catch (e) {
    health.counters = { error: e.message };
  }
  
  // List available functions
  health.functions = [
    'booking_create', 'booking_createGuest', 'booking_cancel', 'booking_cancelGuest',
    'booking_getMy', 'auth_login', 'availability_get', 'admin_addSlot', 'admin_getAll'
  ];
  
  return health;
}