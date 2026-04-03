/* ============================================
   SakuKita - Main App Logic
   UI Interactions, Modal, Toast, Navigation
   ============================================ */

const App = {
  currentEditId: null,

  // --- Initialize ---
  init() {
    SakuKitaDB.seedDemoData();
  },

  // ============ AUTH ============
  authMode: 'login',

  toggleAuthMode() {
    this.authMode = this.authMode === 'login' ? 'register' : 'login';
    const isLogin = this.authMode === 'login';

    document.getElementById('auth-title').textContent = isLogin ? 'Masuk' : 'Daftar Akun';
    document.getElementById('btn-auth-submit').innerHTML = isLogin
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> Masuk`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg> Daftar`;

    document.getElementById('auth-toggle-text').innerHTML = isLogin
      ? 'Belum punya akun? <a href="#" onclick="App.toggleAuthMode(); return false;">Daftar</a>'
      : 'Sudah punya akun? <a href="#" onclick="App.toggleAuthMode(); return false;">Masuk</a>';

    // Clear fields
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
  },

  handleAuth(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();

    if (!username) { this.showToast('Username harus diisi', 'error'); return; }
    if (!password) { this.showToast('Password harus diisi', 'error'); return; }
    if (password.length < 4) { this.showToast('Password minimal 4 karakter', 'error'); return; }

    let result;
    if (this.authMode === 'register') {
      if (username.length < 3) { this.showToast('Username minimal 3 karakter', 'error'); return; }
      result = SakuKitaDB.registerUser(username, password);
      if (result.error) { this.showToast(result.error, 'error'); return; }
      this.showToast('Akun berhasil dibuat! 🎉', 'success');
    } else {
      result = SakuKitaDB.loginUser(username, password);
      if (result.error) { this.showToast(result.error, 'error'); return; }
      this.showToast('Selamat datang! 👋', 'success');
    }

    setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
  },

  // ============ DASHBOARD ============
  renderDashboard() {
    const user = SakuKitaDB.getUser();
    if (!user) { window.location.href = 'index.html'; return; }

    // Greeting
    const greetingEl = document.getElementById('greeting-name');
    if (greetingEl) {
      const hour = new Date().getHours();
      let greet = 'Selamat Pagi';
      if (hour >= 11 && hour < 15) greet = 'Selamat Siang';
      else if (hour >= 15 && hour < 18) greet = 'Selamat Sore';
      else if (hour >= 18 || hour < 4) greet = 'Selamat Malam';

      document.getElementById('greeting-hello').textContent = greet + ' 👋';
      greetingEl.innerHTML = user.username + ' <span>!</span>';
    }

    const summary = SakuKitaDB.getCurrentMonthSummary();
    this.renderBalanceCard(summary);
    this.renderSummaryCards(summary);
    this.renderRecentTransactions();
  },

  renderBalanceCard(summary) {
    const el = document.getElementById('balance-amount');
    if (el) el.innerHTML = `<span class="currency">Rp</span>${SakuKitaDB.formatCurrency(summary.balance)}`;

    const incomeEl = document.getElementById('balance-income');
    if (incomeEl) incomeEl.textContent = `Rp ${SakuKitaDB.formatCurrency(summary.totalIncome)}`;

    const expenseEl = document.getElementById('balance-expense');
    if (expenseEl) expenseEl.textContent = `Rp ${SakuKitaDB.formatCurrency(summary.totalExpense)}`;
  },

  renderSummaryCards(summary) {
    const el = document.getElementById('summary-income');
    if (el) el.textContent = `Rp ${SakuKitaDB.formatCurrency(summary.totalIncome)}`;

    const el2 = document.getElementById('summary-expense');
    if (el2) el2.textContent = `Rp ${SakuKitaDB.formatCurrency(summary.totalExpense)}`;

    const el3 = document.getElementById('summary-balance');
    if (el3) el3.textContent = `Rp ${SakuKitaDB.formatCurrency(summary.balance)}`;

    const el4 = document.getElementById('summary-count');
    if (el4) el4.textContent = `${summary.count} catatan`;
  },

  renderRecentTransactions() {
    const container = document.getElementById('transaction-list');
    if (!container) return;

    const txns = SakuKitaDB.getRecent(15);

    if (txns.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
            </svg>
          </div>
          <div class="empty-state__title">Belum ada catatan</div>
          <div class="empty-state__desc">Tap tombol + untuk menambah catatan pemasukan atau pengeluaran pertamamu</div>
        </div>`;
      return;
    }

    const grouped = SakuKitaDB.groupByDate(txns);
    let html = '';
    let delay = 0;

    Object.keys(grouped).sort().reverse().forEach(dateKey => {
      html += `<div class="transaction-group__date">${SakuKitaDB.formatDate(dateKey)}</div>`;
      grouped[dateKey].forEach(t => {
        const amountClass = t.type === 'income' ? 'transaction-item__amount--income' : 'transaction-item__amount--expense';
        const iconClass = t.type === 'income' ? 'transaction-item__icon--income' : 'transaction-item__icon--expense';
        const prefix = t.type === 'income' ? '+' : '-';
        const icon = t.type === 'income' ? '📥' : '📤';

        html += `
          <div class="transaction-item" style="animation-delay: ${delay}s" onclick="App.openEditTransaction('${t.id}')">
            <div class="transaction-item__icon ${iconClass}">
              <span style="font-size: 20px">${icon}</span>
            </div>
            <div class="transaction-item__details">
              <div class="transaction-item__name">${t.description || (t.type === 'income' ? 'Pemasukan' : 'Pengeluaran')}</div>
              <div class="transaction-item__category">${SakuKitaDB.formatDateShort(t.date)}</div>
            </div>
            <div>
              <div class="transaction-item__amount ${amountClass}">${prefix} Rp ${SakuKitaDB.formatCurrency(t.amount)}</div>
            </div>
          </div>`;
        delay += 0.05;
      });
    });

    container.innerHTML = html;
  },

  // ============ MODAL ============
  openModal() {
    this.currentEditId = null;
    document.getElementById('modal-title').textContent = 'Tambah Catatan';
    document.getElementById('btn-delete-txn').classList.add('hidden');
    this.resetForm();
    this.toggleModal(true);
  },

  closeModal() {
    this.toggleModal(false);
    setTimeout(() => this.resetForm(), 300);
  },

  toggleModal(show) {
    const backdrop = document.getElementById('modal-backdrop');
    const modal = document.getElementById('modal-add');
    if (show) {
      backdrop.classList.add('active');
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    } else {
      backdrop.classList.remove('active');
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  resetForm() {
    const form = document.getElementById('form-transaction');
    if (form) form.reset();
    this.setTransactionType('expense');
    // Reset date to today
    const dateEl = document.getElementById('txn-date');
    if (dateEl) dateEl.valueAsDate = new Date();
  },

  setTransactionType(type) {
    document.querySelectorAll('.segment-control__btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });
  },

  getSelectedType() {
    const active = document.querySelector('.segment-control__btn.active');
    return active ? active.dataset.type : 'expense';
  },

  // --- Save Transaction ---
  handleSaveTransaction(e) {
    e.preventDefault();

    const type = this.getSelectedType();
    const amount = parseFloat(document.getElementById('txn-amount').value);
    const description = document.getElementById('txn-description').value.trim();
    const date = document.getElementById('txn-date').value;

    if (!amount || amount <= 0) { this.showToast('Jumlah harus diisi', 'error'); return; }
    if (!description) { this.showToast('Keterangan harus diisi', 'error'); return; }
    if (!date) { this.showToast('Tanggal harus diisi', 'error'); return; }

    const txnData = { type, amount, description, date };

    if (this.currentEditId) {
      SakuKitaDB.update(this.currentEditId, txnData);
      this.showToast('Catatan berhasil diperbarui! ✏️', 'success');
    } else {
      SakuKitaDB.add(txnData);
      this.showToast('Catatan berhasil ditambahkan! 🎉', 'success');
    }

    this.closeModal();
    this.renderDashboard();
  },

  // --- Edit Transaction ---
  openEditTransaction(id) {
    const txn = SakuKitaDB.getById(id);
    if (!txn) return;

    this.currentEditId = id;
    document.getElementById('modal-title').textContent = 'Edit Catatan';
    document.getElementById('btn-delete-txn').classList.remove('hidden');

    this.setTransactionType(txn.type);
    document.getElementById('txn-amount').value = txn.amount;
    document.getElementById('txn-description').value = txn.description || '';
    document.getElementById('txn-date').value = txn.date;

    this.toggleModal(true);
  },

  // --- Delete Transaction ---
  deleteTransaction() {
    if (!this.currentEditId) return;
    if (confirm('Yakin mau hapus catatan ini?')) {
      SakuKitaDB.delete(this.currentEditId);
      this.showToast('Catatan berhasil dihapus 🗑️', 'success');
      this.closeModal();
      this.renderDashboard();
    }
  },

  // ============ TOAST ============
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const iconSvgs = {
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    const toastEl = document.createElement('div');
    toastEl.className = `toast toast--${type}`;
    toastEl.innerHTML = `
      <div class="toast__icon">${iconSvgs[type] || iconSvgs.info}</div>
      <span class="toast__message">${message}</span>`;

    container.appendChild(toastEl);

    setTimeout(() => {
      toastEl.style.opacity = '0';
      toastEl.style.transform = 'translateY(-10px)';
      toastEl.style.transition = 'all 0.3s ease';
      setTimeout(() => toastEl.remove(), 300);
    }, 2500);
  },

  // --- Logout ---
  logout() {
    if (confirm('Yakin mau keluar?')) {
      SakuKitaDB.logoutUser();
      window.location.href = 'index.html';
    }
  },

  // ============ LAPORAN ============
  reportMonth: new Date().getMonth(),
  reportYear: new Date().getFullYear(),
  reportFilter: 'all',

  initReport() {
    const user = SakuKitaDB.getUser();
    if (!user) { window.location.href = 'index.html'; return; }
    this.renderReport();
  },

  prevMonth() {
    this.reportMonth--;
    if (this.reportMonth < 0) { this.reportMonth = 11; this.reportYear--; }
    this.renderReport();
  },

  nextMonth() {
    this.reportMonth++;
    if (this.reportMonth > 11) { this.reportMonth = 0; this.reportYear++; }
    this.renderReport();
  },

  setReportFilter(filter) {
    this.reportFilter = filter;
    document.querySelectorAll('.tab-filter__btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    this.renderReport();
  },

  renderReport() {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    const labelEl = document.getElementById('report-month-label');
    if (labelEl) labelEl.textContent = `${months[this.reportMonth]} ${this.reportYear}`;

    let txns = SakuKitaDB.getByMonth(this.reportMonth, this.reportYear);
    if (this.reportFilter !== 'all') {
      txns = txns.filter(t => t.type === this.reportFilter);
    }
    txns.sort((a, b) => new Date(a.date) - new Date(b.date));

    const summary = SakuKitaDB.getSummary(
      SakuKitaDB.getByMonth(this.reportMonth, this.reportYear)
    );

    const sumIncEl = document.getElementById('report-income');
    const sumExpEl = document.getElementById('report-expense');
    const sumBalEl = document.getElementById('report-balance');
    if (sumIncEl) sumIncEl.textContent = `Rp ${SakuKitaDB.formatCurrency(summary.totalIncome)}`;
    if (sumExpEl) sumExpEl.textContent = `Rp ${SakuKitaDB.formatCurrency(summary.totalExpense)}`;
    if (sumBalEl) sumBalEl.textContent = `Rp ${SakuKitaDB.formatCurrency(summary.balance)}`;

    this.renderReportTable(txns, summary);
  },

  renderReportTable(txns, summary) {
    const tbody = document.getElementById('report-tbody');
    const tfoot = document.getElementById('report-tfoot');
    if (!tbody) return;

    if (txns.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:32px; color:var(--neutral-400);">Tidak ada data di bulan ini</td></tr>`;
      if (tfoot) tfoot.innerHTML = '';
      return;
    }

    let html = '';
    let runningBalance = 0;

    txns.forEach((t, idx) => {
      const sign = t.type === 'income' ? '+' : '-';
      const amtColor = t.type === 'income' ? 'var(--success)' : 'var(--danger)';

      if (t.type === 'income') runningBalance += t.amount;
      else runningBalance -= t.amount;

      html += `
        <tr>
          <td>${idx + 1}</td>
          <td>${SakuKitaDB.formatDateShort(t.date)}</td>
          <td>${t.description || (t.type === 'income' ? 'Pemasukan' : 'Pengeluaran')}</td>
          <td style="color:${amtColor}; font-weight:600">${sign} Rp ${SakuKitaDB.formatCurrency(t.amount)}</td>
          <td style="font-weight:600">Rp ${SakuKitaDB.formatCurrency(runningBalance)}</td>
        </tr>`;
    });

    tbody.innerHTML = html;

    if (tfoot) {
      tfoot.innerHTML = `
        <tr>
          <td colspan="3" style="text-align:right; font-weight:700;">Total</td>
          <td style="color:var(--success); font-weight:700">+ Rp ${SakuKitaDB.formatCurrency(summary.totalIncome)}</td>
          <td style="color:var(--danger); font-weight:700">- Rp ${SakuKitaDB.formatCurrency(summary.totalExpense)}</td>
        </tr>`;
    }
  },

  // --- Export PDF ---
  exportPDF() {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    const txns = SakuKitaDB.getByMonth(this.reportMonth, this.reportYear);
    txns.sort((a, b) => new Date(a.date) - new Date(b.date));
    const summary = SakuKitaDB.getSummary(txns);
    const monthName = `${months[this.reportMonth]} ${this.reportYear}`;
    const user = SakuKitaDB.getUser();

    let rows = '';
    let runBal = 0;
    txns.forEach((t, i) => {
      const sign = t.type === 'income' ? '+' : '-';
      if (t.type === 'income') runBal += t.amount; else runBal -= t.amount;
      rows += `<tr>
        <td style="padding:6px 10px; border:1px solid #ddd; text-align:center">${i + 1}</td>
        <td style="padding:6px 10px; border:1px solid #ddd">${SakuKitaDB.formatDateShort(t.date)}</td>
        <td style="padding:6px 10px; border:1px solid #ddd">${t.description || '-'}</td>
        <td style="padding:6px 10px; border:1px solid #ddd; color:${t.type === 'income' ? '#22C55E' : '#EF4444'}; font-weight:600">${sign} Rp ${SakuKitaDB.formatCurrency(t.amount)}</td>
        <td style="padding:6px 10px; border:1px solid #ddd; font-weight:600">Rp ${SakuKitaDB.formatCurrency(runBal)}</td>
      </tr>`;
    });

    const printContent = `
      <html>
      <head>
        <title>Laporan Keuangan - ${monthName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap');
          body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 30px; color: #1E293B; }
          h1 { color: #2D6EB5; font-size: 22px; margin-bottom: 4px; }
          h2 { color: #64748B; font-size: 14px; font-weight: 500; margin-bottom: 20px; }
          .summary { display: flex; gap: 16px; margin-bottom: 24px; }
          .summary div { flex:1; background:#F8FAFC; border-radius:8px; padding:12px; text-align:center; }
          .summary .label { font-size:11px; color:#94A3B8; font-weight:600; }
          .summary .value { font-size:16px; font-weight:700; margin-top:4px; }
          table { width:100%; border-collapse:collapse; font-size:13px; }
          thead { background:#2D6EB5; color:white; }
          th { padding:8px 10px; text-align:left; font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; }
          tbody tr:nth-child(even) { background:#F8FAFC; }
          .footer { margin-top:24px; text-align:center; font-size:11px; color:#94A3B8; }
        </style>
      </head>
      <body>
        <h1>📒 Laporan Keuangan SakuKita</h1>
        <h2>Periode: ${monthName} — ${user ? user.username : ''}</h2>
        <div class="summary">
          <div><div class="label">Pemasukan</div><div class="value" style="color:#22C55E">Rp ${SakuKitaDB.formatCurrency(summary.totalIncome)}</div></div>
          <div><div class="label">Pengeluaran</div><div class="value" style="color:#EF4444">Rp ${SakuKitaDB.formatCurrency(summary.totalExpense)}</div></div>
          <div><div class="label">Saldo</div><div class="value" style="color:#2D6EB5">Rp ${SakuKitaDB.formatCurrency(summary.balance)}</div></div>
        </div>
        <table>
          <thead>
            <tr><th>No</th><th>Tanggal</th><th>Keterangan</th><th>Jumlah</th><th>Saldo</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">Dicetak dari SakuKita — ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </body>
      </html>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  }
};
