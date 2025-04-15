document.addEventListener('DOMContentLoaded', function() {
  // ==================== 全局工具函数 ====================
  function formatDateToDMY(isoDate) {
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  }

  // ==================== 日期处理 ====================
  const depDateInput = document.getElementById('depDate');
  if (depDateInput) {
    // 设置最小日期
    const today = new Date();
    depDateInput.min = today.toISOString().split('T')[0];

    // 初始化Flatpickr（需要先引入库文件）
    if (typeof flatpickr !== 'undefined') {
      flatpickr("#depDate", {
        dateFormat: "d/m/Y",
        minDate: "today",
        locale: { firstDayOfWeek: 1 }
      });
    }
  }

  // ==================== 车站动态联动 ====================
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
    depLocationSelect.innerHTML = Object.keys(stationMap)
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

  // ==================== 表单提交处理 ====================
  document.getElementById('bookingForm')?.addEventListener('submit', function(e) {
    e.preventDefault();

    // 日期验证
    const isoDate = document.getElementById('depDate').value;
    const selectedDate = new Date(isoDate);
    
    if (selectedDate < new Date().setHours(0,0,0,0)) {
      alert("Cannot select past dates!");
      return;
    }

    // 创建记录
    const bookingRecord = {
      date: formatDateToDMY(isoDate),
      from: document.getElementById('depLocation').value,
      to: document.getElementById('destLocation').value,
      adults: document.getElementById('adults').value,
      children: document.getElementById('children').value,
      oku: document.getElementById('oku').value,
      timestamp: new Date().getTime()
    };

    // 保存记录
    const records = JSON.parse(localStorage.getItem('bookingRecords') || []);
    records.push(bookingRecord);
    localStorage.setItem('bookingRecords', JSON.stringify(records));

    // 跳转页面
    window.location.href = 'booking-records.html';
  });

  // ==================== 预订记录页面 ====================
  function loadBookingRecords() {
    const container = document.getElementById('bookingRecordsContainer');
    const records = JSON.parse(localStorage.getItem('bookingRecords') || []);
    
    container.innerHTML = records.length ? 
      records.map((record, index) => `
        <div class="card">
          <h4>Ticket #${index + 1}</h4>
          <p>📅 Date: ${record.date}</p>
          <p>🚉 Route: ${record.from} → ${record.to}</p>
          <p>👥 Passengers: 
            Adults (${record.adults}), 
            Children (${record.children}), 
            OKU (${record.oku})
          </p>
        </div>
      `).join('') : 
      '<p>No tickets found.</p>';
  }

  if (window.location.pathname.includes('booking-records.html')) {
    loadBookingRecords();
  }
});