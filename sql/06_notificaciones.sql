-- Control de Arrobas · 06 · Notificaciones automáticas e invitaciones aceptadas
-- Ejecutar DESPUÉS de 01-04 (las tablas ya existen). Es seguro ejecutarlo más de una vez.

-- Nuevo comentario -> notifica al administrador
create or replace function public.notif_nuevo_comentario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, type, message)
  select id, 'comentario', 'Nuevo comentario de ' || (select email from profiles where id = new.author_id)
  from profiles where role = 'admin';
  return new;
end $$;
drop trigger if exists trg_notif_comentario on public.comments;
create trigger trg_notif_comentario after insert on public.comments
  for each row execute function public.notif_nuevo_comentario();

-- Nueva respuesta -> notifica al autor y marca el comentario como respondido
create or replace function public.notif_nueva_respuesta() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, type, message)
  select author_id, 'respuesta', 'El administrador respondió tu comentario' from comments where id = new.comment_id;
  update comments set status = 'respondido' where id = new.comment_id;
  return new;
end $$;
drop trigger if exists trg_notif_respuesta on public.replies;
create trigger trg_notif_respuesta after insert on public.replies
  for each row execute function public.notif_nueva_respuesta();

-- Un invitado que crea su cuenta marca su invitación como aceptada
create or replace function public.invitacion_aceptada() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update invitations set status = 'aceptada', user_id = new.id
  where lower(email) = lower(new.email) and status = 'pendiente';
  return new;
end $$;
drop trigger if exists trg_invitacion_aceptada on public.profiles;
create trigger trg_invitacion_aceptada after insert on public.profiles
  for each row execute function public.invitacion_aceptada();
