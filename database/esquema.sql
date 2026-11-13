-- =====================================================================
--  TALLER FINAL DE PERSISTENCIA - Citas médicas de un hospital
--  Versión RELACIONAL (PostgreSQL / Supabase)
--  Tablas: PACIENTES, DOCTORES, HORARIO, CITAS, MEDICAMENTOS
--  Ejecutar completo en: Supabase > SQL Editor > New query > Run
-- =====================================================================

-- Si se vuelve a ejecutar, borra todo primero (orden inverso por las FK)
DROP VIEW  IF EXISTS vista_citas;
DROP TABLE IF EXISTS medicamentos;
DROP TABLE IF EXISTS citas;
DROP TABLE IF EXISTS horario;
DROP TABLE IF EXISTS doctores;
DROP TABLE IF EXISTS pacientes;

-- ---------------------------------------------------------------------
-- 1. PACIENTES
-- ---------------------------------------------------------------------
CREATE TABLE pacientes (
    id_paciente       SERIAL       PRIMARY KEY,
    documento         VARCHAR(20)  NOT NULL UNIQUE,
    nombres           VARCHAR(60)  NOT NULL,
    apellidos         VARCHAR(60)  NOT NULL,
    fecha_nacimiento  DATE,
    telefono          VARCHAR(20),
    correo            VARCHAR(100),
    eps               VARCHAR(60)
);

-- ---------------------------------------------------------------------
-- 2. DOCTORES  (incluye la ESPECIALIDAD)
-- ---------------------------------------------------------------------
CREATE TABLE doctores (
    id_doctor        SERIAL       PRIMARY KEY,
    nombres          VARCHAR(60)  NOT NULL,
    apellidos        VARCHAR(60)  NOT NULL,
    especialidad     VARCHAR(60)  NOT NULL,
    registro_medico  VARCHAR(20)  NOT NULL UNIQUE,
    telefono         VARCHAR(20),
    correo           VARCHAR(100)
);

-- ---------------------------------------------------------------------
-- 3. HORARIO  (franjas de atención de cada doctor)
-- ---------------------------------------------------------------------
CREATE TABLE horario (
    id_horario   SERIAL      PRIMARY KEY,
    id_doctor    INT         NOT NULL REFERENCES doctores(id_doctor) ON DELETE CASCADE,
    dia_semana   VARCHAR(10) NOT NULL
                 CHECK (dia_semana IN ('Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo')),
    hora_inicio  TIME        NOT NULL,
    hora_fin     TIME        NOT NULL,
    consultorio  VARCHAR(20),
    CHECK (hora_fin > hora_inicio)
);

-- ---------------------------------------------------------------------
-- 4. CITAS
-- ---------------------------------------------------------------------
CREATE TABLE citas (
    id_cita      SERIAL      PRIMARY KEY,
    id_paciente  INT         NOT NULL REFERENCES pacientes(id_paciente) ON DELETE RESTRICT,
    id_doctor    INT         NOT NULL REFERENCES doctores(id_doctor)    ON DELETE RESTRICT,
    id_horario   INT                  REFERENCES horario(id_horario)    ON DELETE SET NULL,
    fecha        DATE        NOT NULL,
    hora         TIME        NOT NULL,
    motivo       TEXT,
    estado       VARCHAR(15) NOT NULL DEFAULT 'Programada'
                 CHECK (estado IN ('Programada','Atendida','Cancelada'))
);

-- Un doctor no puede tener dos citas activas a la misma fecha y hora
CREATE UNIQUE INDEX ux_cita_doctor_fecha_hora
    ON citas (id_doctor, fecha, hora)
    WHERE estado <> 'Cancelada';

-- ---------------------------------------------------------------------
-- 5. MEDICAMENTOS  (formulados en una cita)
-- ---------------------------------------------------------------------
CREATE TABLE medicamentos (
    id_medicamento  SERIAL       PRIMARY KEY,
    id_cita         INT          NOT NULL REFERENCES citas(id_cita) ON DELETE CASCADE,
    nombre          VARCHAR(80)  NOT NULL,
    dosis           VARCHAR(40)  NOT NULL,
    frecuencia      VARCHAR(40),
    duracion_dias   INT          CHECK (duracion_dias > 0)
);

-- ---------------------------------------------------------------------
-- Vista con JOIN: citas con nombre del paciente, doctor y especialidad
-- ---------------------------------------------------------------------
CREATE VIEW vista_citas AS
SELECT c.id_cita, c.fecha, c.hora, c.estado, c.motivo,
       p.documento, p.nombres || ' ' || p.apellidos AS paciente,
       d.nombres || ' ' || d.apellidos AS doctor, d.especialidad,
       h.dia_semana, h.consultorio
FROM citas c
JOIN pacientes p ON p.id_paciente = c.id_paciente
JOIN doctores  d ON d.id_doctor   = c.id_doctor
LEFT JOIN horario h ON h.id_horario = c.id_horario;

-- ---------------------------------------------------------------------
-- Permisos para la app web (clave pública "anon" de Supabase).
-- Es un proyecto académico: se permite leer y escribir a cualquiera.
-- ---------------------------------------------------------------------
ALTER TABLE pacientes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctores     ENABLE ROW LEVEL SECURITY;
ALTER TABLE horario      ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY acceso_publico ON pacientes    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY acceso_publico ON doctores     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY acceso_publico ON horario      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY acceso_publico ON citas        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY acceso_publico ON medicamentos FOR ALL USING (true) WITH CHECK (true);

GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO anon;
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Consulta de prueba:
-- SELECT * FROM vista_citas ORDER BY fecha, hora;
