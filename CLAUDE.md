# Instrucciones para Claude Code

Las reglas de este proyecto están en [AGENTS.md](AGENTS.md) (el estándar del repo). Léelo completo antes de hacer nada.

@AGENTS.md

## Solo para Claude Code

- Respeta `~/.claude/CLAUDE.md` (reglas globales, protocolo de decisiones en `~/.devtrace/decisions/restaurant_os.md`).
- Orquestación: lanza agentes con la herramienta Agent, uno por tarea y con `isolation: "worktree"`; tú vigilas y mergeas. Detalle en `docs/DEV_WORKFLOW.md`.
- Este archivo y `AGENTS.md` no se editan sin consenso explícito del usuario.
