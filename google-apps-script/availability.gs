// availability.gs - View available slots

function availability_get({ rangeTypeId, date }) {
  const sheet = getSheet('TimeSlots');
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  
  const iRange = headers.indexOf('RangeTypeID');
  const iDate = headers.indexOf('Date');
  const iStatus = headers.indexOf('Status');
  const iSlot = headers.indexOf('TimeSlotID');
  const iStart = headers.indexOf('StartTime');
  const iEnd = headers.indexOf('EndTime');
  
  const results = [];
  
  data.forEach(row => {
    const matchesRange = !rangeTypeId || row[iRange] == rangeTypeId;
    
    // Robust date matching
    let matchesDate = !date; // If no date filter, match all
    if (date && row[iDate]) {
      try {
        // Handle multiple date formats
        const inputDate = new Date(date);
        const sheetDate = new Date(row[iDate]);
        
        // Compare YYYY-MM-DD format (most reliable)
        const inputDateStr = inputDate.toISOString().split('T')[0];
        const sheetDateStr = sheetDate.toISOString().split('T')[0];
        
        matchesDate = inputDateStr === sheetDateStr;
        
        // Debug logging
        console.log(`Date comparison: input="${date}" -> "${inputDateStr}", sheet="${row[iDate]}" -> "${sheetDateStr}", match=${matchesDate}`);
      } catch (e) {
        console.log(`Date parsing error: input="${date}", sheet="${row[iDate]}", error=${e.message}`);
        matchesDate = false;
      }
    }
    
    const isAvailable = row[iStatus] == 'Available';
    
    // Debug logging
    console.log(`Row ${row[iSlot]}: Range=${row[iRange]}, Date=${row[iDate]}, Status=${row[iStatus]}`);
    console.log(`Matches: Range=${matchesRange}, Date=${matchesDate}, Available=${isAvailable}`);
    
    if (matchesRange && matchesDate && isAvailable) {
      results.push({
        timeSlotId: row[iSlot],
        rangeTypeId: row[iRange],
        date: row[iDate],
        startTime: row[iStart],
        endTime: row[iEnd]
      });
    }
  });
  
  console.log(`Found ${results.length} available slots for range=${rangeTypeId}, date=${date}`);
  return { success: true, slots: results };
}