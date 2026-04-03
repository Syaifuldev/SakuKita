/* ============================================
   SakuKita - Data Management (LocalStorage)
   CRUD operasi transaksi keuangan
   ============================================ */

const SakuKitaDB = {
  STORAGE_KEY: 'sakukita_transactions',
  USER_KEY: 'sakukita_user',

  // --- Generate unique ID ---
  generateId() {
    return 'txn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  },

  // --- User ---
  getUser() {
    const data = localStorage.getItem(this.USER_KEY);
    return data ? JSON.parse(data) : null;
  },

  saveUser(user) {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  // --- Get All Users (for login validation) ---
  getAllUsers() {
    const data = localStorage.getItem('sakukita_users');
    return data ? JSON.parse(data) : [];
  },

  saveAllUsers(users) {
    localStorage.setItem('sakukita_users', JSON.stringify(users));
  },

  registerUser(username, password) {
    const users = this.getAllUsers();
    const exists = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (exists) return { error: 'Username sudah dipakai' };

    const newUser = {
      id: 'usr_' + Date.now(),
      username,
      password,
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    this.saveAllUsers(users);
    this.saveUser(newUser);
    return { user: newUser };
  },

  loginUser(username, password) {
    const users = this.getAllUsers();
    const found = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (!found) return { error: 'Username atau password salah' };
    this.saveUser(found);
    return { user: found };
  },

  logoutUser() {
    localStorage.removeItem(this.USER_KEY);
  },

  // --- Get All Transactions (for current user) ---
  getAll() {
    const user = this.getUser();
    if (!user) return [];
    const data = localStorage.getItem(this.STORAGE_KEY);
    const all = data ? JSON.parse(data) : [];
    return all.filter(t => t.userId === user.id);
  },

  // --- Save All ---
  _saveAllRaw(transactions) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(transactions));
  },

  _getAllRaw() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  // --- Add Transaction ---
  add(transaction) {
    const user = this.getUser();
    if (!user) return null;
    const allTxns = this._getAllRaw();
    const newTxn = {
      id: this.generateId(),
      userId: user.id,
      ...transaction,
      createdAt: new Date().toISOString()
    };
    allTxns.unshift(newTxn);
    this._saveAllRaw(allTxns);
    return newTxn;
  },

  // --- Update Transaction ---
  update(id, updatedData) {
    const allTxns = this._getAllRaw();
    const idx = allTxns.findIndex(t => t.id === id);
    if (idx === -1) return null;
    allTxns[idx] = { ...allTxns[idx], ...updatedData, updatedAt: new Date().toISOString() };
    this._saveAllRaw(allTxns);
    return allTxns[idx];
  },

  // --- Delete Transaction ---
  delete(id) {
    const allTxns = this._getAllRaw();
    const filtered = allTxns.filter(t => t.id !== id);
    this._saveAllRaw(filtered);
  },

  // --- Get Transaction By ID ---
  getById(id) {
    return this._getAllRaw().find(t => t.id === id) || null;
  },

  // --- Filter By Month/Year ---
  getByMonth(month, year) {
    return this.getAll().filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });
  },

  // --- Calculate Summary ---
  getSummary(transactions) {
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(t => {
      const amount = parseFloat(t.amount) || 0;
      if (t.type === 'income') totalIncome += amount;
      else if (t.type === 'expense') totalExpense += amount;
    });

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      count: transactions.length
    };
  },

  // --- Get Summary for Current Month ---
  getCurrentMonthSummary() {
    const now = new Date();
    const monthTxns = this.getByMonth(now.getMonth(), now.getFullYear());
    return this.getSummary(monthTxns);
  },

  // --- Get Recent Transactions ---
  getRecent(limit = 15) {
    const txns = this.getAll();
    txns.sort((a, b) => new Date(b.date) - new Date(a.date));
    return txns.slice(0, limit);
  },

  // --- Group By Date ---
  groupByDate(transactions) {
    const grouped = {};
    transactions.forEach(t => {
      const dateKey = t.date;
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(t);
    });
    return grouped;
  },

  // --- Format Currency ---
  formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  },

  // --- Format Date ---
  formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  },

  formatDateShort(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  },

  // --- Seed Demo Data ---
  seedDemoData() {
    const user = this.getUser();
    if (!user) return;
    // Cek apakah user ini sudah punya data
    if (this.getAll().length > 0) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const mm = String(month + 1).padStart(2, '0');

    const demoData = [
      { type: 'income', amount: 5000000, description: 'Gaji Bulanan', date: `${year}-${mm}-01` },
      { type: 'expense', amount: 150000, description: 'Makan siang & kopi', date: `${year}-${mm}-02` },
      { type: 'expense', amount: 50000, description: 'Grab ke kantor', date: `${year}-${mm}-02` },
      { type: 'income', amount: 1200000, description: 'Proyek desain web', date: `${year}-${mm}-05` },
      { type: 'expense', amount: 350000, description: 'Belanja mingguan', date: `${year}-${mm}-07` },
      { type: 'expense', amount: 500000, description: 'Tagihan listrik & WiFi', date: `${year}-${mm}-10` },
      { type: 'expense', amount: 100000, description: 'Nonton bioskop', date: `${year}-${mm}-12` },
      { type: 'income', amount: 300000, description: 'Hadiah ulang tahun', date: `${year}-${mm}-15` },
      { type: 'expense', amount: 250000, description: 'Vitamin & suplemen', date: `${year}-${mm}-18` },
      { type: 'expense', amount: 75000, description: 'Cemilan & minuman', date: `${year}-${mm}-20` },
      { type: 'income', amount: 800000, description: 'Penjualan online', date: `${year}-${mm}-22` },
      { type: 'expense', amount: 200000, description: 'Beli buku & kursus', date: `${year}-${mm}-25` },
    ];

    demoData.forEach(d => this.add(d));
  }
};
