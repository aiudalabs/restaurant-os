#!/bin/bash
# setup_agents.sh — Lanza el orquestador de RestaurantOS
# Ejecutar desde la raíz del repo:
#   chmod +x setup_agents.sh && ./setup_agents.sh
#
# Actualizado 2026-03-29: ya no usa worktrees.
# Todo el trabajo parte de main con feature branches.

set -e

ROOT=$(pwd)

echo "📋 Estado actual del repo:"
git branch
echo ""
git log --oneline -5
echo ""

echo "🚀 Lanzando orquestador Claude Code..."
echo "   El orquestador lanzará 3 subagentes en paralelo:"
echo "   - A4: Admin React (Sprints 2-5)"
echo "   - A2: Client Flutter (completo)"
echo "   - A3: Kitchen Flutter (completo)"
echo ""

claude --dangerously-skip-permissions "$(cat ORCHESTRATOR.md)"
