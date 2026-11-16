# Control de Arrobas (HTML + CSS + JavaScript)

Sin Python. Arquitectura compatible con Vercel:
- **Frontend estático** (`public/`): HTML, CSS y JavaScript; usa `supabase-js` y `jsPDF` desde CDN.
- **Funciones serverless en JavaScript** (`api/`): solo para lo que exige la clave secreta `service_role`: invitar lectores, revocar acceso, finalizar y reabrir cortes. Verifican que quien llama sea el administrador.
- **Supabase**: PostgreSQL + Auth + RLS (las tablas y políticas ya están creadas con `Control_de_Arrobas_SQL.zip`). El dinero vive en `cut_finance` y `cut_results`, que solo el administrador puede leer por RLS.

```
public/  index.html · css/styles.css · js/calc.js (cálculos) · js/app.js (app + PDF)
api/     config · invite · revoke · finalize · reopen  (+ _lib.js)
sql/     06_notificaciones.sql (único script nuevo)
tests/   calc.test.js
```

## 1. Abrir en Visual Studio Code
Descomprime, `File > Open Folder…`, abre la terminal y ejecuta `npm install`.

## 2. Supabase
1. Ya ejecutaste `01`–`04`. Ejecuta además `sql/06_notificaciones.sql` en **SQL Editor** (notificaciones automáticas).
2. **Authentication > URL Configuration**: pon como *Site URL* tu dominio de Vercel y añade en *Redirect URLs* tu dominio y `http://localhost:3000`.
3. **Authentication > SMTP Settings**: configura Resend o SMTP propio para las invitaciones (el SMTP por defecto de Supabase es muy limitado).
4. Inicia sesión por primera vez con `adolfo76chacon88@gmail.com` (créalo en *Authentication > Users > Add user*): el trigger le da el rol admin.
5. Copia de **Project Settings > API**: URL, `anon` key y `service_role` key.

## 3. Variables de entorno
Copia `.env.example` a `.env` y rellénalo. En Vercel: *Settings > Environment Variables* con las mismas tres. La `service_role` nunca va en el navegador ni en GitHub.

## 4. Ejecutar local
`npx vercel dev` (instala Vercel CLI la primera vez) y abre http://localhost:3000. Pruebas de cálculo: `npm test`.

## 5. GitHub
`git init && git add . && git commit -m "Control de Arrobas" && git branch -M main`, crea un repositorio vacío en GitHub y `git remote add origin <URL> && git push -u origin main`. `.env` está en `.gitignore`.

## 6. Vercel
*Add New > Project*, importa el repositorio, Framework: **Other**, sin comando de build (ya hay `vercel.json`). Añade las variables y despliega. Cada `git push` actualiza el sitio.

## Notas de diseño
- Rol admin: solo el trigger `handle_new_user` y el correo fijo; los invitados siempre son LECTOR; nadie tiene permiso de escritura sobre `profiles`.
- Dinero en centavos enteros en el navegador y `numeric` en la base de datos; media arroba = precio/2 siempre.
- Los PDF se generan en el navegador con los datos que ya devolvió Supabase; el lector nunca recibe datos de dinero, así que no puede haber PDF con dinero para él.
- Un invitado que ya existe en Auth no puede volver a invitarse; revocar bloquea su sesión.
