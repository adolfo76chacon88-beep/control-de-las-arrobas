const { wrap, ADMIN } = require('./_lib');
module.exports = wrap(async (b, { sb, user }, res) => {
  const email = String(b.email || '').trim().toLowerCase();
  if (email === ADMIN) throw new Error('No se puede revocar al administrador');
  const { data: p } = await sb.from('profiles').select('id').eq('email', email).maybeSingle();
  if (p) {
    await sb.from('profiles').update({ active: false }).eq('id', p.id);
    await sb.auth.admin.updateUserById(p.id, { ban_duration: '876000h' });
  }
  await sb.from('invitations').update({ status: 'revocada' }).eq('email', email);
  await sb.from('audit_log').insert({ actor: user.id, action: 'revocar_acceso', entity: 'profiles', entity_id: email });
  res.json({ ok: true });
});
