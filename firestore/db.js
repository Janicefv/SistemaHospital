// =====================================================================
//  Capa de datos - VERSIÓN NO RELACIONAL (Cloud Firestore)
//  Colecciones: pacientes, doctores, horario, citas, medicamentos
//  Firestore no tiene llaves foráneas ni JOIN, así que:
//   - las referencias se guardan como el id del documento (id_paciente…)
//   - se DESNORMALIZAN datos de lectura frecuente (nombres, especialidad)
//   - la integridad (no borrar un paciente con citas, borrar en cascada)
//     se controla aquí, en el código, con lotes (writeBatch)
// =====================================================================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, where, writeBatch, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig } from './config.js';

const fs = getFirestore(initializeApp(firebaseConfig));
const nombre = s => (s.exists() ? `${s.data().nombres} ${s.data().apellidos}` : null);

// Copia datos de otros documentos para no tener que hacer "JOIN" al leer
async function desnormalizar(coleccion, datos) {
  const d = { ...datos };
  delete d.id;
  if (coleccion === 'citas') {
    const [p, m] = await Promise.all([getDoc(doc(fs, 'pacientes', d.id_paciente)), getDoc(doc(fs, 'doctores', d.id_doctor))]);
    d.paciente_nombre = nombre(p);
    d.doctor_nombre = nombre(m);
    d.especialidad = m.exists() ? m.data().especialidad : null;
  }
  if (coleccion === 'horario') {
    const m = await getDoc(doc(fs, 'doctores', d.id_doctor));
    d.doctor_nombre = nombre(m);
    d.especialidad = m.exists() ? m.data().especialidad : null;
  }
  if (coleccion === 'medicamentos') {
    const c = await getDoc(doc(fs, 'citas', d.id_cita));
    d.paciente_nombre = c.exists() ? c.data().paciente_nombre : null;
    d.fecha_cita = c.exists() ? c.data().fecha : null;
  }
  return d;
}

const relacionados = async (coleccion, campo, id) =>
  (await getDocs(query(collection(fs, coleccion), where(campo, '==', id)))).docs;

export const db = {
  async listar(coleccion) {
    const snap = await getDocs(collection(fs, coleccion));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  async crear(coleccion, datos) {
    const d = await desnormalizar(coleccion, datos);
    d.creado_en = serverTimestamp();
    const ref = await addDoc(collection(fs, coleccion), d);
    return ref.id;
  },
  async actualizar(coleccion, id, datos) {
    await updateDoc(doc(fs, coleccion, id), await desnormalizar(coleccion, datos));
  },
  async eliminar(coleccion, id) {
    // Equivalente a ON DELETE RESTRICT
    if (coleccion === 'pacientes' && (await relacionados('citas', 'id_paciente', id)).length)
      throw new Error('No se puede eliminar: el paciente tiene citas registradas.');
    if (coleccion === 'doctores' && (await relacionados('citas', 'id_doctor', id)).length)
      throw new Error('No se puede eliminar: el doctor tiene citas registradas.');

    const lote = writeBatch(fs);
    // Equivalente a ON DELETE CASCADE
    if (coleccion === 'doctores') (await relacionados('horario', 'id_doctor', id)).forEach(d => lote.delete(d.ref));
    if (coleccion === 'citas') (await relacionados('medicamentos', 'id_cita', id)).forEach(d => lote.delete(d.ref));
    // Equivalente a ON DELETE SET NULL
    if (coleccion === 'horario') (await relacionados('citas', 'id_horario', id)).forEach(d => lote.update(d.ref, { id_horario: null }));
    lote.delete(doc(fs, coleccion, id));
    await lote.commit();
  },
};
