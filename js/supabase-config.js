/* ============================================
   SakuKita - Supabase Configuration
   ============================================ */

var SUPABASE_URL = 'https://hzhkgkvxpfxskzvaoeok.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6aGtna3Z4cGZ4c2t6dmFvZW9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzczNDksImV4cCI6MjA5MDgxMzM0OX0.1i9Fk1U_y144Gwagkb7Zco2O8VoVHT_NZCjnCqOvXng';

var supabaseClient = null;
var _sakukitaUserId = null;
var _sakukitaReady = false;
var _sakukitaReadyCallbacks = [];

function onSakuKitaReady(fn) {
  if (_sakukitaReady) { fn(); }
  else { _sakukitaReadyCallbacks.push(fn); }
}

try {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('[SakuKita] Supabase connected');

  // Listen auth state IMMEDIATELY
  supabaseClient.auth.onAuthStateChange(function(event, session) {
    console.log('[SakuKita] Auth event:', event, session ? 'has session' : 'no session');
    if (session && session.user) {
      _sakukitaUserId = session.user.id;
    } else {
      _sakukitaUserId = null;
    }
    _sakukitaReady = true;
    // Fire all waiting callbacks
    _sakukitaReadyCallbacks.forEach(function(cb) { cb(); });
    _sakukitaReadyCallbacks = [];
  });

} catch (err) {
  console.error('[SakuKita] Supabase init error:', err);
}
