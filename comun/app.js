// =====================================================================
//  Interfaz común de la app de citas médicas.
//  La usan las dos versiones; lo único que cambia es el objeto `db`
//  (relacional/db.js con Supabase o firestore/db.js con Firestore),
//  que debe tener: listar(tabla), crear(tabla, datos) -> id,
//  actualizar(tabla, id, datos) y eliminar(tabla, id).
// =====================================================================
import { icono } from './iconos.js';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const ESPECIALIDADES = ['Medicina general', 'Pediatría', 'Cardiología', 'Dermatología', 'Ginecología',
  'Ortopedia', 'Neurología', 'Psiquiatría', 'Oftalmología', 'Odontología', 'Medicina interna'];
const TABLAS = ['citas', 'pacientes', 'doctores', 'horario', 'medicamentos'];
const ESTADOS = { Programada: 'horario', Atendida: 'checkCirculo', Cancelada: 'xCirculo' };

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hhmm = t => (t || '').slice(0, 5);
const same = (a, b) => a != null && b != null && String(a) === String(b);
const nom = r => (r ? `${r.nombres} ${r.apellidos}` : '—');
const diaDe = fecha => DIAS[new Date(fecha + 'T12:00:00').getDay()];
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hoyISO = () => iso(new Date());
// Próxima fecha (desde hoy) que cae en `dia`; semanas permite ir atrás/adelante
const fechaDia = (dia, semanas = 0, incluirHoy = true) => {
  const d = new Date(); d.setHours(12, 0, 0, 0);
  let dif = (DIAS.indexOf(dia) - d.getDay() + 7) % 7;
  if (dif === 0 && !incluirHoy) dif = 7;
  d.setDate(d.getDate() + dif + semanas * 7);
  return iso(d);
};
const iniciales = r => r ? `${(r.nombres || '?')[0]}${(r.apellidos || '')[0] || ''}`.toUpperCase() : '?';
const tono = txt => [...String(txt)].reduce((s, c) => s + c.charCodeAt(0), 0) % 5;
const avatar = (r, extra = '') => `<span class="avatar t${tono(nom(r))} ${extra}">${esc(iniciales(r))}</span>`;
const persona = (r, sub) => `<div class="persona">${avatar(r)}<div><strong>${esc(nom(r))}</strong>${sub ? `<small>${sub}</small>` : ''}</div></div>`;
const bloqueFecha = f => f ? `<div class="fecha-bloque"><b>${Number(f.slice(8, 10))}</b><span>${MESES[Number(f.slice(5, 7)) - 1]}</span></div>` : '';
const estadoPill = e => `<span class="estado ${esc(String(e).toLowerCase())}">${icono(ESTADOS[e] || 'info')}${esc(e)}</span>`;
const soloTexto = html => String(html).replace(/<[^>]+>/g, ' ');

export function iniciarApp(db, { version, motor, otra, otraNombre }) {
  const root = document.getElementById('app');
  const cache = Object.fromEntries(TABLAS.map(t => [t, []]));
  const buscar = (t, id) => cache[t].find(r => same(r.id, id));
  let pestana = 'inicio';
  let editando = null;
  let drawer = false;
  let filtro = '';
  let filtroEstado = 'Todas';

  // ---------------- Definición de cada tabla/colección ----------------
  const ENT = {
    citas: {
      titulo: 'Citas', singular: 'cita', fem: true, icono: 'citas', boton: 'Agendar cita',
      descripcion: 'Agenda de consultas: quién, con qué doctor, cuándo y en qué estado.',
      campos: [
        { k: 'id_paciente', l: 'Paciente', t: 'ref', ref: 'pacientes', req: true },
        { k: 'id_doctor', l: 'Doctor', t: 'ref', ref: 'doctores', req: true },
        { k: 'id_horario', l: 'Horario de atención', t: 'ref', ref: 'horario', req: true, depende: 'id_doctor', ayuda: true },
        { k: 'fecha', l: 'Fecha', t: 'date', req: true, medio: true },
        { k: 'hora', l: 'Hora', t: 'time', req: true, medio: true },
        { k: 'estado', l: 'Estado', t: 'select', opts: ['Programada', 'Atendida', 'Cancelada'], req: true, def: 'Programada' },
        { k: 'motivo', l: 'Motivo de consulta', t: 'textarea', ph: 'Describa brevemente el motivo' },
      ],
      cols: [
        ['Fecha', r => `<div class="cuando">${bloqueFecha(r.fecha)}<div><strong>${hhmm(r.hora)}</strong><small>${esc(diaDe(r.fecha))}</small></div></div>`],
        ['Paciente', r => { const p = buscar('pacientes', r.id_paciente); return persona(p, p ? `CC ${esc(p.documento)}` : ''); }],
        ['Doctor', r => { const d = buscar('doctores', r.id_doctor); return `<strong>${esc(nom(d))}</strong><small class="bloque">${esc(d?.especialidad ?? '')}</small>`; }],
        ['Motivo', r => `<span class="texto-suave">${esc(r.motivo || '—')}</span>`],
        ['Estado', r => estadoPill(r.estado)],
      ],
      orden: (a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`),
      etiqueta: r => `${r.fecha} ${hhmm(r.hora)} · ${nom(buscar('pacientes', r.id_paciente))} (Dr. ${nom(buscar('doctores', r.id_doctor))})`,
      validar: (d, id) => {
        const h = buscar('horario', d.id_horario);
        if (!h || !same(h.id_doctor, d.id_doctor)) return 'El horario elegido no corresponde a ese doctor.';
        const dia = diaDe(d.fecha);
        if (dia !== h.dia_semana) return `La fecha ${d.fecha} es ${dia}, pero ese horario es los ${h.dia_semana}.`;
        if (d.hora < hhmm(h.hora_inicio) || d.hora >= hhmm(h.hora_fin))
          return `La hora debe estar entre ${hhmm(h.hora_inicio)} y ${hhmm(h.hora_fin)}.`;
        const choque = cache.citas.find(c => !same(c.id, id) && same(c.id_doctor, d.id_doctor) &&
          c.fecha === d.fecha && hhmm(c.hora) === d.hora && c.estado !== 'Cancelada' && d.estado !== 'Cancelada');
        if (choque) return 'Ese doctor ya tiene una cita en esa fecha y hora.';
      },
    },
    pacientes: {
      titulo: 'Pacientes', singular: 'paciente', icono: 'pacientes', boton: 'Registrar paciente',
      descripcion: 'Personas registradas para recibir atención en el hospital.',
      campos: [
        { k: 'documento', l: 'Número de documento', t: 'text', req: true },
        { k: 'nombres', l: 'Nombres', t: 'text', req: true, medio: true },
        { k: 'apellidos', l: 'Apellidos', t: 'text', req: true, medio: true },
        { k: 'fecha_nacimiento', l: 'Fecha de nacimiento', t: 'date', medio: true },
        { k: 'eps', l: 'EPS', t: 'text', medio: true },
        { k: 'telefono', l: 'Teléfono', t: 'tel', medio: true },
        { k: 'correo', l: 'Correo', t: 'email', medio: true },
      ],
      cols: [
        ['Paciente', r => persona(r, `CC ${esc(r.documento)}`)],
        ['Nacimiento', r => esc(r.fecha_nacimiento || '—')],
        ['Contacto', r => `${esc(r.telefono || '—')}<small class="bloque">${esc(r.correo || '')}</small>`],
        ['EPS', r => r.eps ? `<span class="chip">${esc(r.eps)}</span>` : '—'],
        ['Citas', r => `<span class="numero">${cache.citas.filter(c => same(c.id_paciente, r.id)).length}</span>`],
      ],
      orden: (a, b) => nom(a).localeCompare(nom(b)),
      etiqueta: r => `${nom(r)} · CC ${r.documento}`,
      validar: (d, id) => {
        if (cache.pacientes.some(p => !same(p.id, id) && p.documento === d.documento)) return 'Ya existe un paciente con ese documento.';
      },
    },
    doctores: {
      titulo: 'Doctores', singular: 'doctor', icono: 'doctores', boton: 'Agregar doctor',
      descripcion: 'Personal médico del hospital y su especialidad.',
      campos: [
        { k: 'nombres', l: 'Nombres', t: 'text', req: true, medio: true },
        { k: 'apellidos', l: 'Apellidos', t: 'text', req: true, medio: true },
        { k: 'especialidad', l: 'Especialidad', t: 'select', opts: ESPECIALIDADES, req: true },
        { k: 'registro_medico', l: 'Registro médico', t: 'text', req: true, ph: 'Ej: RM-10021' },
        { k: 'telefono', l: 'Teléfono', t: 'tel', medio: true },
        { k: 'correo', l: 'Correo', t: 'email', medio: true },
      ],
      cols: [
        ['Doctor', r => persona(r, `Reg. ${esc(r.registro_medico)}`)],
        ['Especialidad', r => `<span class="chip">${icono('especialidad')}${esc(r.especialidad)}</span>`],
        ['Atiende', r => {
          const hs = cache.horario.filter(h => same(h.id_doctor, r.id));
          return hs.length ? hs.map(h => `<span class="mini">${esc(h.dia_semana.slice(0, 3))}</span>`).join('') : '<span class="texto-suave">Sin horario</span>';
        }],
        ['Contacto', r => `${esc(r.telefono || '—')}<small class="bloque">${esc(r.correo || '')}</small>`],
      ],
      orden: (a, b) => nom(a).localeCompare(nom(b)),
      etiqueta: r => `${nom(r)} — ${r.especialidad}`,
      validar: (d, id) => {
        if (cache.doctores.some(m => !same(m.id, id) && m.registro_medico === d.registro_medico)) return 'Ya existe un doctor con ese registro médico.';
      },
    },
    horario: {
      titulo: 'Horarios', singular: 'horario', icono: 'horario', boton: 'Agregar horario',
      descripcion: 'Días y franjas en que cada doctor atiende, con su consultorio.',
      campos: [
        { k: 'id_doctor', l: 'Doctor', t: 'ref', ref: 'doctores', req: true },
        { k: 'dia_semana', l: 'Día de la semana', t: 'select', opts: DIAS.slice(1).concat('Domingo'), req: true },
        { k: 'hora_inicio', l: 'Desde', t: 'time', req: true, medio: true },
        { k: 'hora_fin', l: 'Hasta', t: 'time', req: true, medio: true },
        { k: 'consultorio', l: 'Consultorio', t: 'text', ph: 'Ej: C-101' },
      ],
      cols: [
        ['Doctor', r => { const d = buscar('doctores', r.id_doctor); return persona(d, esc(d?.especialidad ?? '')); }],
        ['Día', r => `<span class="dia">${esc(r.dia_semana)}</span>`],
        ['Franja', r => `<span class="franja">${icono('horario')}${hhmm(r.hora_inicio)} – ${hhmm(r.hora_fin)}</span>`],
        ['Consultorio', r => r.consultorio ? `<span class="chip gris">${icono('puerta')}${esc(r.consultorio)}</span>` : '—'],
      ],
      orden: (a, b) => nom(buscar('doctores', a.id_doctor)).localeCompare(nom(buscar('doctores', b.id_doctor))) ||
        ((DIAS.indexOf(a.dia_semana) || 7) - (DIAS.indexOf(b.dia_semana) || 7)) || hhmm(a.hora_inicio).localeCompare(hhmm(b.hora_inicio)),
      etiqueta: r => `${r.dia_semana} ${hhmm(r.hora_inicio)}–${hhmm(r.hora_fin)}${r.consultorio ? ' · ' + r.consultorio : ''}`,
      validar: d => { if (d.hora_fin <= d.hora_inicio) return 'La hora final debe ser mayor que la inicial.'; },
    },
    medicamentos: {
      titulo: 'Medicamentos', singular: 'medicamento', icono: 'medicamentos', boton: 'Formular medicamento',
      descripcion: 'Medicamentos formulados a los pacientes en sus citas.',
      campos: [
        { k: 'id_cita', l: 'Cita en la que se formula', t: 'ref', ref: 'citas', req: true },
        { k: 'nombre', l: 'Medicamento', t: 'text', req: true, ph: 'Ej: Acetaminofén' },
        { k: 'dosis', l: 'Dosis', t: 'text', req: true, ph: 'Ej: 500 mg', medio: true },
        { k: 'frecuencia', l: 'Frecuencia', t: 'text', ph: 'Ej: cada 8 horas', medio: true },
        { k: 'duracion_dias', l: 'Duración (días)', t: 'number', medio: true },
      ],
      cols: [
        ['Medicamento', r => `<div class="persona"><span class="avatar pastilla">${icono('medicamentos')}</span><div><strong>${esc(r.nombre)}</strong><small>${esc(r.dosis)}</small></div></div>`],
        ['Paciente', r => persona(buscar('pacientes', buscar('citas', r.id_cita)?.id_paciente))],
        ['Indicación', r => `${esc(r.frecuencia || '—')}<small class="bloque">${r.duracion_dias ? `${esc(r.duracion_dias)} días` : ''}</small>`],
        ['Cita', r => { const c = buscar('citas', r.id_cita); return c ? `${esc(c.fecha)} · ${hhmm(c.hora)}<small class="bloque">Dr. ${esc(nom(buscar('doctores', c.id_doctor)))}</small>` : '—'; }],
      ],
      orden: (a, b) => String(buscar('citas', b.id_cita)?.fecha ?? '').localeCompare(String(buscar('citas', a.id_cita)?.fecha ?? '')),
      etiqueta: r => r.nombre,
    },
  };
  const MENU = [['inicio', 'Inicio', 'inicio'], ...TABLAS.map(t => [t, ENT[t].titulo, ENT[t].icono])];
  const MENU_ORDEN = ['inicio', 'citas', 'pacientes', 'doctores', 'horario', 'medicamentos'];
  MENU.sort((a, b) => MENU_ORDEN.indexOf(a[0]) - MENU_ORDEN.indexOf(b[0]));

  // ---------------- Utilidades ----------------
  function aviso(msg, tipo = 'ok') {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.innerHTML = `${icono(tipo === 'ok' ? 'checkCirculo' : 'alerta')}<span>${esc(msg)}</span>`;
    t.className = `${tipo} visible`;
    clearTimeout(aviso.timer); aviso.timer = setTimeout(() => t.classList.remove('visible'), 4000);
  }

  function traducirError(e) {
    const m = String(e?.message || e);
    if (e?.code === '23503' || /foreign key/i.test(m)) return 'No se puede: hay registros relacionados (por ejemplo, citas de este paciente o doctor).';
    if (e?.code === '23505' || /duplicate key/i.test(m)) return 'Ya existe un registro con ese valor (documento, registro médico o cita en ese horario).';
    if (e?.code === '23514' || /check constraint/i.test(m)) return 'Algún dato no cumple las reglas de la base de datos.';
    if (/permission|insufficient/i.test(m)) return 'Sin permisos: revise las reglas o políticas de la base de datos.';
    return m;
  }

  function opcionesRef(c, valores) {
    let filas = [...cache[c.ref]].sort(ENT[c.ref].orden);
    if (c.depende) filas = filas.filter(r => same(r[c.depende], valores[c.depende]));
    let vacio = 'Seleccione…';
    if (c.depende && !valores[c.depende]) vacio = 'Primero elija el doctor';
    else if (c.depende && !filas.length) vacio = 'Este doctor no tiene horarios';
    else if (!filas.length) vacio = `No hay ${ENT[c.ref].titulo.toLowerCase()} registrados`;
    return `<option value="">${vacio}</option>` + filas.map(r =>
      `<option value="${esc(r.id)}" ${same(r.id, valores[c.k]) ? 'selected' : ''}>${esc(ENT[c.ref].etiqueta(r))}</option>`).join('');
  }

  function campoHTML(c, valores) {
    const v = valores[c.k] ?? c.def ?? '';
    const req = c.req ? 'required' : '';
    const ph = c.ph ? `placeholder="${esc(c.ph)}"` : '';
    let input;
    if (c.t === 'ref') input = `<select name="${c.k}" ${req}>${opcionesRef(c, valores)}</select>`;
    else if (c.t === 'select') input = `<select name="${c.k}" ${req}><option value="">Seleccione…</option>${c.opts.map(o =>
      `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    else if (c.t === 'textarea') input = `<textarea name="${c.k}" rows="3" ${req} ${ph}>${esc(v)}</textarea>`;
    else input = `<input type="${c.t}" name="${c.k}" value="${esc(c.t === 'time' ? hhmm(v) : v)}" ${req} ${ph} ${c.t === 'number' ? 'min="1"' : ''}>`;
    const ayuda = c.ayuda ? '<small class="ayuda" id="ayuda"></small>' : '';
    return `<label class="campo ${c.medio ? 'medio' : ''}"><span>${esc(c.l)}${c.req ? ' <i>*</i>' : ''}</span>${input}${ayuda}</label>`;
  }

  // ---------------- Vistas ----------------
  function sidebar() {
    return `<aside class="sidebar">
      <div class="marca"><div class="marca-logo">${icono('cruz')}</div>
        <div><strong>MediCitas</strong><span>Gestión hospitalaria</span></div></div>
      <nav class="menu">${MENU.map(([t, l, i]) => `
        <button data-tab="${t}" class="${t === pestana ? 'activo' : ''}">${icono(i)}<span>${l}</span>
          ${t !== 'inicio' ? `<em>${cache[t].length}</em>` : ''}</button>`).join('')}</nav>
      <div class="sidebar-pie">
        <div class="bd">${icono('baseDatos')}<div><small>Base de datos</small><strong>${esc(version)}</strong><span>${esc(motor)}</span></div></div>
        ${otra ? `<a class="cambiar" href="${esc(otra)}">${icono('cambiar')}Ir a versión ${esc(otraNombre || '')}</a>` : ''}
      </div>
    </aside>`;
  }

  function encabezado(ic, titulo, desc, boton) {
    return `<header class="encabezado">
      <div class="titulo"><div class="titulo-icono">${icono(ic)}</div><div><h1>${esc(titulo)}</h1><p>${esc(desc)}</p></div></div>
      ${boton ? `<button class="btn primario" data-nuevo="${boton[0]}">${icono('mas')}${esc(boton[1])}</button>` : ''}
    </header>`;
  }

  function vistaInicio() {
    const hoy = hoyISO();
    const h = new Date().getHours();
    const saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
    const fechaLarga = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const activas = cache.citas.filter(c => c.estado === 'Programada');
    const proximas = activas.filter(c => c.fecha >= hoy).sort(ENT.citas.orden);
    const deHoy = activas.filter(c => c.fecha === hoy).length;
    const total = TABLAS.reduce((s, t) => s + cache[t].length, 0);
    const especialidades = {};
    cache.doctores.forEach(d => { especialidades[d.especialidad] = (especialidades[d.especialidad] || 0) + 1; });
    const stat = (ic, n, l, tab, cls) => `<button class="stat ${cls}" data-tab="${tab}"><div class="stat-icono">${icono(ic)}</div>
      <div><b>${n}</b><span>${l}</span></div></button>`;

    return `${encabezado('hospital', saludo, fechaLarga[0].toUpperCase() + fechaLarga.slice(1), ['citas', 'Agendar cita'])}
      ${total === 0 ? `<section class="panel bienvenida">${icono('info')}<div><strong>La base de datos está vacía</strong>
        <p>Cargue datos de ejemplo para probar el sistema, o empiece registrando doctores, sus horarios y pacientes.</p></div>
        <button class="btn primario" id="semilla">Cargar datos de ejemplo</button></section>` : ''}
      <div class="stats">
        ${stat('citas', deHoy, 'Citas para hoy', 'citas', 'azul')}
        ${stat('horario', proximas.length, 'Citas próximas', 'citas', 'verde')}
        ${stat('pacientes', cache.pacientes.length, 'Pacientes', 'pacientes', 'morado')}
        ${stat('doctores', cache.doctores.length, 'Doctores', 'doctores', 'ambar')}
      </div>
      <div class="inicio-grid">
        <section class="panel">
          <div class="panel-cabeza"><h2>Próximas citas</h2><button class="enlace" data-tab="citas">Ver todas ${icono('flecha')}</button></div>
          ${proximas.length ? `<ul class="lista">${proximas.slice(0, 6).map(c => {
            const p = buscar('pacientes', c.id_paciente), d = buscar('doctores', c.id_doctor);
            return `<li>${bloqueFecha(c.fecha)}<div class="lista-info"><strong>${esc(nom(p))}</strong>
              <small>Dr. ${esc(nom(d))} · ${esc(d?.especialidad ?? '')}</small></div><span class="hora">${icono('horario')}${hhmm(c.hora)}</span></li>`;
          }).join('')}</ul>` : `<div class="vacio">${icono('citas')}<p>No hay citas programadas</p></div>`}
        </section>
        <section class="panel">
          <div class="panel-cabeza"><h2>Especialidades</h2><button class="enlace" data-tab="doctores">Doctores ${icono('flecha')}</button></div>
          ${Object.keys(especialidades).length ? `<ul class="lista">${Object.entries(especialidades).sort((a, b) => b[1] - a[1]).map(([e, n]) => `
            <li><span class="avatar suave">${icono('especialidad')}</span><div class="lista-info"><strong>${esc(e)}</strong>
            <small>${n} ${n === 1 ? 'doctor' : 'doctores'}</small></div></li>`).join('')}</ul>`
            : `<div class="vacio">${icono('doctores')}<p>Aún no hay doctores</p></div>`}
        </section>
      </div>`;
  }

  function vistaTabla() {
    const ent = ENT[pestana];
    return `${encabezado(ent.icono, ent.titulo, ent.descripcion, [pestana, ent.boton])}
      <section class="panel tabla-panel">
        <div class="barra">
          <div class="buscador">${icono('buscar')}<input id="filtro" type="search" placeholder="Buscar en ${ent.titulo.toLowerCase()}…" value="${esc(filtro)}"></div>
          ${pestana === 'citas' ? `<div class="segmentos">${['Todas', 'Programada', 'Atendida', 'Cancelada'].map(e =>
            `<button data-estado="${e}" class="${filtroEstado === e ? 'activo' : ''}">${e === 'Todas' ? 'Todas' : e + 's'}</button>`).join('')}</div>` : ''}
          <span class="conteo" id="conteo"></span>
        </div>
        <div class="tabla-wrap"><table>
          <thead><tr>${ent.cols.map(c => `<th>${esc(c[0])}</th>`).join('')}<th class="th-acc">Acciones</th></tr></thead>
          <tbody id="filas"></tbody>
        </table></div>
      </section>`;
  }

  function vistaDrawer() {
    if (!drawer) return '';
    const ent = ENT[pestana];
    const valores = editando ? buscar(pestana, editando) ?? {} : {};
    const titulo = editando ? `Editar ${ent.singular}` : ent.boton;
    return `<div class="overlay" id="overlay"></div>
      <aside class="drawer" role="dialog" aria-label="${esc(titulo)}">
        <header><div class="titulo-icono pequeno">${icono(ent.icono)}</div>
          <div><h2>${esc(titulo)}</h2><p>Los campos marcados con <i>*</i> son obligatorios</p></div>
          <button class="icono-btn" id="cerrar" title="Cerrar">${icono('cerrar')}</button></header>
        <form id="form" autocomplete="off">
          <div class="campos">${ent.campos.map(c => campoHTML(c, valores)).join('')}</div>
          <footer><button type="button" class="btn secundario" id="cancelar">Cancelar</button>
            <button class="btn primario" type="submit">${icono('check')}${editando ? 'Guardar cambios' : 'Guardar'}</button></footer>
        </form>
      </aside>`;
  }

  function render() {
    root.innerHTML = `<div class="layout">${sidebar()}
      <main class="contenido">${pestana === 'inicio' ? vistaInicio() : vistaTabla()}</main></div>${vistaDrawer()}`;
    if (pestana !== 'inicio') renderFilas();
    enlazar();
  }

  function renderFilas() {
    const ent = ENT[pestana];
    const q = filtro.toLowerCase();
    const filas = [...cache[pestana]].sort(ent.orden)
      .filter(r => pestana !== 'citas' || filtroEstado === 'Todas' || r.estado === filtroEstado)
      .filter(r => !q || ent.cols.some(([, fn]) => soloTexto(fn(r)).toLowerCase().includes(q)));
    document.getElementById('conteo').textContent = `${filas.length} de ${cache[pestana].length}`;
    document.getElementById('filas').innerHTML = filas.length ? filas.map(r => `
      <tr class="${same(r.id, editando) ? 'sel' : ''}">${ent.cols.map(c => `<td>${c[1](r)}</td>`).join('')}
        <td class="acc">
          ${pestana === 'citas' && r.estado === 'Programada' ? `<button class="icono-btn ok" data-atender="${esc(r.id)}" title="Marcar como atendida">${icono('check')}</button>` : ''}
          <button class="icono-btn" data-edit="${esc(r.id)}" title="Editar">${icono('editar')}</button>
          <button class="icono-btn peligro" data-del="${esc(r.id)}" title="Eliminar">${icono('eliminar')}</button>
        </td></tr>`).join('')
      : `<tr><td colspan="${ent.cols.length + 1}"><div class="vacio">${icono(ent.icono)}
          <p>${cache[pestana].length ? 'No hay resultados para la búsqueda' : `Todavía no hay ${ent.titulo.toLowerCase()}`}</p>
          ${cache[pestana].length ? '' : `<button class="btn secundario" data-nuevo="${pestana}">${icono('mas')}${esc(ent.boton)}</button>`}</div></td></tr>`;
  }

  function abrir(tabla, id = null) { pestana = tabla; editando = id; drawer = true; render(); root.querySelector('.drawer select, .drawer input')?.focus(); }
  function cerrar() { drawer = false; editando = null; render(); }

  function enlazar() {
    root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {
      pestana = b.dataset.tab; editando = null; drawer = false; filtro = ''; filtroEstado = 'Todas'; render();
    });
    root.querySelectorAll('[data-nuevo]').forEach(b => b.onclick = () => abrir(b.dataset.nuevo));
    root.querySelectorAll('[data-estado]').forEach(b => b.onclick = () => { filtroEstado = b.dataset.estado; render(); });
    document.getElementById('semilla')?.addEventListener('click', cargarEjemplo);
    const f = document.getElementById('filtro');
    if (f) f.oninput = e => { filtro = e.target.value; renderFilas(); };

    const filas = document.getElementById('filas');
    if (filas) filas.onclick = async e => {
      const b = e.target.closest('button'); if (!b) return;
      const ent = ENT[pestana];
      if (b.dataset.nuevo) return abrir(b.dataset.nuevo);
      if (b.dataset.edit) return abrir(pestana, b.dataset.edit);
      try {
        if (b.dataset.atender) {
          const c = buscar('citas', b.dataset.atender);
          const datos = Object.fromEntries(ent.campos.map(x => [x.k, c[x.k] ?? null]));
          await db.actualizar('citas', c.id, { ...datos, hora: hhmm(c.hora), estado: 'Atendida' });
          await recargar(); aviso('Cita marcada como atendida');
        }
        if (b.dataset.del && confirm(`¿Eliminar ${ent.fem ? 'esta' : 'este'} ${ent.singular}? Esta acción no se puede deshacer.`)) {
          await db.eliminar(pestana, b.dataset.del); await recargar(); aviso(`${cap(ent.singular)} ${ent.fem ? 'eliminada' : 'eliminado'}`);
        }
      } catch (ex) { aviso(traducirError(ex), 'error'); }
    };

    if (!drawer) return;
    document.getElementById('overlay').onclick = cerrar;
    document.getElementById('cerrar').onclick = cerrar;
    document.getElementById('cancelar').onclick = cerrar;
    const form = document.getElementById('form');
    const ent = ENT[pestana];

    if (pestana === 'citas') {
      const fd = form.elements.id_doctor, fh = form.elements.id_horario, ff = form.elements.fecha, fhora = form.elements.hora;
      const campoH = ent.campos.find(c => c.k === 'id_horario');
      const ayudar = sugerir => {
        const h = buscar('horario', fh.value), a = document.getElementById('ayuda');
        if (!h) { a.innerHTML = fd.value ? '' : `${icono('info')}<span>Elija un doctor para ver sus horarios</span>`; return; }
        fhora.min = hhmm(h.hora_inicio); fhora.max = hhmm(h.hora_fin);
        if (sugerir && (!ff.value || diaDe(ff.value) !== h.dia_semana)) ff.value = fechaDia(h.dia_semana);
        if (sugerir && !fhora.value) fhora.value = hhmm(h.hora_inicio);
        a.innerHTML = `${icono('info')}<span>Atiende los <b>${esc(h.dia_semana)}</b> de ${hhmm(h.hora_inicio)} a ${hhmm(h.hora_fin)}${h.consultorio ? ` en ${esc(h.consultorio)}` : ''}</span>`;
      };
      fd.addEventListener('change', () => {
        fh.innerHTML = opcionesRef(campoH, { id_doctor: fd.value });
        if (fh.options.length === 2) fh.selectedIndex = 1;
        ayudar(true);
      });
      fh.addEventListener('change', () => ayudar(true));
      ayudar(false);
    }

    form.onsubmit = async e => {
      e.preventDefault();
      const datos = {};
      for (const c of ent.campos) {
        const v = form.elements[c.k].value.trim();
        datos[c.k] = v === '' ? null : c.t === 'number' ? Number(v) : v;
      }
      const err = ent.validar?.(datos, editando);
      if (err) return aviso(err, 'error');
      const boton = form.querySelector('[type=submit]'); boton.disabled = true;
      try {
        const eraEdicion = !!editando;
        if (eraEdicion) await db.actualizar(pestana, editando, datos); else await db.crear(pestana, datos);
        drawer = false; editando = null; await recargar();
        aviso(eraEdicion ? 'Cambios guardados' : `${cap(ent.singular)} ${ent.fem ? 'registrada' : 'registrado'} correctamente`);
      } catch (ex) { aviso(traducirError(ex), 'error'); boton.disabled = false; }
    };
  }
  const cap = s => s[0].toUpperCase() + s.slice(1);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && drawer) cerrar(); });

  async function recargar() {
    const datos = await Promise.all(TABLAS.map(t => db.listar(t)));
    TABLAS.forEach((t, i) => { cache[t] = datos[i]; });
    render();
  }

  // ---------------- Datos de ejemplo ----------------
  async function cargarEjemplo() {
    const b = document.getElementById('semilla'); b.disabled = true; b.textContent = 'Cargando…';
    try {
      const doc = [
        await db.crear('doctores', { nombres: 'Laura', apellidos: 'Gómez Rincón', especialidad: 'Medicina general', registro_medico: 'RM-10021', telefono: '3104567890', correo: 'lgomez@hospital.co' }),
        await db.crear('doctores', { nombres: 'Andrés', apellidos: 'Rodríguez Peña', especialidad: 'Pediatría', registro_medico: 'RM-20455', telefono: '3157778899', correo: 'arodriguez@hospital.co' }),
        await db.crear('doctores', { nombres: 'Camila', apellidos: 'Torres Ruiz', especialidad: 'Cardiología', registro_medico: 'RM-30987', telefono: '3001112233', correo: 'ctorres@hospital.co' }),
      ];
      const pac = [
        await db.crear('pacientes', { documento: '1070456789', nombres: 'María', apellidos: 'López Castro', fecha_nacimiento: '1990-04-12', telefono: '3125550101', correo: 'maria.lopez@mail.com', eps: 'Sanitas' }),
        await db.crear('pacientes', { documento: '1001234567', nombres: 'Juan', apellidos: 'Martínez Díaz', fecha_nacimiento: '2015-09-30', telefono: '3205550202', correo: 'juan.m@mail.com', eps: 'Compensar' }),
        await db.crear('pacientes', { documento: '52987654', nombres: 'Rosa', apellidos: 'Pérez Vargas', fecha_nacimiento: '1958-01-22', telefono: '3015550303', correo: 'rosa.perez@mail.com', eps: 'Nueva EPS' }),
      ];
      const hor = [
        await db.crear('horario', { id_doctor: doc[0], dia_semana: 'Lunes', hora_inicio: '08:00', hora_fin: '12:00', consultorio: 'C-101' }),
        await db.crear('horario', { id_doctor: doc[0], dia_semana: 'Miércoles', hora_inicio: '14:00', hora_fin: '18:00', consultorio: 'C-101' }),
        await db.crear('horario', { id_doctor: doc[1], dia_semana: 'Martes', hora_inicio: '07:00', hora_fin: '13:00', consultorio: 'P-204' }),
        await db.crear('horario', { id_doctor: doc[2], dia_semana: 'Jueves', hora_inicio: '09:00', hora_fin: '15:00', consultorio: 'K-310' }),
      ];
      const cit = [
        await db.crear('citas', { id_paciente: pac[0], id_doctor: doc[0], id_horario: hor[0], fecha: fechaDia('Lunes', -1, false), hora: '08:30', estado: 'Atendida', motivo: 'Dolor de cabeza y fiebre' }),
        await db.crear('citas', { id_paciente: pac[1], id_doctor: doc[1], id_horario: hor[2], fecha: fechaDia('Martes', 0, false), hora: '09:00', estado: 'Programada', motivo: 'Control de crecimiento' }),
        await db.crear('citas', { id_paciente: pac[2], id_doctor: doc[2], id_horario: hor[3], fecha: fechaDia('Jueves', 0, false), hora: '10:00', estado: 'Programada', motivo: 'Control de presión arterial' }),
        await db.crear('citas', { id_paciente: pac[0], id_doctor: doc[0], id_horario: hor[1], fecha: fechaDia('Miércoles', 0, false), hora: '15:00', estado: 'Programada', motivo: 'Revisión de exámenes' }),
      ];
      await db.crear('medicamentos', { id_cita: cit[0], nombre: 'Acetaminofén', dosis: '500 mg', frecuencia: 'Cada 8 horas', duracion_dias: 5 });
      await db.crear('medicamentos', { id_cita: cit[0], nombre: 'Loratadina', dosis: '10 mg', frecuencia: 'Cada 24 horas', duracion_dias: 7 });
      await recargar(); aviso('Datos de ejemplo cargados');
    } catch (ex) { aviso(traducirError(ex), 'error'); await recargar(); }
  }

  recargar().catch(ex => {
    root.innerHTML = `<div class="panel error-config">${icono('alerta')}<div><h2>No se pudo conectar a la base de datos</h2>
      <p>${esc(traducirError(ex))}</p><p>Revise el archivo <code>config.js</code> de esta versión y las reglas o permisos de la base de datos.</p></div></div>`;
  });
}
