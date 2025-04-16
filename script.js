document.addEventListener('DOMContentLoaded', function() {
  // ==================== 用户系统核心逻辑 ====================
  const profileBtn = document.getElementById('profileBtn');
  const profileModal = document.getElementById('profileModal');
  const closeBtn = document.querySelector('.modal .close');
  const modalBody = document.querySelector('.modal-body');
  console.log("Profile按钮元素：", profileBtn);

  // 初始化用户状态
  function initUserState() {
    const username = localStorage.getItem('username');
    document.querySelectorAll('.profile-btn').forEach(btn => {
      btn.textContent = username || "Sign In"; // 未登录显示"Sign In"
    });
  }

  // 模态框控制
  function toggleModal(show = true) {
    profileModal.style.display = show ? 'block' : 'none';
  }

  // 更新模态框内容
  function updateAuthUI() {
    const isLoggedIn = !!localStorage.getItem('username');
    const username = localStorage.getItem('username');
    
    modalBody.innerHTML = isLoggedIn ? `
      <div class="auth-status">
        <h2>Welcome, ${username}</h2>
        <button class="logout-btn">Logout</button>
      </div>
    ` : `
      <div class="auth-form">
        <h2>Sign In</h2>
        <input type="email" id="loginEmail" placeholder="your.email@example.com">
        <button class="login-btn">Continue with Email</button>
      </div>
    `;

    // 绑定动态按钮事件
    if (isLoggedIn) {
      document.querySelector('.logout-btn')?.addEventListener('click', logout);
    } else {
      document.querySelector('.login-btn')?.addEventListener('click', login);
    }
  }

  // 登录功能
  function login() {
    const email = document.getElementById('loginEmail')?.value;
    if (!validateEmail(email)) {
      alert('Please enter a valid email address');
      return;
    }
    
    const username = email.split('@')[0];
    localStorage.setItem('username', username);
    initUserState();
    toggleModal(false);
  }

  // 登出功能
  function logout() {
    localStorage.removeItem('username');
    initUserState();
    toggleModal(false);
    if (window.location.pathname.includes('booking-records.html')) {
      window.location.reload(); // 登出后刷新记录页面
    }
  }

  // 邮箱验证
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // 用户系统事件绑定
  if (profileBtn && profileModal) {
  profileBtn.addEventListener('click', () => {
    updateAuthUI();
    toggleModal(true);
  });
}

  closeBtn?.addEventListener('click', () => toggleModal(false));
  window.addEventListener('click', (e) => {
    if (e.target === profileModal) toggleModal(false);
  });

  // ==================== 全局工具函数 ====================
  function formatDateToDMY(isoDate) {
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  }

  // ==================== 日期处理 ====================
  const depDateInput = document.getElementById('depDate');
  if (depDateInput) {
    // Flatpickr初始化（确保已加载CDN）
    flatpickr("#depDate", {
      dateFormat: "d/m/Y",
      minDate: "today",
      locale: { 
        firstDayOfWeek: 1,
        monthNames: [
          "January", "February", "March", "April",
          "May", "June", "July", "August",
          "September", "October", "November", "December"
        ]
      }
    });
  }

  // ==================== 车站动态联动（已更新正确数据）====================
  const stationMap = {
    "KL Sentral": ["Kajang", "UKM", "Seremban", "Pulau Sebang"],
    "Kajang": ["Seremban", "Pulau Sebang"],
    "UKM": ["Seremban"],
    "Seremban": ["Pulau Sebang"],
    "Pulau Sebang": []
  };

  // 初始化出发站选项
  const depLocationSelect = document.getElementById('depLocation');
  if (depLocationSelect) {
    depLocationSelect.innerHTML = '<option value="">Select Departure Station</option>' + 
      Object.keys(stationMap)
        .map(station => `<option value="${station}">${station}</option>`)
        .join('');

    // 动态加载目的地
    depLocationSelect.addEventListener('change', function() {
      const destSelect = document.getElementById('destLocation');
      const destinations = stationMap[this.value] || [];
      
      destSelect.innerHTML = '<option value="">Select Destination</option>' + 
        destinations.map(station => `<option value="${station}">${station}</option>`).join('');
      
      destSelect.disabled = destinations.length === 0;
    });
  }

  // ==================== 价格计算 ====================
  function updatePrice() {
    const adults = parseInt(document.getElementById('adults').value) || 0;
    const children = parseInt(document.getElementById('children').value) || 0;
    const oku = parseInt(document.getElementById('oku').value) || 0;
    document.getElementById('totalPrice').textContent = adults * 10 + children * 5 + oku * 3;
  }

  ['adults', 'children', 'oku'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updatePrice);
  });

  // ==================== 表单提交处理（已修复登录验证）====================
  document.getElementById('bookingForm')?.addEventListener('submit', function(e) {
    e.preventDefault();

    // 强制登录验证
    if (!localStorage.getItem('username')) {
      alert("Please sign in to continue booking");
      updateAuthUI();
      toggleModal(true);
      return;
    }

    // 日期验证
    const isoDate = document.getElementById('depDate').value;
    const selectedDate = new Date(isoDate.split('/').reverse().join('-'));
    
    if (selectedDate < new Date().setHours(0,0,0,0)) {
      alert("Cannot book past dates!");
      return;
    }

    // 创建记录（包含用户名）
    const bookingRecord = {
      date: isoDate, // 直接使用Flatpickr格式化的日期
      from: document.getElementById('depLocation').value,
      to: document.getElementById('destLocation').value,
      adults: document.getElementById('adults').value,
      children: document.getElementById('children').value,
      oku: document.getElementById('oku').value,
      timestamp: new Date().getTime(),
      username: localStorage.getItem('username')
    };

    // 保存记录
    const records = JSON.parse(localStorage.getItem('bookingRecords') || '[]');
    records.push(bookingRecord);
    localStorage.setItem('bookingRecords', JSON.stringify(records));

    window.location.href = 'booking-records.html';
  });

  // ==================== 预订记录页面（精确数据过滤）====================
  function loadBookingRecords() {
    const container = document.getElementById('bookingRecordsContainer');
    const currentUser = localStorage.getItem('username');
    const allRecords = JSON.parse(localStorage.getItem('bookingRecords') || '[]');
    
    // 双重验证：存在用户且记录有效
    const userRecords = currentUser 
      ? allRecords.filter(record => 
          record.username === currentUser && 
          !!record.timestamp
        ) 
      : [];

    container.innerHTML = userRecords.length ? 
      userRecords.map((record, index) => `
        <div class="card">
          <h4>Ticket #${index + 1}</h4>
          <p>📅 Date: ${record.date}</p>
          <p>🚉 Route: ${record.from} → ${record.to}</p>
          <p>👤 Booked by: ${record.username}</p>
          <p>👥 Passengers: 
            Adults (${record.adults}), 
            Children (${record.children}), 
            OKU (${record.oku})
          </p>
        </div>
      `).join('') : 
      '<p class="no-records">No booking records found. Please login and make a booking first.</p>';
  }

  // 自动加载记录（仅在记录页面执行）
  if (window.location.pathname.includes('booking-records.html')) {
    loadBookingRecords();
    initUserState(); // 确保导航栏状态更新
  }

  // 初始化用户状态
  initUserState();
});