const { wrap, notifyAll } = require('./_lib');
module.exports = wrap(async (b, { sb, user }, res) => {
  const price = Number(b.price);
  if (!b.cut_id || !Number.isFinite(price) || price < 0) throw new Error('Datos inválidos');
  const { data, error } = await sb.rpc('finalizar_corte', { p_cut: b.cut_id, p_price: price.toFixed(2), p_actor: user.id });
  if (error) throw error;
  await notifyAll(sb, 'Un corte fue finalizado');
  res.json(data);
});
