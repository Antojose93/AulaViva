# 🎓 Ruta de Aprendizaje — Tecnologías de Aula Viva

Ruta de aprendizaje ordenada para que cualquier desarrollador pueda comprender, mantener y extender el proyecto **Aula Viva** de principio a fin. No incluye HTML básico como tema propio: se asume que se aprende de forma incidental dentro de JSX/React. El enfoque es JavaScript/TypeScript, React, Firebase y el ecosistema de build/despliegue realmente usado en este repositorio.

> Sugerencia: sigue el orden de las fases. Cada fase incluye **qué aprender**, **por qué se usa en este proyecto** y **dónde verlo aplicado en el código**.

---

## Fase 0 — Fundamentos indispensables

| Tema | Por qué lo necesitas | Dónde se aplica en el proyecto |
|---|---|---|
| **JavaScript moderno (ES2020+)**: `const/let`, arrow functions, destructuring, spread/rest, template literals, promesas, `async/await`, módulos ES (`import`/`export`) | Todo el código del proyecto está escrito en esta sintaxis | Cualquier archivo `.ts`/`.tsx` |
| **TypeScript básico**: tipos primitivos, `interface`, `type`, uniones (`|`), genéricos simples, `enum`-like con union types | El proyecto es 100% TypeScript, sin JS suelto | `src/types.ts` (todas las entidades del dominio) |
| **Git y GitHub**: commits, branches, pull requests, `.gitignore` | Necesario para colaborar y para el pipeline de CI/CD | `.github/workflows/`, `.gitignore` |
| **Node.js y npm**: instalar dependencias, ejecutar scripts (`npm run <script>`) | Todo el flujo de desarrollo/build pasa por npm | `package.json` → sección `scripts` |

---

## Fase 1 — React (la base de la interfaz)

| Tema | Por qué lo necesitas | Dónde se aplica |
|---|---|---|
| JSX y componentes funcionales | Toda la UI se construye así | `src/components/**/*.tsx` |
| Props y composición de componentes | Los paneles se arman combinando componentes pequeños | `StudentPage.tsx` → usa `Navbar`, `StudentDashboard`, modales |
| Hooks: `useState`, `useEffect` | Manejo de estado local y efectos secundarios (suscripciones) | `StudentDashboard.tsx`, `MentorDashboard.tsx` |
| Context API (`createContext`, `useContext`) | Compartir el usuario autenticado en toda la app sin pasar props manualmente | `src/context/AuthContext.tsx` |
| Manejo de formularios controlados | Login/registro, formularios de misión, mensajes | `LoginPage.tsx`, `MissionFormModal.tsx` |
| Renderizado condicional y listas (`.map`) | Mostrar misiones, insignias, estudiantes, etc. | `MissionCard.tsx`, `BadgesGrid.tsx` |
| Ciclo de vida y limpieza de efectos (return de `useEffect`) | Cancelar suscripciones de Firestore correctamente | Cualquier `useEffect` que llame a `subscribeTo...` |

**Recursos recomendados:** documentación oficial de React (react.dev), sección "Learn React" (componentes, hooks, contexto).

---

## Fase 2 — React Router (navegación de una SPA)

| Tema | Por qué lo necesitas | Dónde se aplica |
|---|---|---|
| `BrowserRouter`, `Routes`, `Route` | Define las páginas de la app | `src/App.tsx` |
| `Navigate` (redirecciones programáticas) | Redirigir según sesión/rol | `App.tsx` (`RootRedirect`), `ProtectedRoute.tsx` |
| Rutas protegidas / guards | Aislar `/student` y `/mentor` por rol | `src/components/Auth/ProtectedRoute.tsx` |
| `useNavigate`, `useLocation` | Navegar tras login/logout, leer el estado de "from" | `LoginPage.tsx`, `ProtectedRoute.tsx` |
| Rewrites de SPA en hosting (`**` → `/index.html`) | Entender por qué hace falta configurarlo para que las rutas no den 404 al recargar | `firebase.json` |

---

## Fase 3 — TypeScript aplicado a un dominio real

| Tema | Por qué lo necesitas | Dónde se aplica |
|---|---|---|
| Modelado de entidades de dominio con `interface` | Entender el "contrato" de datos de toda la app | `src/types.ts` |
| Tipos unión literales (`'student' | 'mentor'`) | Modelar roles, estados, dificultades, etc. | `UserRole`, `MissionDifficulty`, `SubmissionStatus` en `types.ts` |
| Tipado de props de componentes (`interface XProps`) | Cada componente tipa lo que recibe | Encabezado de cualquier componente (`interface StudentDashboardProps`) |
| Genéricos simples (`Record<string, number>`, `Map<string, T>`) | Estructuras de agregación (ej. scores por habilidad) | `DiagnosticResult.skillScores`, `gamification.ts` |

---

## Fase 4 — Firebase (backend como servicio)

Este es el bloque más importante del proyecto: reemplaza a un backend tradicional.

### 4.1 Firebase Authentication
- Proveedores usados: **Email/Password** y **Google (OAuth)**.
- Conceptos clave: `onAuthStateChanged`, `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `signInWithPopup` + `GoogleAuthProvider`, `signOut`.
- Dónde verlo: `src/services/firebaseAuth.ts`, `src/context/AuthContext.tsx`.
- Dominios autorizados para OAuth (`Authorized domains` en Firebase Console) — necesario para que Google Sign-In funcione en cada entorno (localhost, producción).

### 4.2 Cloud Firestore
- Conceptos clave: colecciones/documentos, `doc()`, `collection()`, `getDoc`/`getDocs`, `setDoc`/`updateDoc`, `query` + `where`, y sobre todo **`onSnapshot`** (suscripciones en tiempo real).
- Bases de datos con nombre (`databaseId` distinto de `"(default)"`) — este proyecto usa una base de datos Firestore dedicada.
- Dónde verlo: `src/lib/firebase.ts` (inicialización), `src/services/firebaseFirestoreService.ts` (todo el CRUD y las suscripciones).

### 4.3 Firestore Security Rules
- Sintaxis de `firestore.rules`: `match`, funciones reutilizables (`function isMentor() {...}`), `request.auth`, `resource.data` vs `request.resource.data`.
- Por qué importa: es la verdadera capa de seguridad de datos (el cliente nunca debe ser la única barrera).
- Dónde verlo: `firestore.rules` (raíz del proyecto).

### 4.4 Firebase Storage (uso básico)
- Reglas de Storage para evidencias de misiones (`storage.rules`).

### 4.5 Firebase Hosting
- `firebase.json`, `.firebaserc`, comandos `firebase login`, `firebase deploy`.
- Rewrites para SPA, carpeta pública (`dist`).

**Recursos recomendados:** documentación oficial de Firebase (firebase.google.com/docs) — módulos de Auth, Firestore y Hosting específicamente para Web (JS SDK v9+ modular, que es el que usa este proyecto: `import { ... } from 'firebase/auth'`, `from 'firebase/firestore'`).

---

## Fase 5 — Herramientas de build y estilos

| Tema | Por qué lo necesitas | Dónde se aplica |
|---|---|---|
| **Vite**: dev server, `vite build`, variables `import.meta.env`, alias de rutas | Es el bundler/dev server del proyecto | `vite.config.ts`, scripts en `package.json` |
| **Tailwind CSS v4**: clases utilitarias, diseño responsivo (`sm:`, `md:`), estados (`hover:`, `disabled:`) | Todo el estilado visual de la app | Cualquier `className="..."` en los componentes |
| **lucide-react** (iconos), **recharts** (gráficas), **canvas-confetti** (celebraciones), **motion** (animaciones) | Librerías de UI/UX puntuales usadas en el dashboard | `WeeklyXpChart.tsx` (recharts), tarjetas con iconos `lucide-react` |

---

## Fase 6 — Lógica de negocio y patrones propios del proyecto

| Tema | Dónde se aplica |
|---|---|
| Sistema de XP, niveles y progresión escalable | `src/services/gamification.ts` |
| Cálculo de "salud" del estudiante (semáforo) | `calculateStudentHealth` en `gamification.ts` |
| Evaluación de insignias por condiciones configurables | `evaluateBadgesForStudent` en `gamification.ts` |
| Seed de datos inicial (poblar Firestore la primera vez) | `src/data/initialData.ts`, `FirebaseFirestoreService.seedInitialDataIfNeeded` |

---

## Fase 7 — CI/CD y despliegue en producción

| Tema | Por qué lo necesitas | Dónde se aplica |
|---|---|---|
| GitHub Actions: sintaxis YAML, `jobs`, `steps`, `secrets` | Automatizar build + deploy sin intervención manual | `.github/workflows/firebase-hosting-merge.yml`, `...-pull-request.yml` |
| Cuentas de servicio de Firebase/Google Cloud | Autenticar el deploy desde CI sin usar credenciales personales | Secret `FIREBASE_SERVICE_ACCOUNT_GEN_LANG_CLIENT_0556432197` |
| Conceptos de Firebase Hosting Channels (`live` vs preview) | Entender por qué los PRs generan URLs temporales de vista previa | `firebase-hosting-pull-request.yml` (sin `channelId`, genera preview) |

---

## Fase 8 (opcional/futuro) — IA generativa con Gemini

El proyecto incluye el SDK `@google/genai` y una variable `GEMINI_API_KEY`, pero **actualmente no hay ninguna llamada activa a la API de Gemini en el código de producción** (`src/`). Si en el futuro se agrega una funcionalidad de IA (ej. sugerencias automáticas de misiones o retroalimentación generada), sería el momento de estudiar:

- Conceptos básicos de LLMs y prompting.
- SDK `@google/genai` (cliente para Gemini API).
- Manejo seguro de API keys (nunca en el cliente/frontend en texto plano si la clave es sensible; usar un backend intermediario o Cloud Functions).

---

## Ruta resumida (orden sugerido de estudio)

1. JavaScript moderno + TypeScript básico
2. Git/GitHub + npm
3. React (componentes, hooks, contexto)
4. React Router (SPA, rutas protegidas)
5. TypeScript aplicado a modelos de dominio reales
6. Firebase Authentication
7. Cloud Firestore + Security Rules
8. Firebase Storage + Hosting
9. Vite + Tailwind CSS
10. Lógica de negocio propia del proyecto (gamification.ts)
11. CI/CD con GitHub Actions
12. (Opcional) Gemini / IA generativa

Con estas 12 paradas, cualquier desarrollador puede leer, entender y modificar con seguridad cualquier parte de Aula Viva — desde una tarjeta de misión hasta las reglas de seguridad de Firestore o el pipeline de despliegue.
