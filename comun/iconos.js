// Íconos de línea en SVG (24x24), sin dependencias externas.
const P = {
  cruz: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
  inicio: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9v11a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9"/>',
  citas: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/>',
  pacientes: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M18.3 14.7c1.7.8 2.8 2.6 3.2 5.3"/>',
  doctores: '<path d="M6 3H4.5v5.5a5 5 0 0 0 10 0V3H13"/><path d="M9.5 13.5v1a5.5 5.5 0 0 0 11 0V12"/><circle cx="20.5" cy="10" r="2"/>',
  horario: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  medicamentos: '<path d="M10.5 20.5a5 5 0 0 1-7-7l6-6a5 5 0 0 1 7 7z"/><path d="m8.5 8.5 7 7"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  buscar: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  editar: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  eliminar: '<path d="M4 7h16M9 7V4h6v3"/><path d="m6 7 1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>',
  cerrar: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  checkCirculo: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16.5 9.5"/>',
  xCirculo: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
  alerta: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V13M12 16.5v.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.01"/>',
  flecha: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  baseDatos: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  cambiar: '<path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5"/>',
  hospital: '<path d="M4 21V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v15"/><path d="M2 21h20M10 21v-4h4v4M10 10h4M12 8v4"/>',
  pulso: '<path d="M3 12h4l2.5-6 4.5 12 2.5-6H21"/>',
  puerta: '<path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M3 21h18"/><path d="M14.5 12v.01"/>',
  documento: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.5-1.4 1.6-2 3-2s2.5.6 3 2M15 10h3M15 13h3"/>',
  especialidad: '<path d="M12 21s-7.5-4.6-9.2-9.3C1.6 8.2 3.7 5 7 5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.3 0 5.4 3.2 4.2 6.7C19.5 16.4 12 21 12 21z"/><path d="M7 12h2.5l1.5-2.5 2 5 1.5-2.5H17"/>',
};

export const icono = (nombre, clase = '') =>
  `<svg class="ico ${clase}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[nombre] || ''}</svg>`;
