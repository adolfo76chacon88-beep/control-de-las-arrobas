// Utilidades del servidor (Vercel Serverless Functions). Usa la clave service_role: solo aquí.
const { createClient } = require('@supabase/supabase-js');
const ADMIN = 'adolfo76chacon88@gmail.com';
const svc = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function requireAdmin(req, res) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const sb = svc();
  const { data: { user } } = await sb.auth.getUser(token);
  if (user) {
    const { data: p } = await sb.from('profiles').select('role,active,email').eq('id', user.id).single();
    if (p && p.role === 'admin' && p.active && p.email === ADMIN) return { sb, user };
  }
  res.status(403).json({ error: 'Solo el administrador puede hacer esto' });
  return null;
}
async function notifyAll(sb, message, type = 'corte') {
  const { data } = await sb.from('profiles').select('id').eq('active', true);
  if (data && data.length) await sb.from('notifications').insert(data.map(p => ({ user_id: p.id, type, message })));
}
const wrap = fn => async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  try { const c = await requireAdmin(req, res); if (c) await fn(req.body || {}, c, res); }
  catch (e) { res.status(400).json({ error: e.message || 'Error' }); }
};
module.exports = { wrap, notifyAll, ADMIN };
