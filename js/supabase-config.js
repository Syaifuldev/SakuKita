/* ============================================
   SakuKita - Supabase Configuration
   ============================================ */

var SUPABASE_URL = 'https://hzhkgkvxpfxskzvaoeok.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6aGtna3Z4cGZ4c2t6dmFvZW9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzczNDksImV4cCI6MjA5MDgxMzM0OX0.1i9Fk1U_y144Gwagkb7Zco2O8VoVHT_NZCjnCqOvXng';

var supabaseClient;

try {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('[SakuKita] Supabase connected');
} catch (err) {
  console.error('[SakuKita] Supabase init error:', err);
  alert('Gagal menghubungkan ke server. Pastikan koneksi internet aktif.');
}
