// login.js - Login functionality

document.addEventListener('DOMContentLoaded', function() {
    // Redirect if already logged in
    if (Session.isValid()) {
        const session = Session.get();
        redirectUser(session.role);
        return;
    }
    
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        hideError();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        showLoading(loginBtn);
        
        try {
            const result = await apiCall('login', { email, password });
            
            if (result.success) {
                // Store session
                Session.set({
                    userId: result.userId,
                    role: result.role,
                    name: result.name,
                    email: email
                });
                
                // Redirect based on role
                redirectUser(result.role);
            } else {
                showError(result.message || 'Login failed');
            }
        } catch (error) {
            showError('Login failed. Please try again.');
        } finally {
            hideLoading(loginBtn, 'Sign In');
        }
    });
});

function redirectUser(role) {
    if (role === 'admin') {
        window.location.href = 'admin.html';
    } else {
        window.location.href = 'dashboard.html';
    }
}