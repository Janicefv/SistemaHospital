# Sistema de citas médicas — Taller final de persistencia

Aplicación web para manejar las citas médicas de un hospital, con **dos versiones de persistencia**:

| Versión | Motor | Carpeta |
|---|---|---|
| Relacional | PostgreSQL en **Supabase** | `relacional/` + `database/esquema.sql` |
| No relacional | **Cloud Firestore** (Firebase) | `firestore/` + `database/firestore.rules` |

Tablas / colecciones: **CITAS, PACIENTES, HORARIO, DOCTORES (con especialidad), MEDICAMENTOS**.
La interfaz (`comun/`) es la misma para las dos; solo cambia el archivo `db.js` de cada versión.

```
SistemaHospital/
├── index.html              ← portada: elegir versión
├── comun/                  ← interfaz compartida: app.js, iconos.js, styles.css
├── relacional/             ← index.html, db.js (Supabase), config.js
├── firestore/              ← index.html, db.js (Firestore), config.js
└── database/               ← esquema.sql y firestore.rules
```

---

## Paso 1 · Abrir el proyecto en Antigravity
1. Descomprima `SistemaHospital.zip`.
2. En Antigravity: **Open Folder** → carpeta `SistemaHospital`.
3. (Opcional, para mostrar el uso de Antigravity) pídale al agente, por ejemplo:
   *"Revisa este proyecto y explícame cómo se conecta relacional/db.js con Supabase"* o
   *"Agrega un filtro por especialidad en la pestaña de citas"*. Tome capturas.

## Paso 2 · Base de datos relacional (Supabase)
1. Entre a https://supabase.com → **Start your project** (con GitHub) → **New project**
   (nombre `SistemaHospital`, una contraseña, región *South America (São Paulo)*).
2. Menú izquierdo → **SQL Editor** → **New query** → pegue todo `database/esquema.sql` → **Run**.
3. En **Table Editor** verá las 5 tablas (tome captura: sirve para el diseño).
4. **Project Settings → API** (o el botón **Connect**): copie **Project URL** y la clave **anon public**.
5. Péguelas en `relacional/config.js`.

## Paso 3 · Base de datos no relacional (Firestore)
1. Entre a https://console.firebase.google.com → **Agregar proyecto** (`SistemaHospital`, sin Analytics).
2. **Compilación → Firestore Database → Crear base de datos** → ubicación `southamerica-east1` → modo **producción**.
3. Pestaña **Reglas** → pegue `database/firestore.rules` → **Publicar**.
4. **⚙ Configuración del proyecto → Tus apps → icono `</>` (Web)** → registre la app → copie el objeto `firebaseConfig`.
5. Péguelo en `firestore/config.js`.

> Las colecciones se crean solas la primera vez que se guarda un documento.

## Paso 4 · Probar en su computador
En la terminal de Antigravity, dentro de `SistemaHospital`:
```bash
npx serve .
```
Abra http://localhost:3000 → entre a cada versión → botón **Cargar datos de ejemplo**.
(No abra el `index.html` con doble clic: los módulos de JavaScript necesitan un servidor.)

## Paso 5 · Publicar en Vercel
1. Cree un repositorio en GitHub (ej. `SistemaHospital`) y suba la carpeta
   (en Antigravity: panel *Source Control* → *Publish to GitHub*, o con `git init`, `git add .`, `git commit`, `git push`).
2. Entre a https://vercel.com → **Add New → Project** → importe el repositorio.
3. *Framework Preset*: **Other**. No cambie nada más → **Deploy**.
4. Queda publicado en `https://SistemaHospital-xxxx.vercel.app`:
   - `/relacional/` → versión SQL
   - `/firestore/` → versión NoSQL

*(Alternativa Render: New → **Static Site** → mismo repositorio → Build command vacío → Publish directory `.`)*

## Qué entregar
1. El documento de **diseño de la persistencia** (modelo relacional + modelo de documentos).
2. El **enlace de Vercel** (o Render).
3. Capturas: tablas en Supabase, colecciones en Firestore y la app funcionando.

## Reglas de negocio que valida la app
- Un doctor no puede tener dos citas activas a la misma fecha y hora.
- La cita debe caer en el día y la franja del horario elegido del doctor.
- No se puede borrar un paciente o doctor que tenga citas (RESTRICT).
- Al borrar una cita se borran sus medicamentos (CASCADE); al borrar un doctor, sus horarios.
- Documento del paciente y registro médico del doctor son únicos.
