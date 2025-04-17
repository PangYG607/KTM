document.addEventListener('DOMContentLoaded', function () {
  // —— 登录/登出 Modal 逻辑 —— //
  const profileBtn = document.getElementById('profileBtn');
  const modal = document.getElementById('profileModal');
  const closeBtn = modal.querySelector('.close');
  const modalBody = modal.querySelector('.modal-body');

  function initUserState() {
    const user = localStorage.getItem('username') || '';
    document.querySelectorAll('.profile-btn').forEach(b => b.textContent = user || 'Sign In');
  }

  function toggleModal(show) {
    modal.style.display = show ? 'block' : 'none';
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function updateAuthUI() {
    const loggedIn = !!localStorage.getItem('username');
    const user = localStorage.getItem('username') || '';
    if (loggedIn) {
      modalBody.innerHTML = `
        <div class="auth-status">
          <h2>Welcome, ${user}</h2>
          <button class="logout-btn">Logout</button>
        </div>`;
      modalBody.querySelector('.logout-btn').addEventListener('click', () => {
        localStorage.removeItem('username');
        initUserState();
        toggleModal(false);
        if (location.pathname.includes('booking-records.html')) location.reload();
      });
    } else {
      modalBody.innerHTML = `
        <div class="auth-form">
          <h2>Sign In</h2>
          <input id="loginEmail" type="email" placeholder="your.email@example.com">
          <button class="login-btn">Continue</button>
        </div>`;
      modalBody.querySelector('.login-btn').addEventListener('click', () => {
        const email = modalBody.querySelector('#loginEmail').value;
        if (!validateEmail(email)) return alert('Invalid email');
        localStorage.setItem('username', email.split('@')[0]);
        initUserState();
        toggleModal(false);
      });
    }
  }

  profileBtn?.addEventListener('click', () => {
    updateAuthUI();
    toggleModal(true);
  });

  closeBtn?.addEventListener('click', () => toggleModal(false));
  window.addEventListener('click', e => e.target === modal && toggleModal(false));
  initUserState();

  // —— 日期选择器 —— //
  const today = new Date().toISOString().split('T')[0];
  if (window.flatpickr) {
    flatpickr('#departure-date', {
      dateFormat: 'Y-m-d',
      minDate: today
    });
    flatpickr('#return-date', {
      dateFormat: 'Y-m-d',
      minDate: today,
      onChange: (_, __, instance) => {
        const depDate = document.getElementById('departure-date').value;
        if (depDate) instance.set('minDate', depDate);
      }
    });
  }

  // —— 站点映射 —— //
  const stationMap = {
    'KL Sentral': ['Kajang', 'UKM', 'Seremban', 'Pulau Sebang'],
    'Kajang': ['KL Sentral', 'Seremban', 'Pulau Sebang'],
    'UKM': ['KL Sentral', 'Seremban'],
    'Seremban': ['KL Sentral', 'Kajang', 'UKM', 'Pulau Sebang'],
    'Pulau Sebang': ['KL Sentral', 'Kajang', 'Seremban']
  };
  const dep = document.getElementById('depLocation');
  const dest = document.getElementById('destLocation');
  if (dep && dest) {
    dep.innerHTML = '<option value="">Select Origin</option>' +
      Object.keys(stationMap).map(s => `<option>${s}</option>`).join('');
    dep.addEventListener('change', () => {
      const opts = stationMap[dep.value] || [];
      dest.innerHTML = '<option value="">Select Destination</option>' +
        opts.map(s => `<option>${s}</option>`).join('');
      dest.disabled = !opts.length;
    });
  }

  // —— Pax 控制 —— //
  let pax = { adults: 0, children: 0 };
  const adultsCount = document.getElementById('adultsCount');
  const childrenCount = document.getElementById('childrenCount');
  function refreshPax() {
    adultsCount && (adultsCount.textContent = pax.adults);
    childrenCount && (childrenCount.textContent = pax.children);
  }
  document.querySelectorAll('.inc').forEach(b => {
    b.addEventListener('click', () => { pax[b.dataset.type]++; refreshPax(); });
  });
  document.querySelectorAll('.dec').forEach(b => {
    b.addEventListener('click', () => {
      if (pax[b.dataset.type] > 0) { pax[b.dataset.type]--; refreshPax(); }
    });
  });

  // —— Booking 提交 —— //
  document.getElementById('bookingForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const totalPax = pax.adults + pax.children;
    if (totalPax === 0) return alert('Please select at least one passenger!');
    if (!localStorage.getItem('username')) {
      updateAuthUI();
      toggleModal(true);
      return;
    }
    const depDateStr = document.getElementById('departure-date').value;
    if (!depDateStr) return alert('Select departure date!');
    const depDateObj = new Date(depDateStr);
    if (depDateObj < new Date().setHours(0, 0, 0, 0)) return alert('Cannot book past dates!');

    const isRound = document.getElementById('roundTrip')?.checked;
    const rec = {
      type: isRound ? 'roundtrip' : 'oneway',
      date: depDateObj.toISOString(),
      from: dep.value,
      to: dest.value,
      returnDate: isRound ? document.getElementById('return-date').value : '',
      adults: pax.adults,
      children: pax.children,
      username: localStorage.getItem('username'),
      timestamp: Date.now()
    };
    const arr = JSON.parse(localStorage.getItem('bookingRecords') || '[]');
    arr.push(rec);
    localStorage.setItem('bookingRecords', JSON.stringify(arr));
    location.href = 'booking-records.html';
  });

  // —— Round Trip 控制 —— //
  const oneWay = document.getElementById('oneWay');
  const roundTrip = document.getElementById('roundTrip');
  const retWrap = document.getElementById('retDateWrap');
  if (oneWay && roundTrip && retWrap) {
    oneWay.addEventListener('change', () => retWrap.style.display = 'none');
    roundTrip.addEventListener('change', () => retWrap.style.display = 'block');
  }

  // —— Booking Records 渲染 —— //
  const stationOrder = ['KL Sentral', 'Kajang', 'UKM', 'Seremban', 'Pulau Sebang'];
  function calculatePrice(from, to, adults, children) {
    const i1 = stationOrder.indexOf(from);
    const i2 = stationOrder.indexOf(to);
    if (i1 === -1 || i2 === -1) return 0;
    const segments = Math.abs(i2 - i1);
    const adultPrice = segments * 4;
    const childPrice = segments * 2;
    return (adults * adultPrice) + (children * childPrice);
  }

  function renderTickets() {
    const container = document.getElementById('ticketContainer');
    const noMsg = document.getElementById('noRecordsMsg');
    const username = localStorage.getItem('username');
    const allRecords = JSON.parse(localStorage.getItem('bookingRecords') || '[]');
    const records = allRecords.filter(r => r.username === username);

    container.innerHTML = '';
    if (!username || !records.length) {
      noMsg.style.display = '';
      return;
    }
    noMsg.style.display = 'none';

    records.forEach((rec) => {
      let depTime = 'N/A', arrTime = 'N/A';
      if (scheduleData[rec.from]?.[rec.to]) {
        depTime = scheduleData[rec.from][rec.to].dep;
        arrTime = scheduleData[rec.from][rec.to].arr;
      }

      let retHtml = '';
      if (rec.type === 'roundtrip' && rec.returnDate) {
        let rDep = 'N/A', rArr = 'N/A';
        if (scheduleData[rec.to]?.[rec.from]) {
          rDep = scheduleData[rec.to][rec.from].dep;
          rArr = scheduleData[rec.to][rec.from].arr;
        }
        retHtml = `
          <p><strong>Return Date:</strong> ${new Date(rec.returnDate).toLocaleDateString()}</p>
          <p><strong>Return Departure:</strong> ${rDep}</p>
          <p><strong>Return Arrival:</strong> ${rArr}</p>`;
      }

      let total = rec.adults * tripPrice + rec.children * childPrice;
	  if (rec.type === 'roundtrip') {
		  total *= 2; // round trip: double the price
		  }


      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <h4>Type: ${rec.type === 'roundtrip' ? 'Round Trip' : 'One Way'}</h4>
        <p><strong>Departure Date:</strong> ${new Date(rec.date).toLocaleDateString()}</p>
        <p><strong>From:</strong> ${rec.from}</p>
        <p><strong>To:</strong> ${rec.to}</p>
        <p><strong>Departure Time:</strong> ${depTime}</p>
        <p><strong>Arrival Time:</strong> ${arrTime}</p>
        ${retHtml}
        <p><strong>Adults:</strong> ${rec.adults}</p>
        <p><strong>Children:</strong> ${rec.children}</p>
        <p><strong>Total Price:</strong> RM${total.toFixed(2)}</p>
        <button class="delete-btn" data-index="${rec.timestamp}">Delete</button>
      `;
      container.appendChild(card);
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const ts = btn.getAttribute('data-index');
        const newRecords = allRecords.filter(r => r.timestamp != ts);
        localStorage.setItem('bookingRecords', JSON.stringify(newRecords));
        renderTickets();
      });
    });
  }

  renderTickets();
});
