// Valores PÚBLICOS para el navegador (la anon key está pensada para ser pública; la protege RLS).
module.exports = (req, res) => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) return res.status(500).json({ error: 'Faltan variables de entorno de Supabase' });
  res.setHeader('Cache-Control', 'no-store');
  res.json({ url: process.env.SUPABASE_URL, key: process.env.SUPABASE_ANON_KEY });
};
