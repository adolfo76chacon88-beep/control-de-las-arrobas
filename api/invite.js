const { wrap, ADMIN } = require('./_lib');
module.exports = wrap(async (b, { sb, user }, res) => {
  const email = String(b.email || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Correo inválido');
  if (email === ADMIN) throw new Error('Ese correo es el del administrador');
  // El rol lo asigna el trigger handle_new_user: todo invitado es LECTOR.
  const { error } = await sb.auth.admin.inviteUserByEmail(email, { redirectTo: b.redirectTo });
  if (error) throw error;
  await sb.from('invitations').insert({ email, invited_by: user.id });
  await sb.from('notifications').insert({ user_id: user.id, type: 'invitacion', message: 'Invitación enviada a ' + email });
  res.json({ ok: true });
});
