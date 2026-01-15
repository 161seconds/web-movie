// ========== API Configuration ==========
import {
    API_KEY,
    API_BASE,
    IMG_BASE
} from './api.js';

// ========== Data ==========
const genres = [
    { id: 28, name: 'Hành động' },
    { id: 12, name: 'Phiêu lưu' },
    { id: 16, name: 'Hoạt hình' },
    { id: 35, name: 'Hài' },
    { id: 80, name: 'Hình sự' },
    { id: 18, name: 'Chính kịch' },
    { id: 27, name: 'Kinh dị' },
    { id: 10749, name: 'Lãng mạn' },
    { id: 878, name: 'Khoa học viễn tưởng' },
    { id: 53, name: 'Gây cấn' }
];

const concessions = [
    { id: 1, name: 'Bắp rang bơ (L)', price: 60000 },
    { id: 2, name: 'Bắp rang bơ (M)', price: 45000 },
    { id: 3, name: 'Coca Cola (L)', price: 35000 },
    { id: 4, name: 'Coca Cola (M)', price: 25000 },
    { id: 5, name: 'Combo 1 (Bắp L + Nước L)', price: 85000 },
    { id: 6, name: 'Combo 2 (2 Bắp M + 2 Nước M)', price: 120000 }
];

const vouchers = [
    {
        code: 'MOVIE50K',
        type: 'fixed',          
        value: 50000,
        minOrder: 200000,
        applyTo: 'all',
        desc: 'Giảm 50k cho đơn từ 200k'
    },
    {
        code: 'FREEPOP',
        type: 'gift',
        gift: 'combo1',        
        applyTo: 'food',
        desc: 'Tặng bắp nước combo 1'
    },
    {
        code: 'WEEK30',
        type: 'percent',
        value: 30,
        applyTo: 'all',
        desc: 'Giảm 30% vào các ngày trong tuần'
    }
];

// User accounts (trong thực tế sẽ lưu trong database)
const accounts = {
    admin: { username: 'admin', password: '123', role: 'admin', name: 'Admin' },
    user: { username: 'user', password: '123', role: 'user', name: 'User' }
};

// ========== State Management ==========
let currentUser = null;
let currentGenre = null;
let selectedSeats = [];
let concessionCart = {};
let orders = [];
let orderId = 1;
let currentMovieTitle = '';
let baseTotal = 0;
let finalTotal = 0;
let appliedVoucher = null;

document.addEventListener('DOMContentLoaded', () => {
    // ===== INIT APP =====
    checkLoginStatus();
    initGenres();
    loadMovies();

    // ===== ALERT EVENTS =====
    const alertOk = document.querySelector('#alertOk');
    const alertClose = document.querySelector('#alertClose');
    const alertOverlay = document.querySelector('#alertOverlay');

    alertOk?.addEventListener('click', handleAlertOk);
    alertClose?.addEventListener('click', closeAlert);

    alertOverlay?.addEventListener('click', (e) => {
        if (e.target.id === 'alertOverlay') {
            closeAlert();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAlert();
        }
    });

    // ===== LOGIN REDIRECT =====
    const loginRedirect = document.querySelector('#loginRedirect');
    loginRedirect?.addEventListener('click', () => {
        window.location.href = 'login.html';
    });
});

document.querySelector('#applyVoucherBtn')
    ?.addEventListener('click', () => {
        const baseTotal = selectedSeats.length * 75000;
        const finalTotal = applyVoucher(baseTotal);

        document.querySelector('#totalPrice').textContent =
            finalTotal.toLocaleString();
    });

// ========== Authentication ==========
function handleBookingClick(movieId, movieTitle) {
    if (!isLoggedIn()) {
        localStorage.setItem(
            'pendingBooking',
            JSON.stringify({ movieId, movieTitle })
        );

        showAlert(
            "Cần đăng nhập",
            "warning",
            {
                onOk: () => showLogin()
            }
        );
        return;
    }

    showBooking(movieId, movieTitle);
}
function isLoggedIn() {
    return currentUser !== null;
}

function register() {
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('registerConfirm').value;

    if (!username || !password || !confirm) {
        showAlert('Vui lòng điền đầy đủ thông tin!', 'warning');
        return;
    }

    if (username.length < 3) {
        showAlert('Tên người dùng phải có ít nhất 3 ký tự!', 'warning');
        return;
    }

    if (password.length < 3) {
        showAlert('Mật khẩu phải có ít nhất 3 ký tự!', 'warning');
        return;
    }

    if (password !== confirm) {
        showAlert('Mật khẩu xác nhận không khớp!', 'error');
        return;
    }

    // Kiểm tra username đã tồn tại
    if (accounts[username] || registeredUsers[username]) {
        showAlert('Tên đăng nhập đã tồn tại!', 'error');
        return;
    }

    // Lưu user mới
    const newUser = {
        username: username,
        password: password,
        role: 'user',
        name: username
    };

    registeredUsers[username] = newUser;
    localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));

    showAlert('Đăng ký thành công! Vui lòng đăng nhập.', 'success', {
        onOk: () => showLogin()
    });

    // Reset form
    document.getElementById('registerUsername').value = '';
    document.getElementById('registerPassword').value = '';
    document.getElementById('registerConfirm').value = '';
}

function login() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        showAlert('Vui lòng nhập đầy đủ thông tin!', 'warning');
        return;
    }

    // Merge accounts mặc định và registered users
    const allAccounts = { ...accounts, ...registeredUsers };
    const account = allAccounts[username];

    if (!account || account.password !== password) {
        showAlert('Sai tên đăng nhập hoặc mật khẩu!', 'error');
        return;
    }

    currentUser = account;
    localStorage.setItem('currentUser', JSON.stringify(account));

    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('registerScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';

    showAlert('Đăng nhập thành công!', 'success');

    updateNavButtons();

    // Kiểm tra pending booking
    const pending = localStorage.getItem('pendingBooking');
    if (pending) {
        const { movieId } = JSON.parse(pending);
        localStorage.removeItem('pendingBooking');
        setTimeout(() => showMovieDetail(movieId), 500);
    }
}

function checkLoginStatus() {
    const savedUser = localStorage.getItem('currentUser');

    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    } else {
        currentUser = null;
    }

    updateNavButtons();
}


function showLogin() {
    document.querySelector('#loginScreen').style.display = 'flex';
    document.querySelector('#registerScreen').style.display = 'none';
}

function showRegister() {
    document.querySelector('#loginScreen').style.display = 'none';
    document.querySelector('#registerScreen').style.display = 'flex';
}

function closeAuthModal() {
    document.querySelector('#loginScreen').style.display = 'none';
    document.querySelector('#registerScreen').style.display = 'none';
}


function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null;

    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';

    updateNavButtons();
    showAlert('Đã đăng xuất thành công!', 'success');
}


function checkLogin() {
    const savedUser = localStorage.getItem('currentUser');

    // Load registered users
    registeredUsers = JSON.parse(localStorage.getItem('registeredUsers')) || {};

    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    } else {
        currentUser = null;
    }

    updateNavButtons();
    initGenres();
    loadMovies();
}

// ========== Initialize App ==========
function initApp() {
    document.getElementById('userDisplay').innerHTML = `<i class="fa-solid fa-user"></i> ${currentUser.name}`;

    if (currentUser.role === 'admin') {
        document.getElementById('adminBtn').style.display = 'block';
    } else {
        document.getElementById('adminBtn').style.display = 'none';
    }

    initGenres();
    loadMovies();
}

// ========== Genres ==========
function initGenres() {
    const genreFilter = document.getElementById('genreFilter');
    genreFilter.innerHTML = `
        <button class="genre-btn active" onclick="window.filterByGenre(null, this)">Tất cả</button>
        ${genres.map(g => `
            <button class="genre-btn" onclick="window.filterByGenre(${g.id}, this)">${g.name}</button>
        `).join('')}
    `;
}

function filterByGenre(genreId, el) {
    currentGenre = genreId;

    document.querySelectorAll('.genre-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    if (el) {
        el.classList.add('active');
    }

    loadMovies(genreId);
}

// ========== Movies ==========
async function loadMovies(genreId = null) {
    const moviesGrid = document.getElementById('moviesGrid');
    moviesGrid.innerHTML = `
    <div class="loading">
        <i class="fa-solid fa-hourglass fa-spin"></i>
        <p class="loading-text">Đang tải phim</p>
    </div>
`;
    try {
        let url = `${API_BASE}/movie/popular?api_key=${API_KEY}&language=vi-VN&page=1`;
        if (genreId) {
            url = `${API_BASE}/discover/movie?api_key=${API_KEY}&language=vi-VN&with_genres=${genreId}&page=1`;
        }

        const res = await fetch(url);
        const data = await res.json();
        displayMovies(data.results);
    } catch (err) {
        moviesGrid.innerHTML = `
    <div class="loading">
        <i class="fa-solid fa-hourglass fa-spin"></i>
        <p class="loading-text">Không thể tải phim. Vui lòng thử lại.</p>
    </div>
`;

    }
}

function displayMovies(movies) {
    const moviesGrid = document.getElementById('moviesGrid');

    if (movies.length === 0) {
        moviesGrid.innerHTML = '<div class="loading"><i class="fa-solid fa-x"></i>Không tìm thấy phim nào.</div>';
        return;
    }

    moviesGrid.innerHTML = movies.map(movie => `
        <div class="movie-card" onclick="window.showMovieDetail(${movie.id})">
        <div class="movie-card-img"> 
            <img src="${movie.poster_path ? IMG_BASE + movie.poster_path : 'https://via.placeholder.com/250x375?text=No+Image'}" 
                 alt="${movie.title}" class="movie-poster">
        </div>         
            <div class="movie-info">
                <div class="movie-title">${movie.title}</div>
                <div class="movie-rating">
                    <i class="fa-solid fa-star"></i> ${movie.vote_average.toFixed(1)}
                </div>
            </div>
        </div>
    `).join('');
}

async function searchMovies() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) {
        showAlert('Vui lòng nhập từ khóa tìm kiếm!');
        return;
    }

    const moviesGrid = document.getElementById('moviesGrid');
    moviesGrid.innerHTML = '<div class="loading"><i class="fa-solid fa-magnifying-glass"></i> Đang tìm kiếm</div>';

    try {
        const res = await fetch(`${API_BASE}/search/movie?api_key=${API_KEY}&language=vi-VN&query=${encodeURIComponent(query)}`);
        const data = await res.json();
        displayMovies(data.results);
    } catch (err) {
        moviesGrid.innerHTML = '<div class="loading"><i class="fa-solid fa-x"></i> Không thể tìm kiếm. Vui lòng thử lại.</div>';
    }
}

async function showMovieDetail(movieId) {
    const modal = document.getElementById('movieModal');
    const content = document.getElementById('modalContent');

    modal.classList.add('active');
    content.innerHTML = '<div class="loading"><i class="fa-solid fa-hourglass"></i> Đang tải thông tin</div>';

    try {
        const [movieRes, videosRes] = await Promise.all([
            fetch(`${API_BASE}/movie/${movieId}?api_key=${API_KEY}&language=vi-VN`),
            fetch(`${API_BASE}/movie/${movieId}/videos?api_key=${API_KEY}&language=vi-VN`)
        ]);

        const movie = await movieRes.json();
        const videos = await videosRes.json();
        const trailer = videos.results.find(v => v.type === 'Trailer') || videos.results[0];

        const canBook = isLoggedIn();

        content.innerHTML = `
            <button class="close-btn">×</button>
            <div class="movie-detail-header">
                <img src="${movie.poster_path ? IMG_BASE + movie.poster_path : 'https://via.placeholder.com/300x450'}" 
                     alt="${movie.title}" class="movie-detail-poster">
                <div class="movie-detail-info">
                    <h2>${movie.title}</h2>
                    <p><strong><i class="fa-solid fa-star"></i> Đánh giá:</strong> ${movie.vote_average.toFixed(1)}/10</p>
                    <p><strong><i class="fa-solid fa-calendar"></i> Ngày phát hành:</strong> ${movie.release_date}</p>
                    <p><strong><i class="fa-solid fa-stopwatch"></i> Thời lượng:</strong> ${movie.runtime} phút</p>
                    <p><strong><i class="fa-solid fa-masks-theater"></i> Thể loại:</strong> ${movie.genres.map(g => g.name).join(', ')}</p>
                    <p><strong>Mô tả:</strong></p>
                    <p style="text-align: justify;">${movie.overview || 'Chưa có mô tả'}</p>
                    <div class="action-buttons">
                        <button class="btn btn-primary" id="bookingBtn" ${!canBook ? 'disabled' : ''}>
                            <i class="fa-solid fa-ticket"></i> Đặt vé
                            ${!canBook ? ' (Cần đăng nhập)' : ''}
                        </button>
                        <button class="btn btn-secondary" id="concessionBtn" ${!canBook ? 'disabled' : ''}>
                            <i class="fa-solid fa-popcorn"></i> Đặt bắp nước
                            ${!canBook ? ' (Cần đăng nhập)' : ''}
                        </button>
                    </div>
                </div>
            </div>
            ${trailer ? `
                <div class="trailer-container">
                    <h3><i class="fa-solid fa-clapperboard"></i> Trailer</h3>
                    <iframe src="https://www.youtube.com/embed/${trailer.key}" allowfullscreen></iframe>
                </div>
            ` : ''}
        `;

        // Add event listeners
        const closeBtn = content.querySelector('.close-btn');
        const bookingBtn = content.querySelector('#bookingBtn');
        const concessionBtn = content.querySelector('#concessionBtn');

        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }

        if (bookingBtn) {
            bookingBtn.addEventListener('click', () => {
                if (canBook) {
                    showBooking(movieId, movie.title);
                } else {
                    promptLogin(movieId, movie.title);
                }
            });
        }

        if (concessionBtn) {
            concessionBtn.addEventListener('click', () => {
                if (canBook) {
                    showConcession(movieId, movie.title);
                } else {
                    promptLogin(movieId, movie.title);
                }
            });
        }

    } catch (err) {
        content.innerHTML = '<div class="loading"><i class="fa-solid fa-x"></i> Không thể tải thông tin phim.</div>';
    }
}

function promptLogin(movieId, movieTitle) {
    localStorage.setItem('pendingBooking', JSON.stringify({ movieId, movieTitle }));
    closeModal();
    showAlert(
        'Vui lòng đăng nhập để đặt vé phim!',
        'warning',
        {
            onOk: () => {
                window.location.href = 'login.html';
            }
        }
    );
}

function closeModal() {
    document.getElementById('movieModal').classList.remove('active');
}

function showHome() {
    document.getElementById('searchInput').value = '';
    loadMovies(currentGenre);
}

// Cập nhật các nút navigation dựa trên trạng thái đăng nhập
function updateNavButtons() {
    const navLinks = document.getElementById('navLinks');

    if (!navLinks) return;

    if (currentUser) {
        // Đã đăng nhập
        navLinks.innerHTML = `
            <button class="btn">
                <i class="fa-solid fa-home"></i> Trang chủ
            </button>
            <button class="btn">
                <i class="fa-solid fa-ticket"></i> Khuyến mãi
            </button>
            <button class="btn">
                <i class="fa-solid fa-shopping-cart"></i> Đơn hàng
            </button>
            ${currentUser.role === 'admin' ? `
                <button class="btn">
                    <i class="fa-solid fa-cog"></i> Quản lý
                </button>
            ` : ''}
            <div style="display: flex; align-items: center; gap: 1rem; margin-left: 1rem; padding-left: 1rem; border-left: 2px solid var(--cold-border)">
                <span style="color: var(--cold-border); font-weight: bold;">
                    <i class="fa-solid fa-user"></i> ${currentUser.name}
                </span>
                <button class="btn btn-secondary" id="logoutBtn">
                    <i class="fa-solid fa-right-from-bracket"></i> Đăng xuất
                </button>
            </div>
        `;

        // Add event cho nút đăng xuất
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }

        // Add events cho các nút khác
        const buttons = navLinks.querySelectorAll('button');
        buttons.forEach((btn, index) => {
            if (index === 0) btn.addEventListener('click', () => window.showHome());
            if (index === 1) btn.addEventListener('click', () => window.showVouchers());
            if (index === 2) btn.addEventListener('click', () => window.showOrders());
            if (currentUser.role === 'admin' && index === 3) {
                btn.addEventListener('click', () => window.showAdmin());
            }
        });

    } else {
        // Chưa đăng nhập
        navLinks.innerHTML = `
            <button class="btn">
                <i class="fa-solid fa-home"></i> Trang chủ
            </button>
            <button class="btn btn-primary" id="loginRedirect">
                <i class="fa-solid fa-right-to-bracket"></i> Đăng nhập
            </button>
            <button class="btn btn-secondary" id="registerRedirect">
                <i class="fa-solid fa-user-plus"></i> Đăng ký
            </button>
        `;

        // Add events
        const homeBtn = navLinks.querySelector('button:nth-child(1)');
        const voucherBtn = navLinks.querySelector('button:nth-child(2)');
        const loginBtn = document.getElementById('loginRedirect');
        const registerBtn = document.getElementById('registerRedirect');

        if (homeBtn) homeBtn.addEventListener('click', () => window.showHome());
        if (voucherBtn) voucherBtn.addEventListener('click', () => window.showVouchers());

        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                window.location.href = 'login.html';
            });
        }

        if (registerBtn) {
            registerBtn.addEventListener('click', () => {
                window.location.href = 'register.html';
            });
        }
    }
}

function handleLogout() {
    showAlert(
        'Bạn có chắc chắn muốn đăng xuất?',
        'warning',
        {
            onOk: () => {
                localStorage.removeItem('currentUser');
                currentUser = null;
                updateNavButtons();
                showAlert('Đã đăng xuất thành công!', 'success');
            }
        }
    );
}

// ========== Booking ==========
function showBooking(movieId, movieTitle) {
    currentMovieTitle = movieTitle;

    const content = document.getElementById('modalContent');
    selectedSeats = [];

    content.innerHTML = `
        <button class="close-btn" onclick="window.closeModal()">×</button>

        <h2><i class="fa-solid fa-ticket"></i> Đặt vé: ${movieTitle}</h2>

        <div class="booking-form">

            <!-- chọn rạp -->
            <div class="form-group">
                <label><i class="fa-solid fa-building"></i> Chọn rạp:</label>
                <select id="cinema" onchange="reloadBookedSeats(currentMovieTitle)">
                    <option>BHD Star Vincom Lê Văn Việt</option>
                    <option>Cinestar Sinh Viên</option>
                    <option>Lotte Cinema - Cantavil</option>
                    <option>Galaxy Nguyễn Du</option>
                </select>
            </div>

            <!-- ngày -->
            <div class="form-group">
                <label><i class="fa-solid fa-calendar"></i> Chọn ngày:</label>
                <input type="date" id="date"
                    min="${new Date().toISOString().split('T')[0]}"
                    onchange="reloadBookedSeats(currentMovieTitle)">
            </div>

            <!-- suất chiếu -->
            <div class="form-group">
                <label><i class="fa-solid fa-clock"></i> Chọn suất chiếu:</label>
                <select id="showtime" onchange="reloadBookedSeats(currentMovieTitle)">
                    <option>09:00</option>
                    <option>11:30</option>
                    <option>14:00</option>
                    <option>16:30</option>
                    <option>19:00</option>
                    <option>21:30</option>
                </select>
            </div>

            <!-- ghế -->
            <div class="form-group">
                <label>
                    <i class="fa-solid fa-couch"></i>
                    Chọn ghế (<span id="seatCount">0</span> ghế):
                </label>

                <div style="text-align:center;margin:1rem 0;padding:1rem;background:var(--cold-border);border-radius:10px;font-weight:bold">
                    <i class="fa-solid fa-display"></i> MÀN HÌNH
                </div>

                <div class="seat-selection" id="seatSelection"></div>
            </div>

            <!-- voucher -->
            <div class="form-group">
                <label><i class="fa-solid fa-tag"></i> Voucher:</label>
                <div style="display:flex; gap:0.5rem">
                    <input type="text" id="voucherInput" placeholder="Nhập mã voucher">
                    <button class="btn btn-secondary" onclick="applyVoucher()">Áp dụng</button>
                </div>
                <small id="voucherMsg" style="color:#7dd3fc"></small>
            </div>

            <!-- tổng tiền -->
            <div style="margin-top:1.5rem;padding:1rem;background:var(--cold-main);border-radius:10px;font-size:1.3rem;font-weight:bold;text-align:center">
                <i class="fa-solid fa-wallet"></i>
                Tổng tiền: <span id="totalPrice">0</span> VNĐ
            </div>

            <button class="btn btn-primary" style="width:100%;margin-top:1rem"
                onclick="window.confirmBooking('${movieTitle.replace(/'/g, "\\'")}')">
                <i class="fa-solid fa-check"></i> Xác nhận đặt vé
            </button>
        </div>
    `;

    generateSeats();
}

function applyVoucher() {
    const code = document.getElementById('voucherInput').value.trim().toUpperCase();
    const msg = document.getElementById('voucherMsg');

    const voucher = vouchers.find(v => v.code === code);

    if (!voucher) {
        msg.textContent = 'Voucher không hợp lệ';
        return;
    }

    let total = baseTotal;

    if (voucher.type === 'fixed') {
        if (voucher.minOrder && total < voucher.minOrder) {
            msg.textContent = `Đơn tối thiểu ${voucher.minOrder.toLocaleString()} VNĐ`;
            return;
        }
        total -= voucher.value;
    }

    if (voucher.type === 'percent') {
        total -= total * voucher.value / 100;
    }

    if (voucher.type === 'gift') {
        msg.textContent = `${voucher.desc}`;
        appliedVoucher = voucher;
        return;
    }

    total = Math.max(0, Math.floor(total));
    finalTotal = total;
    appliedVoucher = voucher;

    document.getElementById('totalPrice').textContent = total.toLocaleString();
    msg.textContent = `Áp dụng: ${voucher.desc}`;
}

function bookTicket(movieId, movieTitle) {
    if (!isLoggedIn()) {
        localStorage.setItem('pendingBooking', JSON.stringify({ movieId, movieTitle }));
        showAlert("warning", "Cần đăng nhập", "Vui lòng đăng nhập để đặt vé!", () => showLogin(true));
        return;
    }
    openSeatSelectionModal(movieId, movieTitle);
}

function generateSeats() {
    const seatSelection = document.getElementById('seatSelection');
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const seats = [];

    rows.forEach(row => {
        for (let i = 1; i <= 10; i++) {
            const seatId = `${row}${i}`;
            const isTaken = false; // Mặc định tất cả ghế đều trống, sẽ cập nhật sau
            seats.push(`
                <div class="seat ${isTaken ? 'taken' : ''}" 
                     data-seat="${seatId}" 
                     onclick="window.toggleSeat('${seatId}')"
                     title="Ghế ${seatId}">
                </div>
            `);
        }
    });

    seatSelection.innerHTML = seats.join('');
}

async function loadBookedSeats(movie, cinema, date, showtime) {
    const res = await fetch('./bookedChair.json');
    const data = await res.json();

    const booked = data.bookedChairs.filter(item =>
        item.movie === movie &&
        item.cinema === cinema &&
        item.date === date &&
        item.showtime === showtime
    );

    booked.forEach(item => {
        item.seats.forEach(seat => {
            const el = document.querySelector(`.seat[data-seat="${seat}"]`);
            if (el) el.classList.add('booked');
        });
    });
}

function reloadBookedSeats(movieTitle) {
    const cinema = document.getElementById('cinema').value;
    const date = document.getElementById('date').value;
    const showtime = document.getElementById('showtime').value;

    if (!cinema || !date || !showtime) return;

    document.querySelectorAll('.seat').forEach(seat => {
        seat.classList.remove('booked');
    });

    loadBookedSeats(movieTitle, cinema, date, showtime);
}

window.reloadBookedSeats = reloadBookedSeats;


function toggleSeat(seatId) {
    const seat = document.querySelector(`[data-seat="${seatId}"]`);
    if (seat.classList.contains('taken')) return;

    if (seat.classList.contains('selected')) {
        seat.classList.remove('selected');
        selectedSeats = selectedSeats.filter(s => s !== seatId);
    } else {
        seat.classList.add('selected');
        selectedSeats.push(seatId);
    }

    document.getElementById('seatCount').textContent = selectedSeats.length;
    updateTotalPrice();
}

function updateTotalPrice() {
    baseTotal = selectedSeats.length * 75000;
    finalTotal = baseTotal;

    document.getElementById('totalPrice').textContent =
        baseTotal.toLocaleString();
}

function confirmBooking(movieTitle) {
    if (selectedSeats.length === 0) {
        showAlert('Vui lòng chọn ít nhất 1 ghế!');
        return;
    }

    const cinema = document.getElementById('cinema').value;
    const date = document.getElementById('date').value;
    const showtime = document.getElementById('showtime').value;

    if (!date) {
        showAlert('Vui lòng chọn ngày chiếu!');
        return;
    }

    const total = selectedSeats.length * 75000;

    const order = {
        id: orderId++,
        type: 'Vé phim',
        user: currentUser.username,
        userName: currentUser.name,
        movie: movieTitle,
        cinema: cinema,
        date: date,
        showtime: showtime,
        seats: selectedSeats.join(', '),
        total: total,
        status: 'pending',
        timestamp: new Date().toLocaleString('vi-VN')
    };

    orders.push(order);

    showAlert(`✅ Đặt vé thành công!\n\n📋 Mã đơn: #${order.id}\n🎬 Phim: ${movieTitle}\n🏢 Rạp: ${cinema}\n📅 Ngày: ${date}\n🕐 Suất: ${showtime}\n💺 Ghế: ${selectedSeats.join(', ')}\n💰 Tổng tiền: ${total.toLocaleString()} VNĐ`);
    closeModal();
}

// ========== Concession ==========
function showConcession(movieId, movieTitle) {
    const modal = document.getElementById('movieModal');
    modal.classList.add('active');

    const content = document.getElementById('modalContent');
    concessionCart = {};

    content.innerHTML = `
    <button class="close-btn" onclick="window.closeModal()">×</button>
    <h2><i class="fa-solid fa-popcorn"></i> Đặt bắp nước: ${movieTitle}</h2>

    <div class="concession-form">
        <div id="concessionItems"></div>

        <div class="concession-total-box">
            <div class="concession-total-text">
                <i class="fa-solid fa-coins"></i>
                Tổng tiền: <span id="concessionTotal">0</span> VNĐ
            </div>

            <button class="btn btn-primary w-full"
                onclick="window.confirmConcession('${movieTitle.replace(/'/g, "\\'")}')">
                <i class="fa-solid fa-check"></i> Xác nhận đặt hàng
            </button>
        </div>
    </div>
`;
    displayConcessionItems();
}

function displayConcessionItems() {
    const container = document.getElementById('concessionItems');
    container.innerHTML = concessions.map(item => `
        <div class="concession-item">
            <div>
                <div style="font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1rem;">${item.name}</div>
                <div style="color: #3393e2ff; font-weight: bold;">${item.price.toLocaleString()} VNĐ</div>
            </div>
            <div class="quantity-control">
                <button onclick="window.updateQuantity(${item.id}, -1)">-</button>
                <span id="qty-${item.id}">0</span>
                <button onclick="window.updateQuantity(${item.id}, 1)">+</button>
            </div>
        </div>
    `).join('');
}

function updateQuantity(itemId, change) {
    const item = concessions.find(c => c.id === itemId);
    const currentQty = concessionCart[itemId] || 0;
    const newQty = Math.max(0, currentQty + change);

    if (newQty === 0) {
        delete concessionCart[itemId];
    } else {
        concessionCart[itemId] = newQty;
    }

    document.getElementById(`qty-${itemId}`).textContent = newQty;
    updateConcessionTotal();
}

function updateConcessionTotal() {
    let total = 0;
    Object.keys(concessionCart).forEach(itemId => {
        const item = concessions.find(c => c.id == itemId);
        total += item.price * concessionCart[itemId];
    });

    document.getElementById('concessionTotal').textContent = total.toLocaleString();
}

function confirmConcession(movieTitle) {
    const items = Object.keys(concessionCart);
    if (items.length === 0) {
        showAlert('Vui lòng chọn ít nhất 1 món!');
        return;
    }

    let total = 0;
    let itemsList = [];
    items.forEach(itemId => {
        const item = concessions.find(c => c.id == itemId);
        const qty = concessionCart[itemId];
        const subtotal = item.price * qty;
        total += subtotal;
        itemsList.push(`${item.name} x${qty}`);
    });

    const order = {
        id: orderId++,
        type: 'Bắp nước',
        user: currentUser.username,
        userName: currentUser.name,
        movie: movieTitle,
        items: itemsList.join(', '),
        total: total,
        status: 'pending',
        timestamp: new Date().toLocaleString('vi-VN')
    };

    orders.push(order);

    showAlert(`✅ Đặt hàng thành công!\n\n📋 Mã đơn: #${order.id}\n🎬 Phim: ${movieTitle}\n🍿 Món: ${itemsList.join(', ')}\n💰 Tổng tiền: ${total.toLocaleString()} VNĐ`);
    closeModal();
}

// ========== Vouchers ==========
function showVouchers() {
    const modal = document.getElementById('movieModal');
    const content = document.getElementById('modalContent');

    modal.classList.add('active');
    content.innerHTML = `
        <button class="close-btn" onclick="window.closeModal()">×</button>
        <h2><i class="fa-solid fa-ticket"></i> Voucher khuyến mãi</h2>
        <div class="voucher-list">
            ${vouchers.map(v => `
                <div class="voucher-card">
                    <div class="voucher-code">${v.code}</div>
                    <div style="margin-bottom: 1rem;">${v.desc}</div>
                    <button class="btn btn-primary" onclick="window.copyVoucher('${v.code}')"><i class="fa-solid fa-copy"></i> Sao chép mã</button>
                </div>
            `).join('')}
        </div>
        ${currentUser.role === 'admin' ? `
            <div style="margin-top: 2rem; padding: 1.5rem; background: rgba(255, 255, 255, 0.05); border-radius: 10px;">
                <button class="btn btn-secondary" onclick="window.manageVouchers()"><i class="fa-solid fa-ticket"></i> Quản lý voucher</button>
            </div>
        ` : ''}
    `;
}

function copyVoucher(code) {
    navigator.clipboard.writeText(code);
    showAlert(`Đã sao chép mã: ${code}`);
}

// ========== Orders ==========
function showOrders() {
    const modal = document.getElementById('movieModal');
    const content = document.getElementById('modalContent');

    modal.classList.add('active');

    let userOrders = orders;
    if (currentUser.role === 'user') {
        userOrders = orders.filter(o => o.user === currentUser.username);
    }

    content.innerHTML = `
        <button class="close-btn" onclick="window.closeModal()">×</button>
        <h2><i class="fa-solid fa-list"></i> ${currentUser.role === 'admin' ? 'Tất cả đơn hàng' : 'Đơn hàng của tôi'}</h2>
        <div class="admin-section">
            ${userOrders.length === 0 ? '<p style="text-align: center; padding: 2rem; color: #aaa;">Chưa có đơn hàng nào.</p>' : `
                <div style="overflow-x: auto;">
                    <table class="orders-table">
                        <thead>
                            <tr>
                                <th>Mã đơn</th>
                                ${currentUser.role === 'admin' ? '<th>User</th>' : ''}
                                <th>Loại</th>
                                <th>Phim</th>
                                <th>Chi tiết</th>
                                <th>Tổng tiền</th>
                                <th>Trạng thái</th>
                                <th>Thời gian</th>
                                ${currentUser.role === 'admin' ? '<th>Hành động</th>' : ''}
                            </tr>
                        </thead>
                        <tbody>
                            ${userOrders.map(order => `
                                <tr>
                                    <td style="font-weight: bold;">#${order.id}</td>
                                    ${currentUser.role === 'admin' ? `<td>${order.userName}</td>` : ''}
                                    <td>${order.type}</td>
                                    <td>${order.movie}</td>
                                    <td style="font-size: 0.9rem;">${order.type === 'Vé phim' ?
            `${order.cinema}<br>${order.date} ${order.showtime}<br>Ghế: ${order.seats}` :
            order.items}</td>
                                    <td style="color: #33a3e4ff; font-weight: bold;">${order.total.toLocaleString()} VNĐ</td>
                                    <td><span class="status-badge status-${order.status}">${getStatusText(order.status)}</span></td>
                                    <td style="font-size: 0.9rem;">${order.timestamp}</td>
                                    ${currentUser.role === 'admin' ? `
                                        <td>
                                            ${order.status === 'pending' ? `
                                                <button class="btn btn-success" style="padding: 0.5rem 1rem; font-size: 0.85rem; margin-bottom: 0.3rem;" onclick="window.updateOrderStatus(${order.id}, 'completed')"><i class="fa-solid fa-check"></i> Hoàn thành</button>
                                                <button class="btn btn-danger" style="padding: 0.5rem 1rem; font-size: 0.85rem;" onclick="window.updateOrderStatus(${order.id}, 'cancelled')"><i class="fa-solid fa-x"></i> Hủy</button>
                                            ` : '-'}
                                        </td>
                                    ` : ''}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `}
        </div>
    `;
}

function getStatusText(status) {
    const statusMap = {
        'pending': '<i class="fa-solid fa-clock"></i> Chờ xử lý',
        'completed': '<i class="fa-solid fa-check"></i> Hoàn thành',
        'cancelled': '<i class="fa-solid fa-x"></i> Đã hủy'
    };
    return statusMap[status] || status;
}

function updateOrderStatus(orderId, newStatus) {
    const order = orders.find(o => o.id === orderId);
    if (order) {
        order.status = newStatus;
        showAlert(`Đã cập nhật trạng thái đơn #${orderId}`);
        showOrders();
    }
}

// ========== Admin Dashboard ==========
function showAdmin() {
    if (currentUser.role !== 'admin') {
        showAlert('Bạn không có quyền truy cập!');
        return;
    }

    const modal = document.getElementById('movieModal');
    const content = document.getElementById('modalContent');

    modal.classList.add('active');

    const totalOrders = orders.length;
    const totalRevenue = orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.total, 0);
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const completedOrders = orders.filter(o => o.status === 'completed').length;

    content.innerHTML = `
        <button class="close-btn" onclick="window.closeModal()">×</button>
        <h2><i class="fa-solid fa-user"></i> Admin Dashboard</h2>
        <div class="admin-dashboard">
            <div class="admin-stats">
                <div class="stat-card">
                    <div class="stat-number">${totalOrders}</div>
                    <div class="stat-label"><i class="fa-solid fa-shopping-cart"></i> Tổng đơn hàng</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${totalRevenue.toLocaleString()}</div>
                    <div class="stat-label"><i class="fa-solid fa-money-bill-wave"></i> Doanh thu (VNĐ)</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${pendingOrders}</div>
                    <div class="stat-label"><i class="fa-solid fa-clock"></i> Chờ xử lý</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${completedOrders}</div>
                    <div class="stat-label"><i class="fa-solid fa-check"></i> Hoàn thành</div>
                </div>
            </div>

            <div class="admin-section">
                <h2><i class="fa-solid fa-cogs"></i> Quản lý hệ thống</h2>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="window.showOrders()"><i class="fa-solid fa-list"></i> Xem tất cả đơn hàng</button>
                    <button class="btn btn-secondary" onclick="window.manageVouchers()"><i class="fa-solid fa-ticket"></i> Quản lý voucher</button>
                    <button class="btn btn-secondary" onclick="window.manageConcessions()"><i class="fa-solid fa-popcorn"></i> Quản lý bắp nước</button>
                </div>
            </div>
        </div>
    `;
}

function manageVouchers() {
    const modal = document.getElementById('movieModal');
    const content = document.getElementById('modalContent');

    content.innerHTML = `
        <button class="close-btn" onclick="window.closeModal()">×</button>
        <h2><i class="fa-solid fa-ticket"></i> Quản lý Voucher</h2>
        <div class="admin-section">
            <div class="voucher-list">
                ${vouchers.map((v, i) => `
                    <div class="voucher-card">
                        <div class="voucher-code">${v.code}</div>
                        <div style="margin-bottom: 1rem;">${v.desc}</div>
                        <button class="btn btn-danger" onclick="window.deleteVoucher(${i})"><i class="fa-solid fa-x"></i> Xóa</button>
                    </div>
                `).join('')}
            </div>
            <div style="margin-top: 2rem; padding: 2rem; background: var(--cold-border); border: 2px solid var(--cold-border); border-radius: 10px;">
                <h3><i class="fa-solid fa-plus"></i> Thêm voucher mới</h3>
                <div class="form-group">
                    <label>Mã voucher:</label>
                    <input type="text" id="newVoucherCode"  placeholder="VD: MOVIE100">
                </div>
                <div class="form-group">
                    <label>Mô tả:</label>
                    <input type="text" id="newVoucherDesc" placeholder="VD: Giảm 100k cho đơn từ 300k">
                </div>
                <button class="btn btn-primary" onclick="window.addVoucher()"><i class="fa-solid fa-check"></i> Thêm voucher</button>
            </div>
        </div>
    `;
}

function addVoucher() {
    const code = document.getElementById('newVoucherCode').value.trim();
    const desc = document.getElementById('newVoucherDesc').value.trim();

    if (code && desc) {
        vouchers.push({ code, discount: 0, desc });
        showAlert('Đã thêm voucher mới!');
        manageVouchers();
    } else {
        showAlert('Vui lòng điền đầy đủ thông tin!');
    }
}

function deleteVoucher(index) {
    if (confirm('Bạn có chắc muốn xóa voucher này?')) {
        vouchers.splice(index, 1);
        showAlert('Đã xóa voucher!');
        manageVouchers();
    }
}

function manageConcessions() {
    const modal = document.getElementById('movieModal');
    const content = document.getElementById('modalContent');

    content.innerHTML = `
        <button class="close-btn" onclick="window.closeModal()">×</button>
        <h2><i class="fa-solid fa-popcorn"></i> Quản lý Bắp nước</h2>
        <div class="admin-section">
            <table class="orders-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Tên món</th>
                        <th>Giá</th>
                        <th>Hành động</th>
                    </tr>  
                </thead>
                <tbody>
                    ${concessions.map((item, i) => `
                        <tr>
                            <td>${item.id}</td>
                            <td>${item.name}</td>
                            <td class="price-cold">${item.price.toLocaleString()} VNĐ</td>
                            <td>
                                <button class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.9rem; margin-right: 0.5rem;" onclick="window.editConcession(${i})"><i class="fa-solid fa-pen"></i> Sửa</button>
                                <button class="btn btn-danger" style="padding: 0.5rem 1rem; font-size: 0.9rem;" onclick="window.deleteConcession(${i})"><i class="fa-solid fa-trash"></i> Xóa</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="add-food" style="margin-top: 2rem; padding: 2rem;">
                <h3><i class="fa-solid fa-plus"></i> Thêm món mới</h3>
                <div class="form-group">
                    <label>Tên món:</label>
                    <input type="text" id="newConcessionName" placeholder="Ví dụ: Bánh Tráng Nướng Đà Lạt quê tôi">
                </div>
                <div class="form-group">
                    <label>Giá (VNĐ):</label>
                    <input type="number" id="newConcessionPrice" placeholder="Ví dụ: 49.000VNĐ">
                </div>
                <button class="btn btn-primary" onclick="window.addConcession()"><i class="fa-solid fa-check"></i> Thêm món</button>
            </div>
        </div>
    `;
}

function editConcession(index) {
    const item = concessions[index];
    const newName = prompt('Nhập tên món mới:', item.name);
    if (newName && newName.trim()) {
        const newPrice = prompt('Nhập giá mới (VNĐ):', item.price);
        if (newPrice && !isNaN(newPrice)) {
            concessions[index].name = newName.trim();
            concessions[index].price = parseInt(newPrice);
            showAlert('Đã cập nhật món!');
            manageConcessions();
        }
    }
}

function deleteConcession(index) {
    if (confirm('Bạn có chắc muốn xóa món này?')) {
        concessions.splice(index, 1);
        showAlert('Đã xóa món!');
        manageConcessions();
    }
}

function addConcession() {
    const name = document.getElementById('newConcessionName').value.trim();
    const price = parseInt(document.getElementById('newConcessionPrice').value);

    if (name && price && !isNaN(price)) {
        const newId = Math.max(...concessions.map(c => c.id)) + 1;
        concessions.push({ id: newId, name, price });
        showAlert('Đã thêm món mới!');
        manageConcessions();
    } else {
        showAlert('Vui lòng điền đầy đủ thông tin hợp lệ!');
    }
}

let alertCallback = null;
let alertTimer = null;

function showAlert(message, type = "info", options = {}) {
    const overlay = document.querySelector("#alertOverlay");
    const box = overlay.querySelector(".alert-box");
    const icon = overlay.querySelector("#alertIcon");
    const title = overlay.querySelector("#alertTitle");
    const msg = overlay.querySelector("#alertMessage");

    if (alertTimer) clearTimeout(alertTimer);

    alertCallback = options.onOk || null;

    // reset class
    box.className = "alert-box";

    const icons = {
        error: "fa-circle-xmark",
        warning: "fa-triangle-exclamation",
        success: "fa-circle-check",
        info: "fa-circle-info"
    };

    const titles = {
        error: "Lỗi",
        warning: "Cảnh báo",
        success: "Thành công",
        info: "Thông báo"
    };

    icon.className = `fa-solid ${icons[type]}`;
    title.textContent = titles[type];
    msg.textContent = message;

    if (type === "error") {
        box.classList.add("alert-error"); // rung nhẹ
    }

    overlay.style.display = "flex";

    // auto close
    if (options.autoClose) {
        alertTimer = setTimeout(closeAlert, options.autoClose);
    }
}

function handleAlertOk() {
    if (typeof alertCallback === "function") {
        alertCallback();
    }
    closeAlert();
}

function closeAlert() {
    const overlay = document.querySelector("#alertOverlay");
    overlay.style.display = "none";
    alertCallback = null;
}

// click ra ngoài để đóng
function handleOverlayClick(e) {
    if (e.target.id === "alertOverlay") {
        closeAlert();
    }
}

// ESC để đóng
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closeAlert();
    }
});

// ========== Expose Functions to Window ==========
window.login = login;
window.logout = logout;
window.showHome = showHome;
window.searchMovies = searchMovies;
window.showVouchers = showVouchers;
window.closeModal = closeModal;
window.filterByGenre = filterByGenre;
window.showMovieDetail = showMovieDetail;
window.showBooking = showBooking;
window.showConcession = showConcession;
window.toggleSeat = toggleSeat;
window.confirmBooking = confirmBooking;
window.updateQuantity = updateQuantity;
window.confirmConcession = confirmConcession;
window.copyVoucher = copyVoucher;
window.showOrders = showOrders;
window.updateOrderStatus = updateOrderStatus;
window.showAdmin = showAdmin;
window.manageVouchers = manageVouchers;
window.addVoucher = addVoucher;
window.deleteVoucher = deleteVoucher;
window.manageConcessions = manageConcessions;
window.editConcession = editConcession;
window.deleteConcession = deleteConcession;
window.addConcession = addConcession;
window.closeAlert = closeAlert;
window.handleAlertOk = handleAlertOk;
window.handleOverlayClick = handleOverlayClick;
window.register = register;
window.showRegister = showRegister;
window.closeAuthModal = closeAuthModal;
window.isLoggedIn = isLoggedIn;
window.promptLogin = promptLogin;
window.applyVoucher = applyVoucher;