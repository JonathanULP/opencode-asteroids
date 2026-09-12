#!/usr/bin/env bash
set -euo pipefail

REPO="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY no definido}"
EVENT_PATH="${GITHUB_EVENT_PATH:?GITHUB_EVENT_PATH no definido}"
RUNNER_TEMP="${RUNNER_TEMP:-.tmp}"

ACTION=$(jq -r '.action // "(sin action)"' "$EVENT_PATH")

if ! jq -e '.issue | type == "object" and (.number | type == "number")' "$EVENT_PATH" >/dev/null 2>&1; then
  echo "ERROR: evento ${GITHUB_EVENT_NAME} (action: ${ACTION}) sin issue valido."
  echo "Claves del payload: $(jq -r 'keys | join(", ")' "$EVENT_PATH")"
  echo "--- Previa del payload ---"
  head -c 2000 "$EVENT_PATH"
  exit 1
fi

NUMBER=$(jq -r '.issue.number' "$EVENT_PATH")
TITLE=$(jq -r '.issue.title' "$EVENT_PATH")
BODY=$(jq -r '.issue.body // ""' "$EVENT_PATH")
AUTHOR=$(jq -r '.issue.user.login' "$EVENT_PATH")
ROLE=$(jq -r '.issue.author_association' "$EVENT_PATH")
CREATED=$(jq -r '(.issue.created_at // "") | if . == "" then "desconocida" else .[0:10] + " " + .[11:16] + " UTC" end' "$EVENT_PATH")
URL=$(jq -r '.issue.html_url' "$EVENT_PATH")

case "$ROLE" in
  OWNER) ROLE_S='owner' ;;
  MEMBER) ROLE_S='member' ;;
  COLLABORATOR) ROLE_S='colaborador' ;;
  CONTRIBUTOR) ROLE_S='contributor' ;;
  FIRST_TIME_CONTRIBUTOR | FIRST_TIMER) ROLE_S='primera contribución' ;;
  *) ROLE_S="$ROLE" ;;
esac

TEXT="$TITLE"$'\n'"$BODY"

LABEL=""
if grep -Eqi 'bug|error|falla|crash|no funciona|se rompe|se bloquea|exploto|explota|no carga|no inicia|se congela|blanco' <<<"$TEXT"; then
  LABEL='bug'
elif grep -Eqi 'pregunta|duda|como hago|como funciona|como se|para que sirve|que es|por que|cómo' <<<"$TEXT"; then
  LABEL='question'
elif grep -Eqi 'mejora|feature|anadir|añadir|agregar|sugerencia|seria bueno|sería bueno|propongo|nueva funcion|nueva función|implementar' <<<"$TEXT"; then
  LABEL='enhancement'
elif grep -Eqi 'documentacion|documentación|docs|readme|documentar|manual|guía|guia' <<<"$TEXT"; then
  LABEL='documentation'
else
  LABEL='sin-clasificar'
fi

echo "PASO: etiquetando el issue"
if ! gh label list --json name --jq '.[].name' | grep -qx "$LABEL"; then
  case "$LABEL" in
    bug) gh label create 'bug' --color 'd73a4a' --description 'Algo no funciona como se espera' ;;
    enhancement) gh label create 'enhancement' --color 'a2eeef' --description 'Nueva funcionalidad o mejora propuesta' ;;
    question) gh label create 'question' --color 'd876e3' --description 'Más una pregunta o consulta que un reporte' ;;
    documentation) gh label create 'documentation' --color '0075ca' --description 'Tareas de documentación' ;;
    sin-clasificar) gh label create 'sin-clasificar' --color '9AA0A0' --description 'Requiere clasificación manual' ;;
  esac
fi

gh issue edit "$NUMBER" --add-label "$LABEL"

FILE_HITS=""
if grep -Eqi 'game\.js|gamejs' <<<"$TEXT"; then FILE_HITS+=$'\n'"- \`game.js\` — lógica del juego"; fi
if grep -Eqi 'index\.html' <<<"$TEXT"; then FILE_HITS+=$'\n'"- \`index.html\` — estructura de la página"; fi
if grep -Eqi 'readme' <<<"$TEXT"; then FILE_HITS+=$'\n'"- \`README.md\` — documentación del proyecto"; fi
if grep -Eqi 'agents\.md' <<<"$TEXT"; then FILE_HITS+=$'\n'"- \`AGENTS.md\` — convenciones del proyecto"; fi
if [ -z "$FILE_HITS" ]; then
  FILE_HITS=$'\n'"- No se mencionan archivos conocidos del repositorio"
fi

check() {
  if grep -Eqi "$2" <<<"$TEXT"; then
    echo "- [x] $1"
  else
    echo "- [ ] $1"
  fi
}

echo "PASO: leyendo entorno del repositorio"
DEFAULT_BRANCH=$(gh api "repos/$REPO" --jq '.default_branch')
LAST_COMMIT=$(gh api "repos/$REPO/commits/$DEFAULT_BRANCH?per_page=1" --jq '"\(.[0].sha[0:7]) :: \(.[0].commit.message | split("\n")[0])"')

echo "PASO: generando comentario"
COMMENT_FILE="$RUNNER_TEMP/issue-comment.md"
: > "$COMMENT_FILE"

{
  echo "### Resumen automático del issue #$NUMBER"
  echo
  echo "- Autor: @$AUTHOR (rol: $ROLE_S)"
  echo "- Creado: $CREATED (UTC)"
  echo "- Enlace: $URL"
  echo
  echo "#### Etiqueta aplicada"
  echo "\`$LABEL\`"
  echo
  echo "#### Áreas del repositorio mencionadas"
  printf '%s\n' "$FILE_HITS"
  echo
  echo "#### Entorno actual del repositorio"
  echo "- Rama por defecto: \`$DEFAULT_BRANCH\`"
  echo "- Último commit: \`$LAST_COMMIT\`"
  echo
  echo "#### Diagnóstico por palabras clave"
  found=0
  while IFS='|' read -r kw pat; do
    n=$(grep -oiE "$pat" <<<"$TEXT" | wc -l | tr -d ' ')
    if [ "$n" -gt 0 ]; then
      echo "- \"$kw\": $n coincidencia(s)"
      found=1
    fi
  done <<'PATCHES'
bug/error/crash|bug|error|falla|crash|no funciona|se rompe|se bloquea
mejora|mejora|anadir|añadir|agregar|sugerencia|seria bueno|sería bueno|nueva funcion|nueva función
pregunta|pregunta|duda|como hago|cómo hago|para que sirve
documentación|documentacion|documentación|docs|readme|manual
captura|captura|screenshot|pantalla|gif|video|vídeo|adjunt
consola|consola|devtools|error en la consola
versión o commit|version|versión|commit|v[0-9]+
PATCHES
  if [ "$found" -eq 0 ]; then
    echo "- No se detectaron palabras clave relevantes."
  fi
  echo
  echo "#### Checklist de completitud"
  check "Describe pasos para reproducir el problema" 'pasos para reproducir|pasos|cómo reproducir|steps to reproduce|^[[:space:]]*[0-9]+[.)-]'
  check "Indica sistema operativo" 'windows|mac|linux|sistema operativo'
  check "Indica navegador" 'chrome|firefox|edge|safari|navegador|browser'
  check "Adjunta captura, vídeo o GIF" 'captura|screenshot|pantalla|imagen|gif|video|vídeo|adjunt'
  check "Menciona errores de consola" 'consola|devtools|console'
  check "Indica versión o commit" 'version|versión|commit|v[0-9]+'
  echo
  echo "---"
  echo
  echo "> Comentario generado automáticamente para la revisión; el texto original del issue no fue modificado."
} >> "$COMMENT_FILE"

echo "PASO: publicando comentario"
gh issue comment "$NUMBER" --body-file "$COMMENT_FILE"
echo "COMPLETADO: issue #$NUMBER procesado"