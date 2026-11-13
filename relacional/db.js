// =====================================================================
//  Capa de datos - VERSIÓN RELACIONAL (PostgreSQL en Supabase)
//  Las tablas se crean con database/esquema.sql
// =====================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Llave primaria de cada tabla
const PK = {
  pacientes: 'id_paciente',
  doctores: 'id_doctor',
  horario: 'id_horario',
  citas: 'id_cita',
  medicamentos: 'id_medicamento',
};
const LLAVES_FORANEAS = ['id_paciente', 'id_doctor', 'id_horario', 'id_cita'];

function limpiar(tabla, datos) {
  const fila = { ...datos };
  delete fila.id;
  delete fila[PK[tabla]];
  for (const k of LLAVES_FORANEAS) if (fila[k] != null) fila[k] = Number(fila[k]);
  return fila;
}

async function ejecutar(consulta) {
  const { data, error } = await consulta;
  if (error) throw error;
  return data;
}

export const db = {
  // SELECT * FROM tabla ORDER BY pk
  async listar(tabla) {
    const filas = await ejecutar(sb.from(tabla).select('*').order(PK[tabla]));
    return filas.map(f => ({ ...f, id: f[PK[tabla]] }));
  },
  // INSERT INTO tabla (...) VALUES (...) RETURNING pk
  async crear(tabla, datos) {
    const [fila] = await ejecutar(sb.from(tabla).insert(limpiar(tabla, datos)).select(PK[tabla]));
    return fila[PK[tabla]];
  },
  // UPDATE tabla SET ... WHERE pk = id
  async actualizar(tabla, id, datos) {
    await ejecutar(sb.from(tabla).update(limpiar(tabla, datos)).eq(PK[tabla], id));
  },
  // DELETE FROM tabla WHERE pk = id  (las FK de la BD protegen la integridad)
  async eliminar(tabla, id) {
    await ejecutar(sb.from(tabla).delete().eq(PK[tabla], id));
  },
};
