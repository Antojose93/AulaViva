# 📘 Manual del Mentor — Aula Viva

Guía práctica para docentes/mentores que usan Aula Viva para acompañar a sus estudiantes de Grado 11 en el desarrollo de habilidades para la vida (disciplina, enfoque, aprender a aprender, etc.) mediante misiones, XP e insignias.

---

## 1. Acceso a la plataforma

1. Entra a la URL de la aplicación (Firebase Hosting): `https://gen-lang-client-0556432197.web.app`
2. En la pantalla de inicio de sesión:
   - **Registrarse** (primera vez): elige el rol **Mentor**, ingresa tu nombre, correo y contraseña, y escribe el **código de acceso de mentor**: `AULAVIVA2026`. Este código evita que estudiantes se autoasignen el rol de mentor.
   - **Iniciar sesión**: si ya tienes cuenta, usa correo/contraseña o el botón **Continuar con Google**.
3. Al entrar verás el **Panel de Mentor** (`/mentor`), distinto al panel de estudiante — cada rol solo puede ver su propio panel (rutas protegidas por rol).

> 🔒 Tu cuenta y tus datos quedan aislados por rol: un estudiante nunca puede ver el panel de mentor, ni modificar misiones o insignias.

---

## 2. Panel principal del Mentor

Al ingresar verás un resumen general del grupo:

- **Total de estudiantes** activos en la plataforma.
- **Tasa de cumplimiento grupal** (% de misiones completadas sobre las asignadas).
- **Distribución por semáforo de salud académica**:
  - 🟢 **Óptimo**: ≥ 80% de cumplimiento.
  - 🟡 **Observación**: entre 50% y 79%.
  - 🔴 **Riesgo**: menor a 50%.
- **Alertas automáticas** (inactividad, racha perdida, bajo cumplimiento, diagnóstico pendiente).
- Barra de **búsqueda** y **filtro por estado de salud** para localizar estudiantes rápidamente.

---

## 3. Gestión de misiones

Desde el botón **"Nueva misión"** puedes crear retos que aparecerán en el panel de cada estudiante asignado:

| Campo | Descripción |
|---|---|
| Título / Descripción | Qué debe hacer el estudiante |
| Habilidad asociada | A qué habilidad (skill) suma XP |
| XP otorgado | Puntos de experiencia al completarse |
| Dificultad | `fácil`, `media`, `difícil`, `épica` |
| Tipo | `diaria`, `semanal`, `reto/boss`, `personalizada` |
| Requiere evidencia | Si el estudiante debe subir foto/archivo o solo marcar "cumplí" |
| Estudiantes asignados | A todos o a estudiantes específicos |
| Fecha inicio/fin | Vigencia de la misión |

Puedes **editar** o **eliminar** misiones ya creadas desde la misma sección.

---

## 4. Revisar y aprobar entregas

En **"Cola de aprobaciones"** verás todas las misiones que los estudiantes marcaron como cumplidas y que requieren tu validación (especialmente las que piden evidencia):

- Revisa la reflexión escrita y la evidencia adjunta (imagen/archivo).
- **Aprueba** (otorga el XP) o **rechaza** (con retroalimentación) cada entrega.
- El estudiante recibe una notificación automática con tu decisión y comentarios.

---

## 5. Habilidades e insignias

- **Habilidades (Skills):** catálogo de competencias de vida que se rastrean por XP y nivel individual (ej. Disciplina, Enfoque, Aprender a aprender). Puedes agregar habilidades personalizadas para tu grupo.
- **Insignias (Badges):** logros automáticos o manuales:
  - Automáticas: primera misión completada, racha de 7 días, 10 misiones cumplidas, misión difícil/boss superada, nivel de habilidad alcanzado.
  - Manuales: puedes otorgar una insignia personalizada a un estudiante específico como reconocimiento especial.

---

## 6. Detalle de estudiante

Al hacer clic sobre un estudiante puedes ver:

- Su progreso general (nivel, XP, racha actual y récord de racha).
- Progreso por habilidad.
- Historial de misiones y entregas.
- Insignias obtenidas.
- Notas privadas del mentor (`mentorNotes`) y ajuste manual del nivel diagnóstico si lo consideras necesario.

---

## 7. Mensajes semanales

Puedes redactar un **mensaje/orientación semanal** dirigido a todo el grupo o a un estudiante en particular. Estos mensajes llegan como notificación y quedan visibles en el historial del estudiante.

---

## 8. Buenas prácticas sugeridas

- Revisa la cola de aprobaciones con frecuencia: mientras una entrega esté pendiente, el estudiante no recibe el XP.
- Usa el semáforo de salud para priorizar el acompañamiento de estudiantes en 🔴 riesgo.
- Aprovecha las insignias manuales para reforzar comportamientos que el sistema automático no contempla (ej. actitud, colaboración).
- Ajusta la dificultad/XP de las misiones según el nivel real del grupo; el sistema de niveles es acumulativo y escalable (ver tabla de umbrales en la documentación técnica).

---

## 9. ¿Y si algo no funciona?

- Si no puedes iniciar sesión con Google, revisa que estés usando un correo institucional válido.
- Si una entrega no aparece en la cola de aprobaciones, verifica el filtro de estado activo.
- Para dudas técnicas o de configuración de la plataforma, contacta al administrador/desarrollador del proyecto (ver `docs/DOCUMENTACION-TECNICA.md`).
