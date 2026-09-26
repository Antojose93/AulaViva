# 🏗️ Documentación Técnica — Arquitectura de Aula Viva

> Esta documentación describe la **implementación real** del proyecto (código en `src/`). No confundir con el contenido narrativo de `src/data/productionDocs.ts`, que describe un blueprint conceptual alternativo (Next.js + Supabase) usado únicamente como material de referencia dentro del modal "Documentación" de la app, pero que **no** corresponde al stack realmente implementado.

---

## 1. Stack tecnológico real

| Capa | Tecnología |
|---|---|
| Framework UI | **React 19** + **TypeScript** |
| Build tool / Dev server | **Vite 6** |
| Enrutamiento | **React Router DOM v7** (`BrowserRouter`) |
| Estilos | **Tailwind CSS v4** (`@tailwindcss/vite`) |
| Iconografía | `lucide-react` |
| Animaciones | `motion` (Framer Motion) |
| Gráficas | `recharts` |
| Confeti/celebraciones | `canvas-confetti` |
| Backend (BaaS) | **Firebase**: Authentication + Cloud Firestore |
| IA (SDK incluido, sin uso activo actual) | `@google/genai` (Gemini) |
| Hosting/Despliegue | **Firebase Hosting** |
| CI/CD | GitHub Actions (`FirebaseExtended/action-hosting-deploy`) |

No hay backend propio (Node/Express) en producción: `express` está en dependencias pero no se usa para servir la SPA en Firebase Hosting (los archivos `dist/` se sirven estáticos).

---

## 2. Arquitectura general

```
┌─────────────────────────────────────────────────────────┐
│                Navegador (SPA - React)                    │
│  React Router → Vistas por rol (Estudiante / Mentor)      │
│  Context API → AuthContext (sesión y usuario actual)      │
└───────────────────────┬─────────────────────────────────┘
                         │ Firebase SDK (cliente)
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    Firebase (BaaS)                         │
│  ├── Firebase Authentication                               │
│  │     (Email/Password + Google OAuth)                     │
│  ├── Cloud Firestore (base de datos NoSQL, tiempo real)    │
│  │     Base de datos con nombre dedicado                   │
│  │     "ai-studio-aulaviva-..." (no "(default)")            │
│  └── Firestore Security Rules (control de acceso por rol)  │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
               Firebase Hosting (dist/ estático)
        https://gen-lang-client-0556432197.web.app
```

**Patrón de datos:** la app usa `onSnapshot` de Firestore (suscripciones en tiempo real) en vez de fetch puntual, por lo que los paneles de Mentor y Estudiante se actualizan automáticamente cuando cambian los datos (ej. una entrega aprobada refleja el nuevo XP sin recargar la página).

**Autenticación y autorización:**
- `src/context/AuthContext.tsx` expone el usuario autenticado (`user`) y funciones `login`, `loginWithGoogle`, `register`, `logout`.
- `src/services/firebaseAuth.ts` sincroniza el usuario de Firebase Auth con su documento en la colección `users` de Firestore (crea el documento y el perfil de estudiante en el primer inicio de sesión).
- `src/components/Auth/ProtectedRoute.tsx` protege rutas según `allowedRoles` (`student` | `mentor`); redirige a `/login` si no hay sesión, o a `/unauthorized` si el rol no coincide.
- `firestore.rules` aplica las mismas reglas de aislamiento de datos en el servidor (defensa en profundidad): un estudiante solo puede escribir sus propios documentos; el mentor tiene permisos ampliados.

---

## 3. Estructura de carpetas

```
aula-viva/
├── index.html                 # Punto de entrada HTML (usado por Vite)
├── vite.config.ts             # Configuración de Vite (alias "@", plugin React/Tailwind)
├── tsconfig.json              # Configuración de TypeScript
├── package.json                # Scripts y dependencias del proyecto
├── firebase.json               # Configuración de Firebase Hosting (carpeta "dist", rewrites SPA)
├── .firebaserc                 # Alias de proyecto Firebase por defecto
├── firestore.rules             # Reglas de seguridad de Firestore (control de acceso por rol)
├── storage.rules               # Reglas de seguridad de Firebase Storage
├── firebase-applet-config.json # Config de Firebase (apiKey, projectId, IDs) generada por AI Studio
├── firebase-blueprint.json     # Esquema/blueprint de entidades de datos (documental)
├── .github/workflows/          # Pipelines de CI/CD (deploy automático a Firebase Hosting)
├── docs/                       # Documentación del proyecto (este set de documentos)
└── src/
    ├── main.tsx                 # Punto de montaje de React (ReactDOM.createRoot)
    ├── App.tsx                  # Definición de rutas (React Router) y redirección raíz
    ├── index.css                # Estilos globales + directivas Tailwind
    ├── types.ts                 # Todas las interfaces/tipos de dominio (User, Mission, Badge, etc.)
    │
    ├── lib/
    │   └── firebase.ts          # Inicialización de Firebase App, Auth y Firestore (con databaseId dedicado)
    │
    ├── context/
    │   └── AuthContext.tsx      # Provider de sesión: user, firebaseUser, login/register/logout
    │
    ├── services/                # Capa de acceso a datos y lógica de negocio (sin UI)
    │   ├── firebaseAuth.ts             # Login/registro/logout + creación de usuario en Firestore
    │   ├── firebaseFirestoreService.ts # CRUD y suscripciones en tiempo real a todas las colecciones
    │   ├── gamification.ts             # Reglas de XP, niveles, semáforo de salud e insignias
    │   └── storage.ts                  # Utilidades de estado local / caché (localStorage)
    │
    ├── data/
    │   ├── initialData.ts       # Datos semilla (seed) para poblar Firestore la primera vez
    │   └── productionDocs.ts    # Contenido narrativo mostrado en el modal "Documentación" de la app
    │
    └── components/
        ├── Navbar.tsx           # Barra superior común (ambos roles)
        │
        ├── Auth/
        │   ├── LoginPage.tsx        # Formulario de login/registro + botón "Continuar con Google"
        │   ├── ProtectedRoute.tsx   # HOC de protección de rutas por rol
        │   └── UnauthorizedPage.tsx # Página 403 cuando el rol no coincide con la ruta
        │
        ├── StudentView/         # Todo lo visible/usado por el rol "student"
        │   ├── StudentPage.tsx         # Contenedor de página (Navbar + Dashboard + modales)
        │   ├── StudentDashboard.tsx    # Estado central: suscripciones Firestore, pestañas, tabs
        │   ├── MissionCard.tsx         # Tarjeta de misión individual (marcar cumplida/evidencia)
        │   ├── SkillsOverview.tsx      # Progreso por habilidad
        │   ├── BadgesGrid.tsx          # Grilla de insignias obtenidas/pendientes
        │   ├── HistoryTab.tsx          # Historial de misiones y entregas
        │   ├── WeeklyXpChart.tsx       # Gráfico (recharts) de XP semanal
        │   ├── DiagnosticModal.tsx     # Cuestionario diagnóstico inicial
        │   ├── MentorMessageModal.tsx  # Detalle de un mensaje semanal del mentor
        │   └── NotificationsCenterModal.tsx # Centro de notificaciones del estudiante
        │
        ├── MentorView/          # Todo lo visible/usado por el rol "mentor"
        │   ├── MentorPage.tsx           # Contenedor de página (Navbar + Dashboard)
        │   ├── MentorDashboard.tsx      # Estado central: métricas grupales, alertas, filtros
        │   ├── ApprovalsQueueModal.tsx  # Cola de entregas pendientes de aprobar/rechazar
        │   ├── MissionFormModal.tsx     # Crear/editar misiones
        │   ├── SkillsAndBadgesModal.tsx # Gestión de catálogo de habilidades e insignias
        │   ├── StudentDetailModal.tsx   # Ficha detallada de un estudiante
        │   └── WeeklyMessageModal.tsx   # Redacción de mensajes semanales
        │
        └── DocsView/
            └── DocsModal.tsx     # Modal que muestra `productionDocs.ts` dentro de la app
```

---

## 4. Modelo de datos (Firestore)

Colecciones principales (ver `src/types.ts` y `firestore.rules` para el detalle exacto de campos y permisos):

| Colección | Descripción |
|---|---|
| `users` | Cuenta base: id (uid de Firebase Auth), nombre, correo, rol, avatar |
| `studentProfiles` | Gamificación del estudiante: XP total, nivel, racha, estado de salud |
| `skills` | Catálogo de habilidades para la vida |
| `skillLevels` | XP/nivel de un estudiante por habilidad |
| `missions` | Misiones creadas por el mentor |
| `missionAssignments` | Relación misión ↔ estudiante con estado |
| `missionSubmissions` | Entregas (reflexión, evidencia, estado, XP otorgado) |
| `badges` | Catálogo de insignias y su condición de obtención |
| `earnedBadges` | Insignias ya otorgadas a cada estudiante |
| `diagnosticQuestions` / `diagnosticResults` | Cuestionario inicial y resultados por estudiante |
| `weeklyMessages` | Mensajes semanales del mentor |
| `studentNotifications` | Notificaciones individuales del estudiante |
| `systemMeta` | Bandera interna para controlar el seed inicial de datos |

**Seguridad:** todas las colecciones exigen `request.auth != null` (usuario autenticado) como mínimo; la mayoría de escrituras están restringidas a "ser el propio dueño del documento" o "ser mentor" (`isMentor()` en `firestore.rules`), incluyendo un mentor "maestro" hardcodeado por correo como respaldo.

---

## 5. Lógica de gamificación (`services/gamification.ts`)

- **Niveles:** tabla de umbrales de XP (`LEVEL_THRESHOLDS`) para los primeros niveles, y fórmula exponencial (`1000 * 1.35^(nivel-5)`) para niveles superiores no tabulados.
- **Semáforo de salud del estudiante:** basado en `% de misiones completadas / asignadas`:
  - ≥ 80% → 🟢 óptimo
  - 50–79% → 🟡 observación
  - < 50% → 🔴 riesgo
- **Insignias automáticas:** evaluadas comparando el perfil/entregas del estudiante contra condiciones configurables (`conditionType` + `conditionThreshold`) — primera misión, racha, cantidad de misiones, misión difícil, nivel de habilidad. Las insignias `custom` solo se otorgan manualmente por el mentor.

---

## 6. Build, configuración y despliegue

| Comando | Qué hace |
|---|---|
| `npm install` | Instala dependencias |
| `npm run dev` | Levanta Vite en modo desarrollo (`--port=3000 --host=0.0.0.0`) |
| `npm run build` | Compila la SPA a la carpeta **`dist/`** (Vite build) |
| `npm run preview` | Sirve `dist/` localmente para previsualizar el build |
| `npm run lint` | Verifica tipos con `tsc --noEmit` (no hay ESLint configurado) |
| `npx firebase deploy --only hosting` | Publica `dist/` en Firebase Hosting |

**`firebase.json`:** define `"public": "dist"` y un rewrite `"**" → "/index.html"` para que las rutas de React Router (`/student`, `/mentor`, etc.) funcionen correctamente al recargar la página directamente en esas URLs (comportamiento típico de SPA).

**CI/CD (`.github/workflows/`):**
- `firebase-hosting-merge.yml`: en cada push a `main`, instala dependencias (`npm ci`), compila (`npm run build`) y despliega al canal `live`.
- `firebase-hosting-pull-request.yml`: en cada Pull Request, genera un canal de vista previa temporal.
- Autenticación con Firebase vía secret de repositorio `FIREBASE_SERVICE_ACCOUNT_GEN_LANG_CLIENT_0556432197` (cuenta de servicio, no expone credenciales de usuario).

**Configuración de Firebase (`src/lib/firebase.ts`):** el `apiKey`/`projectId` de Firebase Web están hardcodeados en el código fuente. Esto es intencional y seguro para Firebase Web: estas claves **no son secretas** (identifican el proyecto, no autorizan por sí solas); la seguridad real recae en `firestore.rules`/`storage.rules` y en Firebase App Check/Auth. No se debe agregar aquí ninguna clave de servidor o de administrador.

---

## 7. Convenciones de código observadas

- Componentes funcionales de React con Hooks (`useState`, `useEffect`), sin clases.
- Tipado estricto vía TypeScript (`src/types.ts` como fuente única de verdad del dominio).
- Separación clara entre **`services/`** (lógica de datos y negocio, sin JSX) y **`components/`** (UI), agrupados por rol de usuario (`StudentView/`, `MentorView/`).
- Suscripciones en tiempo real (`onSnapshot`) siempre limpiadas en el `return` del `useEffect` para evitar fugas de memoria.
- Estilado con clases utilitarias de Tailwind directamente en JSX (no hay CSS Modules ni styled-components).
