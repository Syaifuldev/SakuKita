/* ============================================
   SakuKita - Data Management (Supabase)
   CRUD operasi transaksi keuangan
   ============================================ */

var SakuKitaDB = {

  // Cache user agar tidak query berulang
  _currentUser: null,

  // --- Set Current User (dipanggil dari onAuthStateChange) ---
  setCurrentUser: function(session) {
    if (session && session.user) {
      this._currentUser = { id: session.user.id };
    } else {
      this._currentUser = null;
    }
  },

  // --- Get User ID (dari cache) ---
  getUserId: function() {
    return this._currentUser ? this._currentUser.id : null;
  },

  // --- Get User Profile (username) ---
  getUser: async function() {
    var userId = this.getUserId();
    if (!userId) return null;

    try {
      var result = await supabaseClient
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();

      if (result.data) {
        return { id: userId, username: result.data.username };
      }
      return null;
    } catch (err) {
      console.error('[SakuKita] getUser error:', err);
      return null;
    }
  },

  // --- Register ---
  registerUser: async function(username, password) {
    try {
      // Check if username is taken
      var existResult = await supabaseClient
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single();

      if (existResult.data) return { error: 'Username sudah dipakai' };

      // Sign up with fake email
      var email = username.toLowerCase().replace(/[^a-z0-9]/g, '') + '@sakukita.app';
      var signUpResult = await supabaseClient.auth.signUp({
        email: email,
        password: password
      });

      if (signUpResult.error) {
        console.error('[SakuKita] signUp error:', signUpResult.error);
        return { error: signUpResult.error.message };
      }

      var userId = signUpResult.data.user.id;

      // Create profile
      var profileResult = await supabaseClient
        .from('profiles')
        .insert({ id: userId, username: username });

      if (profileResult.error) {
        console.error('[SakuKita] profile insert error:', profileResult.error);
        return { error: profileResult.error.message };
      }

      return { user: { id: userId, username: username } };
    } catch (err) {
      console.error('[SakuKita] registerUser error:', err);
      return { error: 'Terjadi kesalahan. Coba lagi.' };
    }
  },

  // --- Login ---
  loginUser: async function(username, password) {
    try {
      var email = username.toLowerCase().replace(/[^a-z0-9]/g, '') + '@sakukita.app';
      var result = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (result.error) {
        console.error('[SakuKita] login error:', result.error);
        return { error: 'Username atau password salah' };
      }

      return { user: { id: result.data.user.id, username: username } };
    } catch (err) {
      console.error('[SakuKita] loginUser error:', err);
      return { error: 'Gagal login. Periksa koneksi internet.' };
    }
  },

  // --- Logout ---
  logoutUser: async function() {
    try {
      this._currentUser = null;
      await supabaseClient.auth.signOut();
    } catch (err) {
      console.error('[SakuKita] logout error:', err);
    }
  },

  // --- Get All Transactions ---
  getAll: async function() {
    var userId = this.getUserId();
    if (!userId) return [];

    try {
      var result = await supabaseClient
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      return result.data || [];
    } catch (err) {
      console.error('[SakuKita] getAll error:', err);
      return [];
    }
  },

  // --- Add Transaction ---
  add: async function(transaction) {
    var userId = this.getUserId();
    if (!userId) return null;

    try {
      var result = await supabaseClient
        .from('transactions')
        .insert({
          user_id: userId,
          type: transaction.type,
          amount: transaction.amount,
          description: transaction.description,
          date: transaction.date
        })
        .select()
        .single();

      if (result.error) {
        console.error('[SakuKita] add error:', result.error);
        return null;
      }
      return result.data;
    } catch (err) {
      console.error('[SakuKita] add error:', err);
      return null;
    }
  },

  // --- Update Transaction ---
  update: async function(id, updatedData) {
    try {
      var result = await supabaseClient
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

      return result.data || null;
    } catch (err) {
      console.error('[SakuKita] update error:', err);
      return null;
    }
  },

  // --- Delete Transaction ---
  delete: async function(id) {
    try {
      var result = await supabaseClient
        .from('transactions')
        .delete()
        .eq('id', id);

      return !result.error;
    } catch (err) {
      console.error('[SakuKita] delete error:', err);
      return false;
    }
  },

  // --- Get Transaction By ID ---
  getById: async function(id) {
    try {
      var result = await supabaseClient
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();

      return result.data || null;
    } catch (err) {
      console.error('[SakuKita] getById error:', err);
      return null;
    }
  },

  // --- Filter By Month/Year ---
  getByMonth: async function(month, year) {
    var userId = this.getUserId();
    if (!userId) return [];

    try {
      var startDate = year + '-' + String(month + 1).padStart(2, '0') + '-01';
      var endMonth = month + 1 > 11 ? 0 : month + 1;
      var endYear = month + 1 > 11 ? year + 1 : year;
      var endDate = endYear + '-' + String(endMonth + 1).padStart(2, '0') + '-01';

      var result = await supabaseClient
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lt('date', endDate)
        .order('date', { ascending: true });

      return result.data || [];
    } catch (err) {
      console.error('[SakuKita] getByMonth error:', err);
      return [];
    }
  },

  // --- Calculate Summary (sync) ---
  getSummary: function(transactions) {
    var totalIncome = 0;
    var totalExpense = 0;

    transactions.forEach(function(t) {
      var amount = parseFloat(t.amount) || 0;
      if (t.type === 'income') totalIncome += amount;
      else if (t.type === 'expense') totalExpense += amount;
    });

    return {
      totalIncome: totalIncome,
      totalExpense: totalExpense,
      balance: totalIncome - totalExpense,
      count: transactions.length
    };
  },

  // --- Get Summary for Current Month ---
  getCurrentMonthSummary: async function() {
    var now = new Date();
    var monthTxns = await this.getByMonth(now.getMonth(), now.getFullYear());
    return this.getSummary(monthTxns);
  },

  // --- Get Recent Transactions ---
  getRecent: async function(limit) {
    limit = limit || 15;
    var userId = this.getUserId();
    if (!userId) return [];

    try {
      var result = await supabaseClient
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(limit);

      return result.data || [];
    } catch (err) {
      console.error('[SakuKita] getRecent error:', err);
      return [];
    }
  },

  // --- Group By Date (sync) ---
  groupByDate: function(transactions) {
    var grouped = {};
    transactions.forEach(function(t) {
      var dateKey = t.date;
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(t);
    });
    return grouped;
  },

  // --- Format Currency (sync) ---
  formatCurrency: function(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  },

  // --- Format Date (sync) ---
  formatDate: function(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  },

  formatDateShort: function(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  },

  // --- Seed Demo Data ---
  seedDemoData: async function() {
    var userId = this.getUserId();
    if (!userId) return;

    try {
      var countResult = await supabaseClient
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (countResult.count > 0) return;

      var now = new Date();
      var year = now.getFullYear();
      var mm = String(now.getMonth() + 1).padStart(2, '0');

      var demoData = [
        { user_id: userId, type: 'income', amount: 5000000, description: 'Gaji Bulanan', date: year + '-' + mm + '-01' },
        { user_id: userId, type: 'expense', amount: 150000, description: 'Makan siang & kopi', date: year + '-' + mm + '-02' },
        { user_id: userId, type: 'expense', amount: 50000, description: 'Grab ke kantor', date: year + '-' + mm + '-02' },
        { user_id: userId, type: 'income', amount: 1200000, description: 'Proyek desain web', date: year + '-' + mm + '-05' },
        { user_id: userId, type: 'expense', amount: 350000, description: 'Belanja mingguan', date: year + '-' + mm + '-07' },
        { user_id: userId, type: 'expense', amount: 500000, description: 'Tagihan listrik & WiFi', date: year + '-' + mm + '-10' },
        { user_id: userId, type: 'expense', amount: 100000, description: 'Nonton bioskop', date: year + '-' + mm + '-12' },
        { user_id: userId, type: 'income', amount: 300000, description: 'Hadiah ulang tahun', date: year + '-' + mm + '-15' },
        { user_id: userId, type: 'expense', amount: 250000, description: 'Vitamin & suplemen', date: year + '-' + mm + '-18' },
        { user_id: userId, type: 'expense', amount: 75000, description: 'Cemilan & minuman', date: year + '-' + mm + '-20' },
        { user_id: userId, type: 'income', amount: 800000, description: 'Penjualan online', date: year + '-' + mm + '-22' },
        { user_id: userId, type: 'expense', amount: 200000, description: 'Beli buku & kursus', date: year + '-' + mm + '-25' }
      ];

      await supabaseClient.from('transactions').insert(demoData);
      console.log('[SakuKita] Demo data inserted');
    } catch (err) {
      console.error('[SakuKita] seedDemoData error:', err);
    }
  }
};
