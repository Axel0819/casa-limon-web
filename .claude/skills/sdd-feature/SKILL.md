---
name: sdd-feature
description: Flujo Spec-Driven Development de CasaLimón. Crea la carpeta specs/NNN-slug con spec.md, plan.md y tasks.md usando las plantillas del proyecto, y orquesta los subagentes (spec-writer → aprobación humana → planner → schema-rls/ui-screens → security-reviewer/qa-reviewer). Úsala al iniciar una fase o feature nueva.
---

# Feature SDD en CasaLimón

Cada fase del MVP se trabaja como una o varias features con tres artefactos en `specs/NNN-<slug>/`. El documento raíz es `specs/000-project-constitution.md`.

## Flujo

1. **Spec** → subagente `spec-writer` crea `spec.md` (Estado: Borrador).
2. **Checkpoint humano** → el usuario revisa y cambia el estado a `Aprobada`. No se genera plan ni código antes de esto. Pregunta al usuario si no está claro.
3. **Plan** → subagente `planner` crea `plan.md` y `tasks.md`.
4. **Implementación** → `schema-rls` (supabase/) y `ui-screens` (src/) por tarea, en orden.
5. **Revisión** → `security-reviewer` (si toca datos/auth/deploy) y `qa-reviewer`. Marca las tareas `[x]` solo tras su veredicto.

Numeración: el siguiente número libre de tres dígitos en `specs/`. Slug en kebab-case y español (`004-ofertas`).

## Plantilla `spec.md`

```markdown
# NNN — <Título>
Estado: Borrador | Aprobada · Fase: <n> · Fecha: <YYYY-MM-DD>

## Objetivo
Qué se construye y por qué (1–3 párrafos).

## Alcance
### Incluido
### Fuera de alcance

## Usuarios y casos de uso
- Como <buscador|propietario>, quiero ... para ...

## Requisitos funcionales
RF-01 ...

## Requisitos no funcionales
Responsive (celular/escritorio), accesibilidad, rendimiento, seguridad (RLS).

## Criterios de aceptación
- CA-01 Dado ..., cuando ..., entonces ...
(incluir estados vacíos, errores y diferencias celular/escritorio)

## Decisiones y riesgos
| Tema | Decisión | Justificación |
(moderación, confianza, retención, adopción, Web Push en iOS si aplica; "no se resuelve en el MVP" es válido)

## Preguntas abiertas
- [PENDIENTE: ...]
```

## Plantilla `plan.md`

```markdown
# Plan — NNN <Título>
Spec: ./spec.md

## Resumen técnico
## Datos (tablas, índices, RLS, Storage, triggers, Edge Functions)
## Frontend (rutas, componentes, hooks, query keys, stores)
## Realtime / notificaciones
## Seguridad
## Pruebas
## Riesgos técnicos
## Asignación (subagente · skill)
## Preguntas abiertas
```

## Plantilla `tasks.md`

```markdown
# Tareas — NNN <Título>

- [ ] T01 <acción> — `archivo` — @schema-rls — Verificación: <criterio concreto>
- [ ] T02 ...
- [ ] TNN Revisión de seguridad — @security-reviewer
- [ ] TNN Revisión QA contra CA-01..CA-xx — @qa-reviewer
```
