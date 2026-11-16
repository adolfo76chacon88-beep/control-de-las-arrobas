const { wrap, notifyAll } = require('./_lib');
module.exports = wrap(async (b, { sb, user }, res) => {
  if (!b.cut_id) throw new Error('Datos inválidos');
  const { error } = await sb.rpc('reabrir_corte', { p_cut: b.cut_id, p_actor: user.id });
  if (error) throw error;
  await notifyAll(sb, 'Un corte fue reabierto por el administrador');
  res.json({ ok: true });
});
