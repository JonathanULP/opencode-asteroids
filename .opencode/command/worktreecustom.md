---
description: Crea un git worktree local a partir de un nombre descriptivo.
agent: build
---

Toma el siguiente argumento y conviértelo en un nombre válido para directorio:
- Minúsculas
- Reemplazar espacios por guiones
- Eliminar caracteres especiales (solo letras, números y guiones)
- Si el nombre del argumento es muy largo, simplificado a uno mas corto significativo

Ejecuta exactamente este comando sin cambiar de directorio ni hacer nada más:

git worktree add .worktrees/<nombre-convertido>

Argumento del usuario: $ARGUMENTS
