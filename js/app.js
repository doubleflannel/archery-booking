// app.js - Shared API wrapper and session management

const API_URL = 'https://script.google.com/macros/s/AKfycbyJ4wMOJnYinjKRxBGVMl9D_zgUOonOIn0s7q5yn2T_AwK0n7Pv8fnV2zPg5W1wEk8XSQ/exec';

// Session management
const Session = {
  get() {
    const session = localStorage.getItem('archerySession');
    return session ? JSON.parse(session) : null;
  },
  
  set(data) {
    localStorage.setItem('archerySession', JSON.stringify(data));
  },
  
  clear() {
    localStorage.removeItem('archerySession');
  },
  
  isValid() {
    const session = this.get();
    return session && session.userId && session.role;
  },
  
  requireAuth() {
    if (!this.isValid()) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  }
};

// API wrapper
async function apiCall(action, data = {}) {
  const payload = { action, ...data };
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });
    
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    return { success: false, error: 'Network error' };
  }
}

// Utility functions
function showLoading(element) {
  element.disabled = true;
  element.textContent = 'Loading...';
}

function hideLoading(element, originalText) {
  element.disabled = false;
  element.textContent = originalText;
}

function showError(message) {
  const errorDiv = document.getElementById('error');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  } else {
    alert(message);
  }
}

function hideError() {
  const errorDiv = document.getElementById('error');
  if (errorDiv) {
    errorDiv.style.display = 'none';
  }
}

// Logout function
function logout() {
  Session.clear();
  window.location.href = 'index.html';
}

// Format date for display
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString();
}

// Format time for display
function formatTime(timeStr) {
  const time = new Date(timeStr);
  return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}