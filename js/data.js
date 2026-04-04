/* ============================================
   SakuKita - Data Management (Supabase)
   ============================================ */

var SakuKitaDB = {

  _cachedUsername: null,

  getUserId: function() {
    return _sakukitaUserId;
  },

  getUser: async function() {
    var userId = this.getUserId();
    if (!userId) return { id: null, username: 'Pengguna' };

    if (this._cachedUsername) {
      return { id: userId, username: this._cachedUsername };
    }

    try {
      var r = await supabaseClient.from('profiles').select('username').eq('id', userId);
      if (r.data && r.data.length > 0) {
        this._cachedUsername = r.data[0].username;
        return { id: userId, username: r.data[0].username };
      }
    } catch (e) {
      console.error('[SakuKita] getUser err:', e);
    }
    return { id: userId, username: 'Pengguna' };
  },

  registerUser: async function(username, password) {
    try {
      var chk = await supabaseClient.from('profiles').select('username').eq('username', username);
      if (chk.data && chk.data.length > 0) return { error: 'Username sudah dipakai' };

      var email = username.toLowerCase().replace(/[^a-z0-9]/g, '') + '@sakukita.app';
      var res = await supabaseClient.auth.signUp({ email: email, password: password });

      if (res.error) return { error: res.error.message };

      var uid = res.data.user.id;
      _sakukitaUserId = uid;
      this._cachedUsername = username;

      await supabaseClient.from('profiles').insert({ id: uid, username: username });
      return { user: { id: uid, username: username } };
    } catch (e) {
      console.error('[SakuKita] register err:', e);
      return { error: 'Terjadi kesalahan' };
    }
  },

  loginUser: async function(username, password) {
    try {
      var email = username.toLowerCase().replace(/[^a-z0-9]/g, '') + '@sakukita.app';
      var res = await supabaseClient.auth.signInWithPassword({ email: email, password: password });

      if (res.error) return { error: 'Username atau password salah' };

      _sakukitaUserId = res.data.user.id;
      this._cachedUsername = username;
      return { user: { id: res.data.user.id, username: username } };
    } catch (e) {
      console.error('[SakuKita] login err:', e);
      return { error: 'Gagal login' };
    }
  },

  logoutUser: async function() {
    _sakukitaUserId = null;
    this._cachedUsername = null;
    try { await supabaseClient.auth.signOut(); } catch(e) {}
  },

  getAll: async function() {
    var uid = this.getUserId();
    if (!uid) return [];
    try {
      var r = await supabaseClient.from('transactions').select('*').eq('user_id', uid).order('date', { ascending: false });
      return r.data || [];
    } catch(e) { return []; }
  },

  add: async function(t) {
    var uid = this.getUserId();
    if (!uid) { console.error('[SakuKita] add: no userId'); return null; }
    try {
      var r = await supabaseClient.from('transactions')
        .insert({ user_id: uid, type: t.type, amount: t.amount, description: t.description, date: t.date })
        .select();
      if (r.error) { console.error('[SakuKita] add err:', r.error); return null; }
      return r.data && r.data.length > 0 ? r.data[0] : null;
    } catch(e) { console.error('[SakuKita] add err:', e); return null; }
  },

  update: async function(id, d) {
    try {
      var r = await supabaseClient.from('transactions')
        .update({ type: d.type, amount: d.amount, description: d.description, date: d.date })
        .eq('id', id).select();
      return r.data && r.data.length > 0 ? r.data[0] : null;
    } catch(e) { return null; }
  },

  delete: async function(id) {
    try {
      var r = await supabaseClient.from('transactions').delete().eq('id', id);
      return !r.error;
    } catch(e) { return false; }
  },

  getById: async function(id) {
    try {
      var r = await supabaseClient.from('transactions').select('*').eq('id', id);
      return r.data && r.data.length > 0 ? r.data[0] : null;
    } catch(e) { return null; }
  },

  getByMonth: async function(month, year) {
    var uid = this.getUserId();
    if (!uid) return [];
    try {
      var s = year + '-' + String(month+1).padStart(2,'0') + '-01';
      var em = month+1 > 11 ? 0 : month+1;
      var ey = month+1 > 11 ? year+1 : year;
      var e = ey + '-' + String(em+1).padStart(2,'0') + '-01';
      var r = await supabaseClient.from('transactions').select('*').eq('user_id', uid).gte('date', s).lt('date', e).order('date', { ascending: true });
      return r.data || [];
    } catch(e) { return []; }
  },

  getSummary: function(txns) {
    var inc = 0, exp = 0;
    txns.forEach(function(t) {
      var a = parseFloat(t.amount) || 0;
      if (t.type === 'income') inc += a; else exp += a;
    });
    return { totalIncome: inc, totalExpense: exp, balance: inc - exp, count: txns.length };
  },

  getCurrentMonthSummary: async function() {
    var now = new Date();
    var t = await this.getByMonth(now.getMonth(), now.getFullYear());
    return this.getSummary(t);
  },

  getRecent: async function(limit) {
    var uid = this.getUserId();
    if (!uid) return [];
    try {
      var r = await supabaseClient.from('transactions').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(limit || 15);
      return r.data || [];
    } catch(e) { return []; }
  },

  groupByDate: function(txns) {
    var g = {};
    txns.forEach(function(t) { if (!g[t.date]) g[t.date] = []; g[t.date].push(t); });
    return g;
  },

  formatCurrency: function(a) {
    return new Intl.NumberFormat('id-ID').format(a);
  },

  formatDate: function(d) {
    return new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  },

  formatDateShort: function(d) {
    return new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  },

  seedDemoData: async function() {
    var uid = this.getUserId();
    if (!uid) return;
    try {
      var c = await supabaseClient.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', uid);
      if (c.count > 0) return;
      var now = new Date(), y = now.getFullYear(), mm = String(now.getMonth()+1).padStart(2,'0');
      var data = [
        { user_id: uid, type: 'income', amount: 5000000, description: 'Gaji Bulanan', date: y+'-'+mm+'-01' },
        { user_id: uid, type: 'expense', amount: 150000, description: 'Makan siang', date: y+'-'+mm+'-02' },
        { user_id: uid, type: 'expense', amount: 50000, description: 'Transport', date: y+'-'+mm+'-03' },
        { user_id: uid, type: 'income', amount: 1200000, description: 'Freelance', date: y+'-'+mm+'-05' },
        { user_id: uid, type: 'expense', amount: 350000, description: 'Belanja', date: y+'-'+mm+'-07' },
        { user_id: uid, type: 'expense', amount: 500000, description: 'Listrik & WiFi', date: y+'-'+mm+'-10' },
        { user_id: uid, type: 'income', amount: 300000, description: 'Bonus', date: y+'-'+mm+'-15' },
        { user_id: uid, type: 'expense', amount: 200000, description: 'Buku', date: y+'-'+mm+'-20' }
      ];
      await supabaseClient.from('transactions').insert(data);
    } catch(e) { console.error('[SakuKita] seed err:', e); }
  }
};
