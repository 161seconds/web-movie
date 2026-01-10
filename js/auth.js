// auth.js - Xử lý đăng nhập và đăng ký

// Tài khoản mặc định
const defaultAccounts = {
    admin: { username: 'admin', password: '123', role: 'admin', name: 'Admin' },
    user: { username: 'user', password: '123', role: 'user', name: 'User' }
};

// Hàm hiển thị thông báo
function showNotification(message, type = 'info') {
    alert(message);
}

// ========== XỬ LÝ ĐĂNG NHẬP ==========
const loginBtn = document.getElementById('loginBtn');
if (loginBtn) {
    loginBtn.addEventListener('click', handleLogin);
    
    // Enter để đăng nhập
    const passwordInput = document.getElementById('loginPassword');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleLogin();
            }
        });
    }
}

function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        showNotification('Vui lòng nhập đầy đủ thông tin!');
        return;
    }

    // Lấy danh sách tài khoản đã đăng ký
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers')) || {};
    const allAccounts = { ...defaultAccounts, ...registeredUsers };

    const account = allAccounts[username];

    if (!account || account.password !== password) {
        showNotification('Sai tên đăng nhập hoặc mật khẩu!');
        return;
    }

    // Lưu thông tin đăng nhập
    localStorage.setItem('currentUser', JSON.stringify(account));
    
    showNotification('Đăng nhập thành công!');
    
    // Chuyển về trang chủ sau 500ms
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 500);
}

// ========== XỬ LÝ ĐĂNG KÝ ==========
const registerBtn = document.getElementById('registerBtn');
if (registerBtn) {
    registerBtn.addEventListener('click', handleRegister);
    
    // Enter để đăng ký
    const confirmInput = document.getElementById('registerConfirm');
    if (confirmInput) {
        confirmInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleRegister();
            }
        });
    }
}

function handleRegister() {
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('registerConfirm').value;

    // Validate
    if (!username || !password || !confirm) {
        showNotification('Vui lòng điền đầy đủ thông tin!');
        return;
    }

    if (username.length < 3) {
        showNotification('Tên người dùng phải có ít nhất 3 ký tự!');
        return;
    }

    if (password.length < 3) {
        showNotification('Mật khẩu phải có ít nhất 3 ký tự!');
        return;
    }

    if (password !== confirm) {
        showNotification('Mật khẩu xác nhận không khớp!');
        return;
    }

    // Kiểm tra username đã tồn tại
    const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers')) || {};
    const allAccounts = { ...defaultAccounts, ...registeredUsers };

    if (allAccounts[username]) {
        showNotification('Tên đăng nhập đã tồn tại!');
        return;
    }

    // Tạo tài khoản mới
    const newUser = {
        username: username,
        password: password,
        role: 'user',
        name: username
    };

    registeredUsers[username] = newUser;
    localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));

    showNotification('Đăng ký thành công! Chuyển đến trang đăng nhập...');
    
    // Chuyển sang trang đăng nhập
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 500);
}

// ========== NÚT QUAY LẠI ==========
const backToHomeBtn = document.getElementById('backToHome');
if (backToHomeBtn) {
    backToHomeBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
}