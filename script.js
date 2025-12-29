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
    { code: 'MOVIE50K', discount: 50000, desc: 'Giảm 50k cho đơn từ 200k' },
    { code: 'FREEPOP', discount: 0, desc: 'Tặng bắp nước combo 1' },
    { code: 'WEEK30', discount: '30%', desc: 'Giảm 30% vào các ngày trong tuần' }
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

// ========== Initialize ==========
document.addEventListener('DOMContentLoaded', () => {
    checkLogin();
    const buttonLogin = document.querySelector('.btn.btn-primary');
    buttonLogin.addEventListener('click', login);
});

// ========== Authentication ==========
function login() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (typeof accounts === 'undefined') {
        console.error("Dữ liệu tài khoản chưa được tải!");
        return;
    }

    if (!username || !password) {
        alert('Vui lòng nhập đầy đủ thông tin!');
        return;
    }

    const account = accounts[username];

    if (account && account.password === password) {
        currentUser = account;
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        initApp();
    } else {
        alert('Tên đăng nhập hoặc mật khẩu không đúng!');
    }
}



// window.login = function() {
//     console.log('Login function called!');
//     const username = document.getElementById('loginUsername').value.trim();
//     const password = document.getElementById('loginPassword').value;

//     console.log('Username:', username, 'Password:', password);

//     if (!username || !password) {
//         alert('Vui lòng nhập đầy đủ thông tin!');
//         return;
//     }

//     const account = accounts[username];

//     if (account && account.password === password) {
//         currentUser = account;
//         console.log('Login successful!', currentUser);
//         document.getElementById('loginScreen').style.display = 'none';
//         document.getElementById('mainApp').style.display = 'block';
//         initApp();
//     } else {
//         alert('Tên đăng nhập hoặc mật khẩu không đúng!');
//     }
// }

// document.addEventListener('DOMContentLoaded', () => {
//     document.querySelector('.btn-primary').addEventListener('click', login);
// });


function logout() {
    if (confirm('Bạn có chắc muốn đăng xuất?')) {
        currentUser = null;
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('searchInput').value = '';
    }
}

function checkLogin() {
    if (!currentUser) {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
    }
}

// ========== Initialize App ==========
function initApp() {
    document.getElementById('userDisplay').textContent = `👤 ${currentUser.name}`;

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
    moviesGrid.innerHTML = '<div class="loading">⏳ Đang tải phim...</div>';

    try {
        let url = `${API_BASE}/movie/popular?api_key=${API_KEY}&language=vi-VN&page=1`;
        if (genreId) {
            url = `${API_BASE}/discover/movie?api_key=${API_KEY}&language=vi-VN&with_genres=${genreId}&page=1`;
        }

        const res = await fetch(url);
        const data = await res.json();
        displayMovies(data.results);
    } catch (err) {
        moviesGrid.innerHTML = '<div class="loading">❌ Không thể tải phim. Vui lòng thử lại.</div>';
    }
}

function displayMovies(movies) {
    const moviesGrid = document.getElementById('moviesGrid');

    if (movies.length === 0) {
        moviesGrid.innerHTML = '<div class="loading">Không tìm thấy phim nào.</div>';
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
                    ⭐ ${movie.vote_average.toFixed(1)}
                </div>
            </div>
        </div>
    `).join('');
}

async function searchMovies() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) {
        alert('Vui lòng nhập từ khóa tìm kiếm!');
        return;
    }

    const moviesGrid = document.getElementById('moviesGrid');
    moviesGrid.innerHTML = '<div class="loading">🔍 Đang tìm kiếm...</div>';

    try {
        const res = await fetch(`${API_BASE}/search/movie?api_key=${API_KEY}&language=vi-VN&query=${encodeURIComponent(query)}`);
        const data = await res.json();
        displayMovies(data.results);
    } catch (err) {
        moviesGrid.innerHTML = '<div class="loading">❌ Không thể tìm kiếm. Vui lòng thử lại.</div>';
    }
}

async function showMovieDetail(movieId) {
    const modal = document.getElementById('movieModal');
    const content = document.getElementById('modalContent');

    modal.classList.add('active');
    content.innerHTML = '<div class="loading">⏳ Đang tải thông tin...</div>';

    try {
        const [movieRes, videosRes] = await Promise.all([
            fetch(`${API_BASE}/movie/${movieId}?api_key=${API_KEY}&language=vi-VN`),
            fetch(`${API_BASE}/movie/${movieId}/videos?api_key=${API_KEY}&language=vi-VN`)
        ]);

        const movie = await movieRes.json();
        const videos = await videosRes.json();
        const trailer = videos.results.find(v => v.type === 'Trailer') || videos.results[0];

        content.innerHTML = `
            <button class="close-btn" onclick="window.closeModal()">×</button>
            <div class="movie-detail-header">
                <img src="${movie.poster_path ? IMG_BASE + movie.poster_path : 'https://via.placeholder.com/300x450'}" 
                     alt="${movie.title}" class="movie-detail-poster">
                <div class="movie-detail-info">
                    <h2>${movie.title}</h2>
                    <p><strong>⭐ Đánh giá:</strong> ${movie.vote_average.toFixed(1)}/10 (${movie.vote_count.toLocaleString()} votes)</p>
                    <p><strong>📅 Ngày phát hành:</strong> ${movie.release_date}</p>
                    <p><strong>⏱️ Thời lượng:</strong> ${movie.runtime} phút</p>
                    <p><strong>🎭 Thể loại:</strong> ${movie.genres.map(g => g.name).join(', ')}</p>
                    <p><strong>📝 Mô tả:</strong></p>
                    <p style="text-align: justify;">${movie.overview || 'Chưa có mô tả'}</p>
                    <div class="action-buttons">
                        <button class="btn btn-primary" onclick="window.showBooking(${movieId}, '${movie.title.replace(/'/g, "\\'")}')">🎟️ Đặt vé</button>
                        <button class="btn btn-secondary" onclick="window.showConcession(${movieId}, '${movie.title.replace(/'/g, "\\'")}')">🍿 Đặt bắp nước</button>
                    </div>
                </div>
            </div>
            ${trailer ? `
                <div class="trailer-container">
                    <h3>🎬 Trailer</h3>
                    <iframe src="https://www.youtube.com/embed/${trailer.key}" allowfullscreen></iframe>
                </div>
            ` : '<p style="color: #aaa; margin-top: 2rem;">Không có trailer</p>'}
        `;
    } catch (err) {
        content.innerHTML = '<div class="loading">❌ Không thể tải thông tin phim.</div>';
    }
}

function closeModal() {
    document.getElementById('movieModal').classList.remove('active');
}

function showHome() {
    document.getElementById('searchInput').value = '';
    loadMovies(currentGenre);
}

// ========== Booking ==========
function showBooking(movieId, movieTitle) {
    const content = document.getElementById('modalContent');
    selectedSeats = [];

    content.innerHTML = `
        <button class="close-btn" onclick="window.closeModal()">×</button>
        <h2>🎟️ Đặt vé: ${movieTitle}</h2>
        <div class="booking-form">
            <div class="form-group">
                <label>🏢 Chọn rạp:</label>
                <select id="cinema">
                    <option>CGV Vincom Center</option>
                    <option>Lotte Cinema Diamond</option>
                    <option>Galaxy Nguyễn Du</option>
                    <option>BHD Star Bitexco</option>
                </select>
            </div>
            <div class="form-group">
                <label>📅 Chọn ngày:</label>
                <input type="date" id="date" min="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-group">
                <label>🕐 Chọn suất chiếu:</label>
                <select id="showtime">
                    <option>09:00</option>
                    <option>11:30</option>
                    <option>14:00</option>
                    <option>16:30</option>
                    <option>19:00</option>
                    <option>21:30</option>
                </select>
            </div>
            <div class="form-group">
                <label>💺 Chọn ghế (<span id="seatCount">0</span> ghế):</label>
                <div style="text-align: center; margin: 1rem 0; padding: 1rem; background: rgba(233, 69, 96, 0.2); border-radius: 10px; font-weight: bold; font-size: 1.1rem;">
                    🖥️ MÀN HÌNH
                </div>
                <div class="seat-selection" id="seatSelection"></div>
                <div class="seat-legend">
                    <div class="legend-item">
                        <div class="legend-box" style="background: rgba(255, 255, 255, 0.1); border: 2px solid rgba(233, 69, 96, 0.3);"></div>
                        <span>Trống</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-box" style="background: #e94560;"></div>
                        <span>Đã chọn</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-box" style="background: #555;"></div>
                        <span>Đã đặt</span>
                    </div>
                </div>
            </div>
            <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(243, 156, 18, 0.2); border-radius: 10px; font-size: 1.3rem; color: #f39c12; font-weight: bold; text-align: center;">
                💰 Tổng tiền: <span id="totalPrice">0</span> VNĐ
            </div>
            <button class="btn btn-primary" style="width: 100%; margin-top: 1rem;" onclick="window.confirmBooking('${movieTitle.replace(/'/g, "\\'")}')">✅ Xác nhận đặt vé</button>
        </div>
    `;

    generateSeats();
}

function generateSeats() {
    const seatSelection = document.getElementById('seatSelection');
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const seats = [];

    rows.forEach(row => {
        for (let i = 1; i <= 10; i++) {
            const seatId = `${row}${i}`;
            const isTaken = Math.random() > 0.7;
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
    const pricePerSeat = 75000;
    const total = selectedSeats.length * pricePerSeat;
    document.getElementById('totalPrice').textContent = total.toLocaleString();
}

function confirmBooking(movieTitle) {
    if (selectedSeats.length === 0) {
        alert('⚠️ Vui lòng chọn ít nhất 1 ghế!');
        return;
    }

    const cinema = document.getElementById('cinema').value;
    const date = document.getElementById('date').value;
    const showtime = document.getElementById('showtime').value;

    if (!date) {
        alert('⚠️ Vui lòng chọn ngày chiếu!');
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

    alert(`✅ Đặt vé thành công!\n\n📋 Mã đơn: #${order.id}\n🎬 Phim: ${movieTitle}\n🏢 Rạp: ${cinema}\n📅 Ngày: ${date}\n🕐 Suất: ${showtime}\n💺 Ghế: ${selectedSeats.join(', ')}\n💰 Tổng tiền: ${total.toLocaleString()} VNĐ`);
    closeModal();
}

// ========== Concession ==========
function showConcession(movieId, movieTitle) {
    const content = document.getElementById('modalContent');
    concessionCart = {};

    content.innerHTML = `
        <button class="close-btn" onclick="window.closeModal()">×</button>
        <h2>🍿 Đặt bắp nước: ${movieTitle}</h2>
        <div class="concession-form">
            <div id="concessionItems"></div>
            <div style="margin-top: 2rem; padding: 1.5rem; background: rgba(243, 156, 18, 0.2); border-radius: 10px;">
                <div style="font-size: 1.4rem; color: #f39c12; font-weight: bold; text-align: center; margin-bottom: 1rem;">
                    💰 Tổng tiền: <span id="concessionTotal">0</span> VNĐ
                </div>
                <button class="btn btn-primary" style="width: 100%;" onclick="window.confirmConcession('${movieTitle.replace(/'/g, "\\'")}')">✅ Xác nhận đặt hàng</button>
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
                <div style="color: #f39c12; font-weight: bold;">${item.price.toLocaleString()} VNĐ</div>
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
        alert('⚠️ Vui lòng chọn ít nhất 1 món!');
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

    alert(`✅ Đặt hàng thành công!\n\n📋 Mã đơn: #${order.id}\n🎬 Phim: ${movieTitle}\n🍿 Món: ${itemsList.join(', ')}\n💰 Tổng tiền: ${total.toLocaleString()} VNĐ`);
    closeModal();
}

// ========== Vouchers ==========
function showVouchers() {
    const modal = document.getElementById('movieModal');
    const content = document.getElementById('modalContent');

    modal.classList.add('active');
    content.innerHTML = `
        <button class="close-btn" onclick="window.closeModal()">×</button>
        <h2>🎫 Voucher khuyến mãi</h2>
        <div class="voucher-list">
            ${vouchers.map(v => `
                <div class="voucher-card">
                    <div class="voucher-code">${v.code}</div>
                    <div style="margin-bottom: 1rem;">${v.desc}</div>
                    <button class="btn btn-primary" onclick="window.copyVoucher('${v.code}')">📋 Sao chép mã</button>
                </div>
            `).join('')}
        </div>
        ${currentUser.role === 'admin' ? `
            <div style="margin-top: 2rem; padding: 1.5rem; background: rgba(255, 255, 255, 0.05); border-radius: 10px;">
                <button class="btn btn-secondary" onclick="window.manageVouchers()">⚙️ Quản lý voucher</button>
            </div>
        ` : ''}
    `;
}

function copyVoucher(code) {
    navigator.clipboard.writeText(code);
    alert(`✅ Đã sao chép mã: ${code}`);
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
        <h2>📋 ${currentUser.role === 'admin' ? 'Tất cả đơn hàng' : 'Đơn hàng của tôi'}</h2>
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
                                    <td style="color: #f39c12; font-weight: bold;">${order.total.toLocaleString()} VNĐ</td>
                                    <td><span class="status-badge status-${order.status}">${getStatusText(order.status)}</span></td>
                                    <td style="font-size: 0.9rem;">${order.timestamp}</td>
                                    ${currentUser.role === 'admin' ? `
                                        <td>
                                            ${order.status === 'pending' ? `
                                                <button class="btn btn-success" style="padding: 0.5rem 1rem; font-size: 0.85rem; margin-bottom: 0.3rem;" onclick="window.updateOrderStatus(${order.id}, 'completed')">✅ Hoàn thành</button>
                                                <button class="btn btn-danger" style="padding: 0.5rem 1rem; font-size: 0.85rem;" onclick="window.updateOrderStatus(${order.id}, 'cancelled')">❌ Hủy</button>
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
        'pending': '⏳ Chờ xử lý',
        'completed': '✅ Hoàn thành',
        'cancelled': '❌ Đã hủy'
    };
    return statusMap[status] || status;
}

function updateOrderStatus(orderId, newStatus) {
    const order = orders.find(o => o.id === orderId);
    if (order) {
        order.status = newStatus;
        alert(`✅ Đã cập nhật trạng thái đơn #${orderId}`);
        showOrders();
    }
}

// ========== Admin Dashboard ==========
function showAdmin() {
    if (currentUser.role !== 'admin') {
        alert('⚠️ Bạn không có quyền truy cập!');
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
        <h2>👨‍💼 Admin Dashboard</h2>
        <div class="admin-dashboard">
            <div class="admin-stats">
                <div class="stat-card">
                    <div class="stat-number">${totalOrders}</div>
                    <div class="stat-label">📊 Tổng đơn hàng</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${totalRevenue.toLocaleString()}</div>
                    <div class="stat-label">💰 Doanh thu (VNĐ)</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${pendingOrders}</div>
                    <div class="stat-label">⏳ Chờ xử lý</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${completedOrders}</div>
                    <div class="stat-label">✅ Hoàn thành</div>
                </div>
            </div>

            <div class="admin-section">
                <h2>📊 Quản lý hệ thống</h2>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="window.showOrders()">📋 Xem tất cả đơn hàng</button>
                    <button class="btn btn-secondary" onclick="window.manageVouchers()">🎫 Quản lý voucher</button>
                    <button class="btn btn-secondary" onclick="window.manageConcessions()">🍿 Quản lý bắp nước</button>
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
        <h2>🎫 Quản lý Voucher</h2>
        <div class="admin-section">
            <div class="voucher-list">
                ${vouchers.map((v, i) => `
                    <div class="voucher-card">
                        <div class="voucher-code">${v.code}</div>
                        <div style="margin-bottom: 1rem;">${v.desc}</div>
                        <button class="btn btn-danger" onclick="window.deleteVoucher(${i})">❌ Xóa</button>
                    </div>
                `).join('')}
            </div>
            <div style="margin-top: 2rem; padding: 2rem; background: rgba(233, 69, 96, 0.1); border-radius: 10px;">
                <h3>➕ Thêm voucher mới</h3>
                <div class="form-group">
                    <label>Mã voucher:</label>
                    <input type="text" id="newVoucherCode" placeholder="VD: MOVIE100">
                </div>
                <div class="form-group">
                    <label>Mô tả:</label>
                    <input type="text" id="newVoucherDesc" placeholder="VD: Giảm 100k cho đơn từ 300k">
                </div>
                <button class="btn btn-primary" onclick="window.addVoucher()">✅ Thêm voucher</button>
            </div>
        </div>
    `;
}

function addVoucher() {
    const code = document.getElementById('newVoucherCode').value.trim();
    const desc = document.getElementById('newVoucherDesc').value.trim();

    if (code && desc) {
        vouchers.push({ code, discount: 0, desc });
        alert('✅ Đã thêm voucher mới!');
        manageVouchers();
    } else {
        alert('⚠️ Vui lòng điền đầy đủ thông tin!');
    }
}

function deleteVoucher(index) {
    if (confirm('❓ Bạn có chắc muốn xóa voucher này?')) {
        vouchers.splice(index, 1);
        alert('✅ Đã xóa voucher!');
        manageVouchers();
    }
}

function manageConcessions() {
    const modal = document.getElementById('movieModal');
    const content = document.getElementById('modalContent');

    content.innerHTML = `
        <button class="close-btn" onclick="window.closeModal()">×</button>
        <h2>🍿 Quản lý Bắp nước</h2>
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
                            <td style="color: #f39c12; font-weight: bold;">${item.price.toLocaleString()} VNĐ</td>
                            <td>
                                <button class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.9rem; margin-right: 0.5rem;" onclick="window.editConcession(${i})">✏️ Sửa</button>
                                <button class="btn btn-danger" style="padding: 0.5rem 1rem; font-size: 0.9rem;" onclick="window.deleteConcession(${i})">❌ Xóa</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div style="margin-top: 2rem; padding: 2rem; background: rgba(233, 69, 96, 0.1); border-radius: 10px;">
                <h3>➕ Thêm món mới</h3>
                <div class="form-group">
                    <label>Tên món:</label>
                    <input type="text" id="newConcessionName" placeholder="VD: Nachos phô mai">
                </div>
                <div class="form-group">
                    <label>Giá (VNĐ):</label>
                    <input type="number" id="newConcessionPrice" placeholder="VD: 50000">
                </div>
                <button class="btn btn-primary" onclick="window.addConcession()">✅ Thêm món</button>
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
            alert('✅ Đã cập nhật món!');
            manageConcessions();
        }
    }
}

function deleteConcession(index) {
    if (confirm('❓ Bạn có chắc muốn xóa món này?')) {
        concessions.splice(index, 1);
        alert('✅ Đã xóa món!');
        manageConcessions();
    }
}

function addConcession() {
    const name = document.getElementById('newConcessionName').value.trim();
    const price = parseInt(document.getElementById('newConcessionPrice').value);

    if (name && price && !isNaN(price)) {
        const newId = Math.max(...concessions.map(c => c.id)) + 1;
        concessions.push({ id: newId, name, price });
        alert('✅ Đã thêm món mới!');
        manageConcessions();
    } else {
        alert('⚠️ Vui lòng điền đầy đủ thông tin hợp lệ!');
    }
}

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