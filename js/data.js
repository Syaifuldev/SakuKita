/* ============================================
   SakuKita - Data Management (Supabase)
   CRUD operasi transaksi keuangan
   ============================================ */

const SakuKitaDB = {

  // --- Get Current User ---
  async getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Get profile with username
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    return profile ? { id: user.id, username: profile.username } : null;
  },

  // --- Register ---
  async registerUser(username, password) {
    // Check if username is taken
    const { data: existing } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single();

    if (existing) return { error: 'Username sudah dipakai' };

    // Sign up with fake email (username@sakukita.app)
    const email = `${username.toLowerCase().replace(/\s+/g, '')}@sakukita.app`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) return { error: error.message };

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: data.user.id, username });

    if (profileError) return { error: profileError.message };

    return { user: { id: data.user.id, username } };
  },

  // --- Login ---
  async loginUser(username, password) {
    const email = `${username.toLowerCase().replace(/\s+/g, '')}@sakukita.app`;
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) return { error: 'Username atau password salah' };
    return { user: { id: data.user.id, username } };
  },

  // --- Logout ---
  async logoutUser() {
    await supabase.auth.signOut();
  },

  // --- Get All Transactions (current user) ---
  async getAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    return error ? [] : data;
  },

  // --- Add Transaction ---
  async add(transaction) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        date: transaction.date
      })
      .select()
      .single();

    return error ? null : data;
  },

  // --- Update Transaction ---
  async update(id, updatedData) {
    const { data, error } = await supabase
      .from('transactions')
      .update({
        type: updatedData.type,
        amount: updatedData.amount,
        description: updatedData.description,
        date: updatedData.date
      })
      .eq('id', id)
      .select()
      .single();

    return error ? null : data;
  },

  // --- Delete Transaction ---
  async delete(id) {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    return !error;
  },

  // --- Get Transaction By ID ---
  async getById(id) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();

    return error ? null : data;
  },

  // --- Filter By Month/Year ---
  async getByMonth(month, year) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endMonth = month + 1 > 11 ? 0 : month + 1;
    const endYear = month + 1 > 11 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth + 1).padStart(2, '0')}-01`;

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lt('date', endDate)
      .order('date', { ascending: true });

    return error ? [] : data;
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
  async getCurrentMonthSummary() {
    const now = new Date();
    const monthTxns = await this.getByMonth(now.getMonth(), now.getFullYear());
    return this.getSummary(monthTxns);
  },

  // --- Get Recent Transactions ---
  async getRecent(limit = 15) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(limit);

    return error ? [] : data;
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
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  },

  formatDateShort(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  },

  // --- Seed Demo Data ---
  async seedDemoData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Cek apakah user ini sudah punya data
    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (count > 0) return;

    const now = new Date();
    const year = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');

    const demoData = [
      { user_id: user.id, type: 'income', amount: 5000000, description: 'Gaji Bulanan', date: `${year}-${mm}-01` },
      { user_id: user.id, type: 'expense', amount: 150000, description: 'Makan siang & kopi', date: `${year}-${mm}-02` },
      { user_id: user.id, type: 'expense', amount: 50000, description: 'Grab ke kantor', date: `${year}-${mm}-02` },
      { user_id: user.id, type: 'income', amount: 1200000, description: 'Proyek desain web', date: `${year}-${mm}-05` },
      { user_id: user.id, type: 'expense', amount: 350000, description: 'Belanja mingguan', date: `${year}-${mm}-07` },
      { user_id: user.id, type: 'expense', amount: 500000, description: 'Tagihan listrik & WiFi', date: `${year}-${mm}-10` },
      { user_id: user.id, type: 'expense', amount: 100000, description: 'Nonton bioskop', date: `${year}-${mm}-12` },
      { user_id: user.id, type: 'income', amount: 300000, description: 'Hadiah ulang tahun', date: `${year}-${mm}-15` },
      { user_id: user.id, type: 'expense', amount: 250000, description: 'Vitamin & suplemen', date: `${year}-${mm}-18` },
      { user_id: user.id, type: 'expense', amount: 75000, description: 'Cemilan & minuman', date: `${year}-${mm}-20` },
      { user_id: user.id, type: 'income', amount: 800000, description: 'Penjualan online', date: `${year}-${mm}-22` },
      { user_id: user.id, type: 'expense', amount: 200000, description: 'Beli buku & kursus', date: `${year}-${mm}-25` },
    ];

    await supabase.from('transactions').insert(demoData);
  }
};
