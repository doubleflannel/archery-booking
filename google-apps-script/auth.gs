// auth.gs - Authentication

function auth_login({ email, password }) {
  if (!email || !password) {
    return { success: false, message: 'Email and password required' };
  }

  const record = findRowByValue('Users', 'Email', email);
  if (!record) {
    return { success: false, message: 'User not found' };
  }

  const passCol = record.headers.indexOf('Password');
  const storedPassword = record.values[passCol];
  
  // Check if password is already hashed (starts with a hex pattern)
  const isHashed = /^[a-f0-9]{64}$/i.test(storedPassword);
  
  if (isHashed) {
    // Use hash verification
    if (!verifyPassword(password, storedPassword)) {
      return { success: false, message: 'Incorrect password' };
    }
  } else {
    // Legacy plain text check (for backward compatibility)
    if (storedPassword !== password) {
      return { success: false, message: 'Incorrect password' };
    }
  }

  const userId = record.values[record.headers.indexOf('UserID')];
  const role = record.values[record.headers.indexOf('Role')];
  
  // Handle missing Name column gracefully
  const nameIndex = record.headers.indexOf('Name');
  const name = nameIndex !== -1 ? record.values[nameIndex] : email.split('@')[0];

  return { 
    success: true, 
    userId, 
    role: role || 'user',
    name 
  };
}