// Code.gs - Main HTTP Router
function doGet(e) {
  return ContentService.createTextOutput('');
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const action = payload.action || '';
    let result;

    switch (action) {
      case 'login':
        result = auth_login(payload);
        break;
      case 'getAvailability':
        result = availability_get(payload);
        break;
      case 'book':
        result = booking_create(payload);
        break;
      case 'cancel':
        result = booking_cancel(payload);
        break;
      case 'addSlot':
        result = admin_addSlot(payload);
        break;
      case 'getMyBookings':
        result = booking_getMy(payload);
        break;
      case 'getAllBookings':
        result = admin_getAll(payload);
        break;
      case 'getAllSlots':
        result = admin_getAllSlots(payload);
        break;
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}