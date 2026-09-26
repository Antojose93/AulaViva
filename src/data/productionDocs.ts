export interface DocSection {
  id: string;
  number: number;
  title: string;
  category: 'Arquitectura & Datos' | 'UX & Flujos' | 'Seguridad & APIs' | 'Producto & Planificación' | 'DevOps & Despliegue';
  content: string;
}

export const PRODUCTION_DOCS: DocSection[] = [
  {
    id: 'arquitectura',
    number: 1,
    title: 'Arquitectura Completa del Sistema',
    category: 'Arquitectura & Datos',
    content: `### 1. Arquitectura del Sistema: Aula Viva (EdTech SaaS MVP)

**Enfoque Arquitectural:**
Jamstack / Serverless reactivo con backend-as-a-service optimizado para móviles (Mobile-first PWA).

\`\`\`text
                               [ Navegador Móvil / Desktop (PWA) ]
                                                │
                                  HTTPS / WSS   │  Next.js 15 Client
                                                ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 VERCEL EDGE NETWORK                                    │
│  ├── Next.js 15 App Router (SSR/ISR/Client Components)                                │
│  ├── API Route Handlers / Edge Middleware (Auth guard, role routing)                  │
│  └── Service Worker (PWA Caching & Offline Sync)                                       │
└───────────────────────────────────────┬────────────────────────────────────────────────┘
                                        │ PostgREST / GraphQL / Auth SDK
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   SUPABASE PLATFORM                                    │
│  ├── Supabase Auth (JWT, Magic Link / Password, Role claims in user_metadata)          │
│  ├── PostgreSQL 15+ (Database autoritativa con RLS)                                   │
│  │     ├── Triggers automáticos (Cálculo de XP, actualización de rachas)              │
│  │     ├── Stored Procedures (Transacción atómica para entrega y subida de nivel)      │
│  │     └── Vistas Materializadas / Aggregates (Métricas grupales de semáforo)          │
│  ├── Supabase Storage (Buckets para evidencias fotográficas de misiones)               │
│  └── Realtime (Canales postgres_changes para alertas del mentor en vivo)               │
└────────────────────────────────────────────────────────────────────────────────────────┘
\`\`\`

**Pilares Fundamentales:**
1. **Zero-Latency Feel:** Acciones del estudiante (marcar "Cumplí") actualizan inmediatamente el estado visual con validación optimista.
2. **Offline-Tolerant PWA:** Si el estudiante está en el aula o transporte público sin señal, la acción se registra en cola local (IndexedDB) y se despacha al reconectar.
3. **Rol-Based Data Isolation:** Estudiantes solo leen sus propias misiones y entregas (RLS estricto). El mentor tiene acceso global de supervisión.`,
  },
  {
    id: 'modelo_datos',
    number: 2,
    title: 'Modelo de Datos Conceptual & Entidades',
    category: 'Arquitectura & Datos',
    content: `### 2. Modelo de Datos Conceptual

Entidades principales modeladas para soportar el ciclo de vida de gamificación y mentoría:

- **users:** Cuentas base vinculadas a \`auth.users\` (id, email, full_name, role, avatar_url, created_at).
- **student_profiles:** Metadatos de gamificación (grade, overall_xp, overall_level, current_streak, longest_streak, diagnostic_completed, suggested_level, status_health).
- **skills:** Catálogo dinámico de habilidades para la vida (Disciplina, Enfoque, Aprender a aprender, ampliables sin alterar esquema).
- **skill_levels:** Desglose granular de XP y nivel acumulado por habilidad para cada estudiante.
- **missions:** Misiones creadas por el mentor (título, descripción, habilidad, xp, dificultad, frecuencia, evidencia requerida, condición de desbloqueo).
- **mission_assignments:** Relación M:N entre misiones y estudiantes con estado (activa, completada, expirada).
- **mission_submissions:** Registro de cumplimiento ("cumplí" / "no cumplí"), reflexión textual, evidencia multimedia, timestamp y feedback del mentor.
- **badges:** Catálogo de insignias configurables (primera misión, 7 días de racha, 10 misiones, boss defeated, etc.).
- **earned_badges:** Historial inmutable de insignias obtenidas con marca de tiempo.
- **diagnostics:** Cuestionario de entrada (5 preguntas x 3 habilidades = 15 preguntas, escala 1-5, puntajes calculados y nivel sugerido).
- **streaks:** Registro auditado de actividad diaria para garantizar que la racha refleje días calendario reales consecutivos.`,
  },
  {
    id: 'erd',
    number: 3,
    title: 'Diagrama Entidad-Relación (ERD)',
    category: 'Arquitectura & Datos',
    content: `### 3. Diagrama Entidad-Relación (ERD en Formato Mermaid/Texto)

\`\`\`text
 [users] 1 ──────── 1 [student_profiles]
    │ 1                      │ 1
    │                        │
    ├─< [missions] 1 ────────┼─< [mission_assignments] >─┐
    │       │ 1              │                            │
    │       │                ├─< [skill_levels] >── [skills]
    │       ▼                │                            ▲
    │   [mission_submissions]┤                            │
    │                        ├─< [earned_badges] >── [badges]
    │                        │
    │                        ├─< [diagnostics]
    │                        │
    │                        └─< [streaks]
\`\`\`

**Cardinalidades Clave:**
- \`users\` (1) a (1) \`student_profiles\` (solo para usuarios con \`role = 'student'\`).
- \`skills\` (1) a (N) \`missions\` (cada misión fortalece una habilidad concreta).
- \`student_profiles\` (1) a (N) \`skill_levels\` (relación con \`skills\`).
- \`missions\` (1) a (N) \`mission_assignments\` (N) a (1) \`student_profiles\`.
- \`missions\` (1) a (N) \`mission_submissions\` registradas por \`student_profiles\`.
- \`badges\` (1) a (N) \`earned_badges\` (N) a (1) \`student_profiles\`.`,
  },
  {
    id: 'flujo_usuarios',
    number: 4,
    title: 'Flujos de Usuario (User Flows)',
    category: 'UX & Flujos',
    content: `### 4. Flujos de Usuario Principales

#### Flujo A: Estudiante - Onboarding y Rutina Diaria
1. **Acceso:** Estudiante abre URL en su móvil (o PWA instalada).
2. **Check Diagnóstico:** Si \`diagnostic_completed == false\`, se abre el cuestionario de 15 preguntas (escala 1 a 5).
3. **Cálculo Inicial:** Al enviar, se calcula el radar de habilidades, se le asigna Nivel 1/2 y gana sus primeros +50 XP.
4. **Pantalla Principal (Dashboard):**
   - Visualiza su nivel, barra de XP actual, racha de fuego y el mensaje semanal del mentor.
   - Revisa sus misiones activas (Diarias, Semanales, Boss).
5. **Ejecución en la Vida Real:** El estudiante realiza el hábito en el mundo físico.
6. **Registro en Aula Viva:**
   - Pulsa "Cumplí" o "No cumplí".
   - Escribe una reflexión opcional (ej: "Me costó apagar el celular pero logré 40 min").
   - Si la misión requería evidencia, sube foto/link.
7. **Recompensa Instantánea:**
   - Feedback háptico/visual (+XP, barra avanza).
   - Si completa racha o condición, se desbloquea una Insignia con animación de celebración.

#### Flujo B: Mentor - Supervisión y Gestión Activa
1. **Dashboard Grupal:** Ve el semáforo de los 8 alumnos (Verde >80%, Amarillo 50-80%, Rojo <50%).
2. **Revisión de Alertas:** Detecta estudiantes en riesgo (ej. Camilo lleva 6 días sin registrar).
3. **Cola de Validación:** Aprueba evidencias enviadas por estudiantes y deja notas formativas ("¡Gran síntesis!").
4. **Creación/Asignación de Misiones:** Crea un reto de Enfoque y lo asigna a todo el curso o a estudiantes rezagados.
5. **Ajuste de Diagnóstico:** Consulta el radar del alumno y puede recalibrar el nivel sugerido según criterio pedagógico.`,
  },
  {
    id: 'wireframes',
    number: 5,
    title: 'Wireframes en Texto (Estructura de Pantallas)',
    category: 'UX & Flujos',
    content: `### 5. Wireframes en Texto

#### Pantalla Móvil del Estudiante:
\`\`\`text
┌──────────────────────────────────────────────┐
│ [Avatar] Hola, Mateo!       🔥 Racha: 6 días │
│ ──────────────────────────────────────────── │
│ Nivel 3  •  380 / 500 XP                     │
│ [████████████████████░░░░░░░░] 76%           │
│ Faltan 120 XP para Nivel 4                   │
│ ──────────────────────────────────────────── │
│ 📢 Mensaje del Mentor:                       │
│ "La constancia vence al talento..."          │
│ ──────────────────────────────────────────── │
│ MIS HABILIDADES                              │
│ [🛡️ Disciplina: Lvl 2] [🎯 Enfoque: Lvl 2]   │
│ [🧠 Aprender a aprender: Lvl 2]              │
│ ──────────────────────────────────────────── │
│ MISIONES DE HOY                              │
│ ┌──────────────────────────────────────────┐ │
│ │ 🎯 Pomodoro 40 min sin celular  [+35 XP] │ │
│ │ Diaria • Enfoque                         │ │
│ │ [ ✅ Cumplí ]         [ ❌ No cumplí ]   │ │
│ └──────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────┐ │
│ │ 🧠 Reto Boss: Desafío Monje    [+150 XP] │ │
│ │ Requiere Evidencia • Dificultad Alta     │ │
│ │ [ Ver detalles / Entregar ]              │ │
│ └──────────────────────────────────────────┘ │
│ ──────────────────────────────────────────── │
│ 🏅 INSIGNIAS OBTENIDAS (2 de 5)              │
│ [👣 Primer Paso] [✨ Nivel 3] [🔒 ...]       │
└──────────────────────────────────────────────┘
\`\`\`

#### Pantalla Desktop / Tablet del Mentor:
\`\`\`text
┌─────────────────────────────────────────────────────────────────────────────┐
│ AULA VIVA - Panel de Mentoría          [+ Nueva Misión] [📢 Enviar Mensaje] │
├─────────────────────────────────────────────────────────────────────────────┤
│ [ 8 Estudiantes ]  [ 78% Cumplimiento ]  [ 6 Misiones ]  [ ⚠️ 2 Alertas ]    │
├─────────────────────────────────────────────────────────────────────────────┤
│ SEMÁFORO DE CUMPLIMIENTO                                                    │
│ Filtros: [ Todos ] [ 🟢 Óptimo (5) ] [ 🟡 Observación (2) ] [ 🔴 Riesgo (1) ]│
│                                                                             │
│ • Valentina Ríos   │ 🟢 100% │ Nivel 4 │ Racha: 12 d │ [ Inspeccionar ]     │
│ • Mateo Gómez      │ 🟢  85% │ Nivel 3 │ Racha:  6 d │ [ Inspeccionar ]     │
│ • Camilo Morales   │ 🔴  33% │ Nivel 1 │ Racha:  0 d │ [ ⚠️ Atender ]       │
├─────────────────────────────────────────────────────────────────────────────┤
│ COLA DE VALIDACIÓN DE EVIDENCIAS (1 Pendiente)                               │
│ • Sofía Castro - "Planificación de Domingo en Agenda"                       │
│   [ Ver Evidencia ] -> [ ✅ Aprobar (+60 XP) ]  [ ❌ Rechazar con nota ]    │
└─────────────────────────────────────────────────────────────────────────────┘
\`\`\``,
  },
  {
    id: 'ux_ui',
    number: 6,
    title: 'Diseño UX/UI & Sistema de Diseño',
    category: 'UX & Flujos',
    content: `### 6. Sistema de Diseño UX/UI

**Filosofía Visual:**
- **Claridad Nórdica & Refinamiento:** Fondo blanco/pizarra cálido (\`#f8fafc\` / \`#ffffff\`), tipografía de alta legibilidad, cero elementos distractores.
- **Gamificación Sutil (No Infantil):** Diseñado para adolescentes de grado 11 (16-18 años). Nada de caricaturas; estética tipo Duolingo / Strava / Linear.

**Paleta de Colores Semántica:**
- **Primario / Acción:** Esmeralda (\`#10b981\`) - Simboliza crecimiento vital, logro completado y constancia.
- **Habilidad 1 (Disciplina):** Emerald 600 (\`#059669\`).
- **Habilidad 2 (Enfoque):** Amber 500 (\`#f59e0b\`).
- **Habilidad 3 (Aprender a aprender):** Indigo 500 (\`#6366f1\`).
- **Semáforo de Salud:**
  - 🟢 Verde: \`#10b981\` (>80% cumplimiento).
  - 🟡 Amarillo: \`#eab308\` (50%-80% cumplimiento).
  - 🔴 Rojo: \`#ef4444\` (<50% cumplimiento).

**Interacciones Clave:**
- Micro-animaciones con \`motion\` al completar misiones.
- Confeti con aceleración física suave al desbloquear insignias y subir de nivel.
- Botones de acción táctiles de mínimo 48px de alto para dedos en smartphones.`,
  },
  {
    id: 'estructura_carpetas',
    number: 7,
    title: 'Estructura de Carpetas (Next.js 15 & Clean Architecture)',
    category: 'Arquitectura & Datos',
    content: `### 7. Estructura de Carpetas del Proyecto

\`\`\`text
aula-viva/
├── app/                        # Next.js 15 App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── diagnostic/page.tsx # Cuestionario de 15 preguntas
│   ├── (student)/
│   │   ├── dashboard/page.tsx  # Pantalla principal móvil
│   │   ├── missions/page.tsx   # Listado y detalle
│   │   ├── skills/page.tsx     # Progreso por habilidad
│   │   └── history/page.tsx    # Historial y reflexiones
│   ├── (mentor)/
│   │   ├── mentor/page.tsx     # Dashboard del mentor
│   │   ├── students/[id]/page.tsx
│   │   ├── missions/new/page.tsx
│   │   └── approvals/page.tsx
│   ├── api/                    # Route handlers
│   │   ├── missions/route.ts
│   │   ├── submissions/route.ts
│   │   └── diagnostic/route.ts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                     # Componentes base (Button, Card, Dialog, Badge)
│   ├── student/                # Componentes específicos del estudiante
│   └── mentor/                 # Componentes de analítica y semáforo
├── lib/
│   ├── supabase/               # Clientes supabase (browser, server, admin)
│   ├── gamification.ts         # Fórmulas matemáticas de XP y niveles
│   └── utils.ts
├── types/
│   └── database.ts             # Tipos autogenerados de PostgreSQL/Supabase
├── supabase/
│   ├── migrations/             # Migraciones SQL versionadas
│   │   └── 20260910_init.sql
│   └── seed.sql                # Seed con los 8 estudiantes y 1 mentor
└── public/
    └── manifest.json           # Configuración PWA
\`\`\``,
  },
  {
    id: 'esquema_sql',
    number: 8,
    title: 'Esquema SQL Completo (PostgreSQL / Supabase DDL)',
    category: 'Seguridad & APIs',
    content: `### 8. Esquema SQL Completo DDL (Listo para ejecutar en Supabase)

\`\`\`sql
-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
CREATE TYPE user_role AS ENUM ('student', 'mentor');
CREATE TYPE mission_type AS ENUM ('diaria', 'semanal', 'personalizada', 'reto/boss');
CREATE TYPE mission_difficulty AS ENUM ('facil', 'media', 'dificil', 'epica');
CREATE TYPE submission_status AS ENUM ('cumplida', 'no_cumplida', 'pendiente_aprobacion', 'rechazada');
CREATE TYPE health_status AS ENUM ('optimo', 'observacion', 'riesgo');

-- 3. TABLA: users (perfiles vinculados a auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA: student_profiles
CREATE TABLE public.student_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    grade TEXT NOT NULL DEFAULT 'Grado 11',
    overall_xp INTEGER NOT NULL DEFAULT 0,
    overall_level INTEGER NOT NULL DEFAULT 1,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_active_date DATE DEFAULT CURRENT_DATE,
    diagnostic_completed BOOLEAN NOT NULL DEFAULT FALSE,
    suggested_level INTEGER DEFAULT 1,
    mentor_notes TEXT,
    status_health health_status NOT NULL DEFAULT 'observacion',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA: skills
CREATE TABLE public.skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    color TEXT NOT NULL,
    icon_name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'core',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA: skill_levels
CREATE TABLE public.skill_levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    skill_id TEXT NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    xp INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, skill_id)
);

-- 7. TABLA: missions
CREATE TABLE public.missions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    skill_id TEXT NOT NULL REFERENCES public.skills(id) ON DELETE RESTRICT,
    xp INTEGER NOT NULL CHECK (xp > 0),
    difficulty mission_difficulty NOT NULL DEFAULT 'facil',
    type mission_type NOT NULL DEFAULT 'diaria',
    frequency TEXT NOT NULL DEFAULT 'diaria',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    requires_evidence BOOLEAN NOT NULL DEFAULT FALSE,
    unlock_condition TEXT,
    assigned_student_ids UUID[] DEFAULT ARRAY[]::UUID[],
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABLA: mission_assignments
CREATE TABLE public.mission_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'activa',
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE(mission_id, student_id)
);

-- 9. TABLA: mission_submissions
CREATE TABLE public.mission_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status submission_status NOT NULL,
    reflection TEXT,
    evidence_url TEXT,
    evidence_description TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMPTZ,
    mentor_feedback TEXT,
    xp_awarded INTEGER NOT NULL DEFAULT 0
);

-- 10. TABLA: badges
CREATE TABLE public.badges (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    category TEXT NOT NULL,
    condition_type TEXT NOT NULL,
    condition_threshold INTEGER
);

-- 11. TABLA: earned_badges
CREATE TABLE public.earned_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    badge_id TEXT NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, badge_id)
);

-- 12. TABLA: diagnostics
CREATE TABLE public.diagnostics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    responses JSONB NOT NULL,
    skill_scores JSONB NOT NULL,
    overall_score NUMERIC(3,1) NOT NULL,
    suggested_level INTEGER NOT NULL,
    mentor_adjusted_level INTEGER,
    mentor_observations TEXT
);

-- 13. ÍNDICES DE RENDIMIENTO
CREATE INDEX idx_student_profiles_user ON public.student_profiles(user_id);
CREATE INDEX idx_submissions_student ON public.mission_submissions(student_id);
CREATE INDEX idx_assignments_student ON public.mission_assignments(student_id);
CREATE INDEX idx_missions_skill ON public.missions(skill_id);
\`\`\``,
  },
  {
    id: 'seguridad_rls',
    number: 9,
    title: 'Políticas de Seguridad (Row Level Security - RLS)',
    category: 'Seguridad & APIs',
    content: `### 9. Políticas de Seguridad (Supabase RLS)

\`\`\`sql
-- Habilitar RLS en todas las tablas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earned_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostics ENABLE ROW LEVEL SECURITY;

-- FUNCIÓN AUXILIAR: ¿Es mentor?
CREATE OR REPLACE FUNCTION public.is_mentor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'mentor'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- POLÍTICAS: users
CREATE POLICY "Lectura pública para miembros del piloto"
ON public.users FOR SELECT TO authenticated USING (true);

-- POLÍTICAS: student_profiles
CREATE POLICY "Estudiantes leen su propio perfil"
ON public.student_profiles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_mentor());

CREATE POLICY "Mentores actualizan perfiles"
ON public.student_profiles FOR UPDATE TO authenticated
USING (public.is_mentor());

-- POLÍTICAS: missions
CREATE POLICY "Todos los autenticados leen misiones"
ON public.missions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Solo mentores crean o editan misiones"
ON public.missions FOR ALL TO authenticated
USING (public.is_mentor())
WITH CHECK (public.is_mentor());

-- POLÍTICAS: mission_submissions
CREATE POLICY "Estudiantes insertan sus entregas"
ON public.mission_submissions FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Estudiantes leen sus entregas y mentores leen todas"
ON public.mission_submissions FOR SELECT TO authenticated
USING (student_id = auth.uid() OR public.is_mentor());

CREATE POLICY "Solo mentores actualizan entregas (aprobación/feedback)"
ON public.mission_submissions FOR UPDATE TO authenticated
USING (public.is_mentor());
\`\`\``,
  },
  {
    id: 'sistema_roles',
    number: 10,
    title: 'Sistema de Roles & Matriz de Permisos',
    category: 'Seguridad & APIs',
    content: `### 10. Sistema de Roles (RBAC)

| Funcionalidad | Estudiante | Mentor Administrador |
| :--- | :---: | :---: |
| Completar cuestionario diagnóstico | ✅ (Solo el propio) | 👁️ (Lectura y recalibración) |
| Ver nivel, racha y XP | ✅ (Propio) | ✅ (De todos los 8 alumnos) |
| Marcar misión como "Cumplí" / "No cumplí" | ✅ | ❌ |
| Adjuntar reflexión y evidencia fotográfica | ✅ | ❌ |
| Aprobar / Rechazar misiones con evidencia | ❌ | ✅ |
| Crear y editar misiones del catálogo | ❌ | ✅ |
| Asignar misiones personalizadas | ❌ | ✅ |
| Crear / Editar catálogo de habilidades | ❌ | ✅ |
| Crear / Configurar nuevas insignias | ❌ | ✅ |
| Ver semáforo grupal y alertas de riesgo | ❌ | ✅ |
| Enviar mensaje semanal motivacional | ❌ | ✅ |`,
  },
  {
    id: 'api_endpoints',
    number: 11,
    title: 'Especificación de API Endpoints',
    category: 'Seguridad & APIs',
    content: `### 11. Especificación de API Endpoints (Next.js / Supabase)

#### Estudiantes:
- \`POST /api/diagnostic/submit\`
  - Body: \`{ responses: [{ questionId, score }] }\`
  - Response: \`{ suggestedLevel, skillScores, initialXp: 50 }\`
- \`POST /api/missions/[id]/submit\`
  - Body: \`{ status: 'cumplida'|'no_cumplida', reflection, evidenceUrl }\`
  - Response: \`{ xpAwarded, newLevel, streak, unlockedBadges: [] }\`
- \`GET /api/student/summary\`
  - Response: \`{ profile, skills, activeMissions, earnedBadges, recentHistory }\`

#### Mentor:
- \`GET /api/mentor/dashboard\`
  - Response: \`{ totalStudents, avgCompliance, activeMissionsCount, alerts: [], studentsHealth: [] }\`
- \`POST /api/missions/create\`
  - Body: \`{ title, description, skillId, xp, difficulty, type, requiresEvidence, assignedStudentIds }\`
- \`POST /api/submissions/[id]/review\`
  - Body: \`{ approved: boolean, mentorFeedback: string }\`
  - Response: \`{ status: 'cumplida'|'rechazada', xpAwarded }\`
- \`POST /api/mentor/weekly-message\`
  - Body: \`{ title, message, targetStudentId? }\``,
  },
  {
    id: 'historias_usuario',
    number: 12,
    title: 'Historias de Usuario (User Stories)',
    category: 'Producto & Planificación',
    content: `### 12. Historias de Usuario

#### Estudiante:
- **US-01 (Diagnóstico):** Como estudiante de grado 11, quiero responder un cuestionario inicial de 15 preguntas para conocer mi punto de partida en disciplina, enfoque y aprendizaje.
- **US-02 (Registro Diario):** Como estudiante, quiero marcar "Cumplí" o "No cumplí" en mis misiones diarias desde mi teléfono en menos de 10 segundos, para registrar mi hábito sin fricción.
- **US-03 (Reflexión):** Como estudiante, quiero escribir una breve reflexión al terminar una misión para interiorizar lo aprendido.
- **US-04 (Progreso & Fuego):** Como estudiante, quiero ver mi racha de días consecutivos y mi barra de XP para sentir motivación intrínseca de no romper la cadena.
- **US-05 (Insignias):** Como estudiante, quiero ganar insignias cuando supere retos difíciles para sentir reconocimiento.

#### Mentor:
- **US-06 (Visión de Semáforo):** Como mentor, quiero ver un semáforo de colores del grupo para saber inmediatamente quién está en riesgo (<50% cumplimiento).
- **US-07 (Creación Ágil):** Como mentor, quiero crear y asignar misiones personalizadas para estudiantes que necesiten un refuerzo específico.
- **US-08 (Validación Formativa):** Como mentor, quiero revisar evidencias de retos Boss y enviar retroalimentación cualitativa.
- **US-09 (Ajuste Pedagógico):** Como mentor, quiero modificar el nivel sugerido de un estudiante tras entrevistarme con él.`,
  },
  {
    id: 'backlog_priorizado',
    number: 13,
    title: 'Product Backlog Priorizado (Método MoSCoW)',
    category: 'Producto & Planificación',
    content: `### 13. Product Backlog Priorizado (MoSCoW)

#### Must Have (Esencial para el piloto con 8 estudiantes):
- Autenticación con perfiles Estudiante vs Mentor.
- Cuestionario diagnóstico de 15 preguntas con cálculo de nivel inicial.
- Vista móvil de misiones diarias/semanales con acción "Cumplí" / "No cumplí".
- Acumulación de XP y progresión matemática de niveles.
- Contador de racha diaria de cumplimiento.
- Panel de semáforo del mentor (Verde, Amarillo, Rojo) con alertas de riesgo.
- Aprobación de misiones con evidencia requerida.

#### Should Have (Añade gran valor en semana 2):
- Desbloqueo de insignias automáticas con confeti visual.
- Mensaje semanal del mentor en la cabecera del estudiante.
- Historial filtrable de reflexiones pasadas.
- Creación y edición dinámica de misiones por el mentor sin recargar página.

#### Could Have (Post-Piloto):
- Notificaciones Push móviles (Web Push API).
- Ranking o tabla de clasificación grupal cooperativa.
- Gráficas de radar interactivas con D3.

#### Won't Have (Descartado deliberadamente en el MVP):
- Chat en tiempo real 1 a 1 (se usa WhatsApp o feedback de entrega para evitar sobrearquitectura).
- Procesamiento de pagos o suscripciones.
- Módulos de contenido en video (la vida real es el aula de práctica).`,
  },
  {
    id: 'roadmap',
    number: 14,
    title: 'Roadmap de Implementación (4 Fases)',
    category: 'Producto & Planificación',
    content: `### 14. Roadmap de Implementación

- **Fase 1: Fundación & Piloto 8 Estudiantes (Días 1-14)**
  - MVP funcional en producción, diagnóstico, misiones core, semáforo de riesgo y validación con los 8 alumnos de grado 11.
- **Fase 2: Iteración Basada en Evidencia (Días 15-30)**
  - Entrevistas cualitativas con el mentor y estudiantes con racha rota. Calibración de la fórmula de XP e incentivos.
- **Fase 3: Expansión de Cohorte (Mes 2)**
  - Escalado a 3 cursos de grado 11 (aprox. 90 estudiantes). Introducción de misiones grupales colaborativas.
- **Fase 4: Modelo Institucional Colegios (Mes 3+)**
  - Módulo para rectores/orientadores, reportes exportables en PDF y métricas de impacto socioemocional.`,
  },
  {
    id: 'sprint_plan',
    number: 15,
    title: 'Sprint Plan de 2 Semanas para Validación del Piloto',
    category: 'Producto & Planificación',
    content: `### 15. Sprint Plan de 2 Semanas (Día a Día)

#### Semana 1: Onboarding y Rutina Base
- **Día 1:** Setup de Supabase, tablas SQL, RLS, despliegue en Vercel y carga de los 8 estudiantes.
- **Día 2:** Implementación del diagnóstico inicial de 15 preguntas y calibración del radar.
- **Día 3:** Creación del dashboard móvil del estudiante: avatar, racha, nivel y misiones de hoy.
- **Día 4:** Implementación de la interacción "Cumplí/No cumplí", modal de reflexión y cálculo de XP.
- **Día 5:** Sesión de bienvenida presencial/híbrida con los 8 estudiantes: todos completan el diagnóstico.
- **Día 6-7 (Fin de semana):** Primeras misiones de fin de semana (Planificación y desconexión digital).

#### Semana 2: Supervisión del Mentor y Refinamiento
- **Día 8:** Construcción del semáforo grupal del mentor, alertas de estudiantes en riesgo y cola de evidencias.
- **Día 9:** Implementación de motor de insignias (Primera misión, 7 días de constancia, Boss).
- **Día 10:** Mensajes semanales del mentor y feedback cualitativo en entregas.
- **Día 11:** Auditoría de métricas de racha: contacto directo con estudiantes en amarillo/rojo.
- **Día 12:** Lanzamiento del primer "Reto Boss" de Enfoque (Jornada de concentración profunda).
- **Día 13:** Aprobación de retos Boss y entrega de insignias conmemorativas.
- **Día 14:** Retrospectiva del Sprint: análisis de tasa de cumplimiento vs hipótesis inicial.`,
  },
  {
    id: 'codigo_inicial',
    number: 16,
    title: 'Código Inicial Listo para Producción',
    category: 'Seguridad & APIs',
    content: `### 16. Código Inicial y Estándares de Producción

El código del prototipo activo implementa:
- **Tipado estricto:** Modelos TypeScript para las 11 entidades relacionales.
- **Gestión de Estado Reactivo:** Suscripción desacoplada y sincronización en \`localStorage\` con fallback pre-sembrado.
- **Fórmula de XP Escalable:**
  - Nivel 1 = 0 XP
  - Nivel 2 = 100 XP
  - Nivel 3 = 250 XP
  - Nivel 4 = 500 XP
  - Nivel 5 = 1000 XP
  - Nivel N = Fórmula exponencial-cuadrática \`floor(1000 * 1.35^(N-5))\`
- **Semáforo Algorítmico:**
  - Verde: >= 80% cumplimiento
  - Amarillo: 50% - 79% cumplimiento
  - Rojo: < 50% cumplimiento`,
  },
  {
    id: 'config_supabase',
    number: 17,
    title: 'Configuración Paso a Paso de Supabase',
    category: 'DevOps & Despliegue',
    content: `### 17. Guía de Configuración en Supabase

1. **Crear Proyecto:** Ir a [database.new](https://database.new) y nombrar el proyecto \`aula-viva-pilot\`.
2. **Ejecutar DDL:** En el \`SQL Editor\`, pegar y ejecutar el script del entregable 8 (Tablas, Índices y Tipos).
3. **Aplicar RLS:** Ejecutar el script del entregable 9 para blindar las tablas con Row Level Security.
4. **Habilitar Autenticación:**
   - En \`Authentication > Providers > Email\`, habilitar \`Email Confirmations\` o deshabilitarlo temporalmente para el piloto rápido de 8 estudiantes.
   - Crear los usuarios iniciales con sus contraseñas temporales.
5. **Configurar Storage:**
   - Crear un bucket público llamado \`mission-evidence\`.
   - Política: Solo estudiantes autenticados pueden subir fotos; lectura para mentores y el autor.
6. **Obtener Variables de Entorno:**
   - \`NEXT_PUBLIC_SUPABASE_URL\`
   - \`NEXT_PUBLIC_SUPABASE_ANON_KEY\`
   - \`SUPABASE_SERVICE_ROLE_KEY\` (solo en backend para tareas administrativas)`,
  },
  {
    id: 'config_vercel',
    number: 18,
    title: 'Configuración Paso a Paso de Vercel',
    category: 'DevOps & Despliegue',
    content: `### 18. Guía de Despliegue en Vercel

1. **Importar Repositorio:** Conectar el repositorio de GitHub en Vercel.
2. **Framework Preset:** Seleccionar \`Next.js\`.
3. **Environment Variables:**
   - \`NEXT_PUBLIC_SUPABASE_URL\`
   - \`NEXT_PUBLIC_SUPABASE_ANON_KEY\`
   - \`NEXT_PUBLIC_APP_URL\` = https://aulaviva.vercel.app
4. **Configuración de Build:**
   - Build Command: \`npm run build\`
   - Output Directory: \`.next\`
5. **Dominio Personalizado:** Añadir dominio del colegio o subdominio temporal (ej: \`pilot.aulaviva.edu\`).`,
  },
  {
    id: 'estrategia_analitica',
    number: 19,
    title: 'Estrategia de Analítica y Métricas de Validación',
    category: 'Producto & Planificación',
    content: `### 19. Estrategia de Analítica para el Piloto (8 Estudiantes)

**Hipótesis a Validar:**
"La gamificación (XP, rachas visibles, insignias y semáforo) aumenta la constancia semanal en un 40% en comparación con la mentoría tradicional sin seguimiento."

**Métricas Clave de Rendimiento (KPIs):**
1. **DAU / WAU Ratio (Stickiness):** ¿Cuántos estudiantes entran al menos 5 de los 7 días de la semana? Meta: >75% (6 de 8 estudiantes).
2. **Tasa de Cumplimiento de Misiones Diarias:** Meta: >80% en verde.
3. **Tasa de Retención de Racha:** % de estudiantes que mantienen una racha activa superior a 5 días.
4. **Tasa de Reflexión Cualitativa:** % de misiones marcadas donde el alumno escribió al menos 1 oración de introspección (Meta: >60%).
5. **Tiempo de Respuesta del Mentor en Evidencias:** Meta: < 24 horas para mantener vivo el bucle de retroalimentación.`,
  },
  {
    id: 'checklist_despliegue',
    number: 20,
    title: 'Checklist de Despliegue en Producción',
    category: 'DevOps & Despliegue',
    content: `### 20. Checklist Pre-Despliegue y Validación Final

- [x] Esquema PostgreSQL con llaves foráneas y tipos ENUM creado.
- [x] RLS verificado: Estudiantes no pueden leer ni alterar entregas ajenas.
- [x] Cuestionario diagnóstico de 15 preguntas con cálculo ponderado activo.
- [x] Fórmula de niveles y XP validada matemáticamente.
- [x] 8 Estudiantes de grado 11 y 1 Mentor pre-configurados.
- [x] Semáforo de colores (Verde >80%, Amarillo 50-80%, Rojo <50%) probado.
- [x] Cola de aprobación de evidencias con feedback cualitativo implementada.
- [x] PWA responsive con soporte para pantallas táctiles móviles.
- [x] Alertas automáticas de estudiantes en riesgo de abandono.
- [x] Envío de mensajes semanales del mentor hacia el grupo.`,
  },
];
