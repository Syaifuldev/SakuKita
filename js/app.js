/* ============================================
   SakuKita - Main App Logic (Supabase)
   UI Interactions, Modal, Toast, Navigation
   ============================================ */

var App = {
  currentEditId: null,

  // --- Initialize ---
  init: async function() {
    try {
      await SakuKitaDB.seedDemoData();
    } catch (err) {
      console.error('[SakuKita] init error:', err);
    }
  },

  // --- Format Amount Input (tambah titik ribuan) ---
  formatAmountInput: function(input) {
    var value = input.value.replace(/\D/g, '');
    if (value === '') { input.value = ''; return; }
    input.value = new Intl.NumberFormat('id-ID').format(parseInt(value));
  },

  getAmountValue: function() {
    var el = document.getElementById('txn-amount');
    if (!el) return 0;
    var raw = el.value.replace(/\./g, '').replace(/,/g, '');
    return parseFloat(raw) || 0;
  },

  // ============ AUTH ============
  authMode: 'login',

  toggleAuthMode: function() {
    this.authMode = this.authMode === 'login' ? 'register' : 'login';
    var isLogin = this.authMode === 'login';

    document.getElementById('auth-title').textContent = isLogin ? 'Masuk' : 'Daftar Akun';
    document.getElementById('btn-auth-submit').innerHTML = isLogin
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> Masuk'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg> Daftar';

    document.getElementById('auth-toggle-text').innerHTML = isLogin
      ? 'Belum punya akun? <a href="#" onclick="App.toggleAuthMode(); return false;" style="color:var(--primary-500);font-weight:600;">Daftar</a>'
      : 'Sudah punya akun? <a href="#" onclick="App.toggleAuthMode(); return false;" style="color:var(--primary-500);font-weight:600;">Masuk</a>';

    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
  },

  handleAuth: async function(e) {
    e.preventDefault();
    e.stopPropagation();

    var username = document.getElementById('login-username').value.trim();
    var password = document.getElementById('login-password').value.trim();

    if (!username) { this.showToast('Username harus diisi', 'error'); return false; }
    if (!password) { this.showToast('Password harus diisi', 'error'); return false; }
    if (password.length < 6) { this.showToast('Password minimal 6 karakter', 'error'); return false; }

    var btn = document.getElementById('btn-auth-submit');
    var originalText = btn.innerHTML;
    btn.innerHTML = '<div class="spinner-sm"></div> Memproses...';
    btn.disabled = true;

    try {
      var result;
      if (this.authMode === 'register') {
        if (username.length < 3) {
          this.showToast('Username minimal 3 karakter', 'error');
          btn.innerHTML = originalText;
          btn.disabled = false;
          return false;
        }
        result = await SakuKitaDB.registerUser(username, password);
        if (result.error) {
          this.showToast(result.error, 'error');
          btn.innerHTML = originalText;
          btn.disabled = false;
          return false;
        }
        this.showToast('Akun berhasil dibuat! 🎉', 'success');
      } else {
        result = await SakuKitaDB.loginUser(username, password);
        if (result.error) {
          this.showToast(result.error, 'error');
          btn.innerHTML = originalText;
          btn.disabled = false;
          return false;
        }
        this.showToast('Selamat datang! 👋', 'success');
      }

      setTimeout(function() { window.location.href = 'dashboard.html'; }, 1000);
    } catch (err) {
      console.error('[SakuKita] handleAuth error:', err);
      this.showToast('Terjadi kesalahan. Coba lagi.', 'error');
      btn.innerHTML = originalText;
      btn.disabled = false;
    }

    return false;
  },

  // ============ DASHBOARD ============
  renderDashboard: async function() {
    try {
      var user = await SakuKitaDB.getUser();

      var greetingEl = document.getElementById('greeting-name');
      if (greetingEl) {
        var hour = new Date().getHours();
        var greet = 'Selamat Pagi';
        if (hour >= 11 && hour < 15) greet = 'Selamat Siang';
        else if (hour >= 15 && hour < 18) greet = 'Selamat Sore';
        else if (hour >= 18 || hour < 4) greet = 'Selamat Malam';

        document.getElementById('greeting-hello').textContent = greet + ' 👋';
        greetingEl.innerHTML = user.username + ' <span>!</span>';
      }

      document.getElementById('transaction-list').innerHTML = '<div style="text-align:center;padding:32px;"><div class="spinner"></div><p style="margin-top:12px;color:var(--neutral-400);font-size:var(--font-size-sm);">Memuat data...</p></div>';

      var summary = await SakuKitaDB.getCurrentMonthSummary();
      this.renderBalanceCard(summary);
      this.renderSummaryCards(summary);
      await this.renderRecentTransactions();
    } catch (err) {
      console.error('[SakuKita] renderDashboard error:', err);
    }
  },

  renderBalanceCard: function(summary) {
    var el = document.getElementById('balance-amount');
    if (el) el.innerHTML = '<span class="currency">Rp</span>' + SakuKitaDB.formatCurrency(summary.balance);

    var incomeEl = document.getElementById('balance-income');
    if (incomeEl) incomeEl.textContent = 'Rp ' + SakuKitaDB.formatCurrency(summary.totalIncome);

    var expenseEl = document.getElementById('balance-expense');
    if (expenseEl) expenseEl.textContent = 'Rp ' + SakuKitaDB.formatCurrency(summary.totalExpense);
  },

  renderSummaryCards: function(summary) {
    var el = document.getElementById('summary-income');
    if (el) el.textContent = 'Rp ' + SakuKitaDB.formatCurrency(summary.totalIncome);

    var el2 = document.getElementById('summary-expense');
    if (el2) el2.textContent = 'Rp ' + SakuKitaDB.formatCurrency(summary.totalExpense);

    var el3 = document.getElementById('summary-balance');
    if (el3) el3.textContent = 'Rp ' + SakuKitaDB.formatCurrency(summary.balance);

    var el4 = document.getElementById('summary-count');
    if (el4) el4.textContent = summary.count + ' catatan';
  },

  renderRecentTransactions: async function() {
    var container = document.getElementById('transaction-list');
    if (!container) return;

    try {
      var txns = await SakuKitaDB.getRecent(15);

      if (txns.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg></div><div class="empty-state__title">Belum ada catatan</div><div class="empty-state__desc">Tap tombol + untuk menambah catatan pemasukan atau pengeluaran pertamamu</div></div>';
        return;
      }

      var grouped = SakuKitaDB.groupByDate(txns);
      var html = '';
      var delay = 0;

      var dateKeys = Object.keys(grouped).sort().reverse();
      dateKeys.forEach(function(dateKey) {
        html += '<div class="transaction-group__date">' + SakuKitaDB.formatDate(dateKey) + '</div>';
        grouped[dateKey].forEach(function(t) {
          var amountClass = t.type === 'income' ? 'transaction-item__amount--income' : 'transaction-item__amount--expense';
          var iconClass = t.type === 'income' ? 'transaction-item__icon--income' : 'transaction-item__icon--expense';
          var prefix = t.type === 'income' ? '+' : '-';
          var icon = t.type === 'income' ? '📥' : '📤';

          html += '<div class="transaction-item" style="animation-delay:' + delay + 's" onclick="App.openEditTransaction(\'' + t.id + '\')">' +
            '<div class="transaction-item__icon ' + iconClass + '"><span style="font-size:20px">' + icon + '</span></div>' +
            '<div class="transaction-item__details"><div class="transaction-item__name">' + (t.description || (t.type === 'income' ? 'Pemasukan' : 'Pengeluaran')) + '</div>' +
            '<div class="transaction-item__category">' + SakuKitaDB.formatDateShort(t.date) + '</div></div>' +
            '<div><div class="transaction-item__amount ' + amountClass + '">' + prefix + ' Rp ' + SakuKitaDB.formatCurrency(t.amount) + '</div></div></div>';
          delay += 0.05;
        });
      });

      container.innerHTML = html;
    } catch (err) {
      console.error('[SakuKita] renderRecentTransactions error:', err);
      container.innerHTML = '<div class="empty-state"><div class="empty-state__title">Gagal memuat data</div><div class="empty-state__desc">Periksa koneksi internet dan coba refresh halaman</div></div>';
    }
  },

  // ============ MODAL ============
  openModal: function() {
    this.currentEditId = null;
    document.getElementById('modal-title').textContent = 'Tambah Catatan';
    document.getElementById('btn-delete-txn').classList.add('hidden');
    this.resetForm();
    this.toggleModal(true);
  },

  closeModal: function() {
    this.toggleModal(false);
    var self = this;
    setTimeout(function() { self.resetForm(); }, 300);
  },

  toggleModal: function(show) {
    var backdrop = document.getElementById('modal-backdrop');
    var modal = document.getElementById('modal-add');
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

  resetForm: function() {
    var form = document.getElementById('form-transaction');
    if (form) form.reset();
    this.setTransactionType('expense');
    var dateEl = document.getElementById('txn-date');
    if (dateEl) dateEl.valueAsDate = new Date();
  },

  setTransactionType: function(type) {
    document.querySelectorAll('.segment-control__btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.type === type);
    });
  },

  getSelectedType: function() {
    var active = document.querySelector('.segment-control__btn.active');
    return active ? active.dataset.type : 'expense';
  },

  handleSaveTransaction: async function(e) {
    e.preventDefault();
    e.stopPropagation();

    var type = this.getSelectedType();
    var amount = this.getAmountValue();
    var description = document.getElementById('txn-description').value.trim();
    var date = document.getElementById('txn-date').value;

    if (!amount || amount <= 0) { this.showToast('Jumlah harus diisi', 'error'); return false; }
    if (!description) { this.showToast('Keterangan harus diisi', 'error'); return false; }
    if (!date) { this.showToast('Tanggal harus diisi', 'error'); return false; }

    var btn = document.getElementById('btn-save-txn');
    var originalText = btn.innerHTML;
    btn.innerHTML = '<div class="spinner-sm"></div> Menyimpan...';
    btn.disabled = true;

    try {
      var txnData = { type: type, amount: amount, description: description, date: date };

      if (this.currentEditId) {
        await SakuKitaDB.update(this.currentEditId, txnData);
        this.showToast('Catatan berhasil diperbarui! ✏️', 'success');
      } else {
        await SakuKitaDB.add(txnData);
        this.showToast('Catatan berhasil ditambahkan! 🎉', 'success');
      }

      btn.innerHTML = originalText;
      btn.disabled = false;
      this.closeModal();
      await this.renderDashboard();
    } catch (err) {
      console.error('[SakuKita] handleSaveTransaction error:', err);
      this.showToast('Gagal menyimpan. Coba lagi.', 'error');
      btn.innerHTML = originalText;
      btn.disabled = false;
    }

    return false;
  },

  openEditTransaction: async function(id) {
    try {
      var txn = await SakuKitaDB.getById(id);
      if (!txn) return;

      this.currentEditId = id;
      document.getElementById('modal-title').textContent = 'Edit Catatan';
      document.getElementById('btn-delete-txn').classList.remove('hidden');

      this.setTransactionType(txn.type);
      document.getElementById('txn-amount').value = new Intl.NumberFormat('id-ID').format(txn.amount);
      document.getElementById('txn-description').value = txn.description || '';
      document.getElementById('txn-date').value = txn.date;

      this.toggleModal(true);
    } catch (err) {
      console.error('[SakuKita] openEditTransaction error:', err);
    }
  },

  deleteTransaction: async function() {
    if (!this.currentEditId) return;
    if (confirm('Yakin mau hapus catatan ini?')) {
      try {
        await SakuKitaDB.delete(this.currentEditId);
        this.showToast('Catatan berhasil dihapus 🗑️', 'success');
        this.closeModal();
        await this.renderDashboard();
      } catch (err) {
        console.error('[SakuKita] deleteTransaction error:', err);
        this.showToast('Gagal menghapus. Coba lagi.', 'error');
      }
    }
  },

  // ============ TOAST ============
  showToast: function(message, type) {
    type = type || 'info';
    var container = document.getElementById('toast-container');
    if (!container) return;

    var iconSvgs = {
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    var toastEl = document.createElement('div');
    toastEl.className = 'toast toast--' + type;
    toastEl.innerHTML = '<div class="toast__icon">' + (iconSvgs[type] || iconSvgs.info) + '</div><span class="toast__message">' + message + '</span>';

    container.appendChild(toastEl);

    setTimeout(function() {
      toastEl.style.opacity = '0';
      toastEl.style.transform = 'translateY(-10px)';
      toastEl.style.transition = 'all 0.3s ease';
      setTimeout(function() { toastEl.remove(); }, 300);
    }, 2500);
  },

  // --- Logout ---
  logout: async function() {
    if (confirm('Yakin mau keluar?')) {
      await SakuKitaDB.logoutUser();
      window.location.href = 'index.html';
    }
  },

  // ============ LAPORAN ============
  reportMonth: new Date().getMonth(),
  reportYear: new Date().getFullYear(),
  reportFilter: 'all',

  initReport: async function() {
    try {
      await this.renderReport();
    } catch (err) {
      console.error('[SakuKita] initReport error:', err);
    }
  },

  prevMonth: async function() {
    this.reportMonth--;
    if (this.reportMonth < 0) { this.reportMonth = 11; this.reportYear--; }
    await this.renderReport();
  },

  nextMonth: async function() {
    this.reportMonth++;
    if (this.reportMonth > 11) { this.reportMonth = 0; this.reportYear++; }
    await this.renderReport();
  },

  setReportFilter: async function(filter) {
    this.reportFilter = filter;
    document.querySelectorAll('.tab-filter__btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    await this.renderReport();
  },

  renderReport: async function() {
    var months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    var labelEl = document.getElementById('report-month-label');
    if (labelEl) labelEl.textContent = months[this.reportMonth] + ' ' + this.reportYear;

    var tbody = document.getElementById('report-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:32px;"><div class="spinner"></div></td></tr>';

    try {
      var txns = await SakuKitaDB.getByMonth(this.reportMonth, this.reportYear);
      var allTxns = txns.slice();

      if (this.reportFilter !== 'all') {
        txns = txns.filter(function(t) { return t.type === App.reportFilter; });
      }
      txns.sort(function(a, b) { return new Date(a.date) - new Date(b.date); });

      var summary = SakuKitaDB.getSummary(allTxns);

      var sumIncEl = document.getElementById('report-income');
      var sumExpEl = document.getElementById('report-expense');
      var sumBalEl = document.getElementById('report-balance');
      if (sumIncEl) sumIncEl.textContent = 'Rp ' + SakuKitaDB.formatCurrency(summary.totalIncome);
      if (sumExpEl) sumExpEl.textContent = 'Rp ' + SakuKitaDB.formatCurrency(summary.totalExpense);
      if (sumBalEl) sumBalEl.textContent = 'Rp ' + SakuKitaDB.formatCurrency(summary.balance);

      this.renderReportTable(txns, summary);
    } catch (err) {
      console.error('[SakuKita] renderReport error:', err);
    }
  },

  renderReportTable: function(txns, summary) {
    var tbody = document.getElementById('report-tbody');
    var tfoot = document.getElementById('report-tfoot');
    if (!tbody) return;

    if (txns.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:32px; color:var(--neutral-400);">Tidak ada data di bulan ini</td></tr>';
      if (tfoot) tfoot.innerHTML = '';
      return;
    }

    var html = '';
    var runningBalance = 0;

    txns.forEach(function(t, idx) {
      var sign = t.type === 'income' ? '+' : '-';
      var amtColor = t.type === 'income' ? 'var(--success)' : 'var(--danger)';

      if (t.type === 'income') runningBalance += parseFloat(t.amount);
      else runningBalance -= parseFloat(t.amount);

      html += '<tr><td>' + (idx + 1) + '</td><td>' + SakuKitaDB.formatDateShort(t.date) + '</td><td>' +
        (t.description || (t.type === 'income' ? 'Pemasukan' : 'Pengeluaran')) +
        '</td><td style="color:' + amtColor + ';font-weight:600">' + sign + ' Rp ' + SakuKitaDB.formatCurrency(t.amount) +
        '</td><td style="font-weight:600">Rp ' + SakuKitaDB.formatCurrency(runningBalance) + '</td></tr>';
    });

    tbody.innerHTML = html;

    if (tfoot) {
      tfoot.innerHTML = '<tr><td colspan="3" style="text-align:right;font-weight:700;">Total</td>' +
        '<td style="color:var(--success);font-weight:700">+ Rp ' + SakuKitaDB.formatCurrency(summary.totalIncome) + '</td>' +
        '<td style="color:var(--danger);font-weight:700">- Rp ' + SakuKitaDB.formatCurrency(summary.totalExpense) + '</td></tr>';
    }
  },

  // --- Export PDF ---
  exportPDF: async function() {
    var months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    try {
      var txns = await SakuKitaDB.getByMonth(this.reportMonth, this.reportYear);
      txns.sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
      var summary = SakuKitaDB.getSummary(txns);
      var monthName = months[this.reportMonth] + ' ' + this.reportYear;
      var user = await SakuKitaDB.getUser();

      var rows = '';
      var runBal = 0;
      txns.forEach(function(t, i) {
        var sign = t.type === 'income' ? '+' : '-';
        if (t.type === 'income') runBal += parseFloat(t.amount); else runBal -= parseFloat(t.amount);
        rows += '<tr><td style="padding:6px 10px;border:1px solid #ddd;text-align:center">' + (i + 1) + '</td>' +
          '<td style="padding:6px 10px;border:1px solid #ddd">' + SakuKitaDB.formatDateShort(t.date) + '</td>' +
          '<td style="padding:6px 10px;border:1px solid #ddd">' + (t.description || '-') + '</td>' +
          '<td style="padding:6px 10px;border:1px solid #ddd;color:' + (t.type === 'income' ? '#22C55E' : '#EF4444') + ';font-weight:600">' + sign + ' Rp ' + SakuKitaDB.formatCurrency(t.amount) + '</td>' +
          '<td style="padding:6px 10px;border:1px solid #ddd;font-weight:600">Rp ' + SakuKitaDB.formatCurrency(runBal) + '</td></tr>';
      });

      var printContent = '<html><head><title>Laporan Keuangan - ' + monthName + '</title>' +
        '<style>@import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap");' +
        'body{font-family:"Plus Jakarta Sans",sans-serif;padding:30px;color:#1E293B}' +
        'h1{color:#2D6EB5;font-size:22px;margin-bottom:4px}h2{color:#64748B;font-size:14px;font-weight:500;margin-bottom:20px}' +
        '.summary{display:flex;gap:16px;margin-bottom:24px}.summary div{flex:1;background:#F8FAFC;border-radius:8px;padding:12px;text-align:center}' +
        '.summary .label{font-size:11px;color:#94A3B8;font-weight:600}.summary .value{font-size:16px;font-weight:700;margin-top:4px}' +
        'table{width:100%;border-collapse:collapse;font-size:13px}thead{background:#2D6EB5;color:white}' +
        'th{padding:8px 10px;text-align:left;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.5px}' +
        'tbody tr:nth-child(even){background:#F8FAFC}.footer{margin-top:24px;text-align:center;font-size:11px;color:#94A3B8}' +
        '</style></head><body>' +
        '<h1>📒 Laporan Keuangan SakuKita</h1>' +
        '<h2>Periode: ' + monthName + ' — ' + (user ? user.username : '') + '</h2>' +
        '<div class="summary"><div><div class="label">Pemasukan</div><div class="value" style="color:#22C55E">Rp ' + SakuKitaDB.formatCurrency(summary.totalIncome) + '</div></div>' +
        '<div><div class="label">Pengeluaran</div><div class="value" style="color:#EF4444">Rp ' + SakuKitaDB.formatCurrency(summary.totalExpense) + '</div></div>' +
        '<div><div class="label">Saldo</div><div class="value" style="color:#2D6EB5">Rp ' + SakuKitaDB.formatCurrency(summary.balance) + '</div></div></div>' +
        '<table><thead><tr><th>No</th><th>Tanggal</th><th>Keterangan</th><th>Jumlah</th><th>Saldo</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table>' +
        '<div class="footer">Dicetak dari SakuKita — ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) + '</div>' +
        '</body></html>';

      var printWindow = window.open('', '_blank');
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(function() { printWindow.print(); }, 500);
    } catch (err) {
      console.error('[SakuKita] exportPDF error:', err);
      this.showToast('Gagal export PDF. Coba lagi.', 'error');
    }
  }
};
