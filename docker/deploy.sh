#!/usr/bin/env bash
set -euo pipefail

# ────────────────────────────────
# Funzioni di utilità
# ────────────────────────────────
usage() {
  cat <<EOF
Deploy helper

Opzioni:
  -b, --build            Esegue SOLO la build dell'immagine
  -p, --push             Esegue SOLO il push dell'immagine
  -u, --update           Esegue SOLO il rolling-update del servizio
  -i, --init-swarm       Inizializza lo Swarm (docker swarm init)
  -d, --deploy-stack     Esegue il deploy dello stack (docker stack deploy)
  -s, --services         Mostra i servizi dello stack (docker stack services)
      --scale-db <n>     Imposta repliche del servizio database
      --scale-wa <n>     Imposta repliche del servizio webapp
  -z, --reset            Rimuove stack / container / volumi (reset completo)
  -r, --repo <owner>     Namespace/owner del repository Docker (default: lmaggiolo16)
  -h, --help             Mostra questo help
EOF
  exit 0
}

# ────────────────────────────────
# Parsing argomenti
# ────────────────────────────────
DO_RESET=0
DO_LOGIN=0
DO_BUILD=0
DO_PUSH=0
DO_UPDATE=0
DO_INIT_SWARM=0
DO_DEPLOY_STACK=0
DO_LIST_SERVICES=0
DO_SCALE_DB=0
DO_SCALE_WEBAPP=0

SCALE_WEBAPP_REPLICAS=""
SCALE_DB_REPLICAS=""

DEFAULT_REPO_OWNER="lmaggiolo16"
REPO_OWNER="${DOCKER_REPO:-$DEFAULT_REPO_OWNER}"

if [[ $# -eq 0 ]]; then
  DO_LOGIN=1
  DO_BUILD=1
  DO_PUSH=1
  DO_UPDATE=1
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    -b|--build)         DO_BUILD=1 ;;
    -p|--push)          DO_PUSH=1 ;;
    -u|--update)        DO_UPDATE=1 ;;
    -i|--init-swarm)    DO_INIT_SWARM=1 ;;
    -d|--deploy-stack)  DO_DEPLOY_STACK=1 ;;
    -s|--services)      DO_LIST_SERVICES=1 ;;
    --scale-db)
      shift
      [[ $# -eq 0 ]] && { echo "❌  --scale-db richiede un argomento"; exit 1; }
      SCALE_DB_REPLICAS="$1"
      DO_SCALE_DB=1
      ;;
    --scale-wa)
      shift
      [[ $# -eq 0 ]] && { echo "❌  --scale-wa richiede un argomento"; exit 1; }
      SCALE_WEBAPP_REPLICAS="$1"
      DO_SCALE_WEBAPP=1
      ;;
    -z|--reset)         DO_RESET=1 ;;
    -r|--repo)
      shift
      [[ $# -eq 0 ]] && { echo "❌  --repo richiede un argomento"; exit 1; }
      REPO_OWNER="$1"
      ;;
    -h|--help)          usage ;;
    *) echo "❌  Opzione sconosciuta: $1"; usage ;;
  esac
  shift
done

# ────────────────────────────────
# Individua la root del progetto
# ────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# ────────────────────────────────
# Ricava nome / versione da package.json
# ────────────────────────────────
PACKAGE_JSON="$PROJECT_ROOT/package.json"
[[ ! -f "$PACKAGE_JSON" ]] && { echo "❌  package.json non trovato"; exit 1; }

IMAGE_VERSION="$(grep -oP '"version"\s*:\s*"\K[0-9]+\.[0-9]+\.[0-9]+' "$PACKAGE_JSON")"
STACK_NAME="$(grep -oP '"name"\s*:\s*"\K[^"]+' "$PACKAGE_JSON")"

[[ -z "$IMAGE_VERSION" ]] && { echo "❌  campo 'version' mancante"; exit 1; }
[[ -z "$STACK_NAME"   ]] && { echo "❌  campo 'name' mancante";    exit 1; }

# ────────────────────────────────
# Costanti
# ────────────────────────────────
IMAGE_NAME="${REPO_OWNER}/${STACK_NAME}"
SERVICE_WEBAPP="${STACK_NAME}_webapp"
SERVICE_DATABASE="${STACK_NAME}_database"
TAG="${IMAGE_NAME}:${IMAGE_VERSION}"
COMPOSE_FILE="docker/docker-compose.yml"

# ────────────────────────────────
# Funzione: controlla se un servizio esiste
# ────────────────────────────────
service_exists() {
  docker service ls --filter "name=$1" --format '{{.Name}}' | grep -qx "$1"
}

# ────────────────────────────────
# Funzione: controlla se le repliche attive coincidono con le desiderate
# ────────────────────────────────
service_healthy() {
  local replicas current desired
  replicas="$(docker service ls --filter "name=$1" --format '{{.Replicas}}' | head -n1)"
  IFS='/' read -r current desired <<< "$replicas"
  [[ -n "$current" && -n "$desired" && "$current" == "$desired" ]]
}

echo "ℹ️  Versione pacchetto : $IMAGE_VERSION"
echo "ℹ️  Stack              : $STACK_NAME"
echo "ℹ️  Servizio WEBAPP    : $SERVICE_WEBAPP"
echo "ℹ️  Servizio DATABASE  : $SERVICE_DATABASE"
echo "ℹ️  Repository Docker  : $IMAGE_NAME"
echo "ℹ️  Tag Docker         : $TAG"
echo

# ────────────────────────────────
# Step 0: RESET completo (opzionale)
# ────────────────────────────────
if [[ $DO_RESET -eq 1 ]]; then
  echo "▶︎  Reset completo dello stack ${STACK_NAME}"
  docker stack rm "$STACK_NAME" || true
  echo "⏳  Attendo rimozione servizi..."
  sleep 5

  echo "▶︎  Pulisco container, network, volumi e immagini usate dal compose"
  # 1) Rimuovo i container dello stack
  docker ps -aq --filter "name=${STACK_NAME}_" | xargs -r docker rm -fv

  # 2) Rimuovo le network dello stack
  docker network ls --filter "name=${STACK_NAME}_" -q | xargs -r docker network rm

  # 3) Rimuovo i volumi definiti nel compose file
  volumes=$(grep -E '^[[:space:]]+- [^:]+:' "$COMPOSE_FILE" \
            | sed -E 's/^[[:space:]]+- ([^:]+):.*/\1/')
  [[ -n "$volumes" ]] && echo "$volumes" | xargs -r docker volume rm -f

  # 4) Rimuovo le immagini dichiarate nel compose file
  images=$(grep -E '^[[:space:]]+image:' "$COMPOSE_FILE" \
           | awk '{print $2}')
  [[ -n "$images" ]] && echo "$images" | xargs -r docker rmi -f

  echo "✅  Reset completato"
fi

# ────────────────────────────────
# Step 1: Swarm init (opzionale)
# ────────────────────────────────
echo
if [[ $DO_INIT_SWARM -eq 1 ]]; then
  echo "▶︎  Inizializzazione Docker Swarm (se necessario)"
  if [[ "$(docker info --format '{{.Swarm.LocalNodeState}}')" != "active" ]]; then
    docker swarm init
  else
    echo "ℹ️  Swarm già inizializzato"
  fi
else
  echo "⏭️  Swarm init saltato"
fi

# ────────────────────────────────
# Step 2: Build
# ────────────────────────────────
echo
if [[ $DO_BUILD -eq 1 ]]; then
  echo "▶︎  Build immagine ${TAG}"
  docker build -t "$TAG" .
else
  echo "⏭️  Build saltata"
fi

# ────────────────────────────────
# Step 3: Login
# ────────────────────────────────
echo
if [[ $DO_LOGIN -eq 1 ]]; then
  echo "▶︎  Login su registry"
  docker login
else
  echo "⏭️  Login su registry saltato"
fi

# ────────────────────────────────
# Step 4: Push
# ────────────────────────────────
echo
if [[ $DO_PUSH -eq 1 ]]; then
  echo "▶︎  Push immagine ${TAG} su registry"
  if ! docker push "$TAG"; then
    echo "❌  Push fallito: assicurati di essere loggato ed avere permessi su ${IMAGE_NAME}"
    exit 1
  fi
else
  echo "⏭️  Push saltato"
fi

# ────────────────────────────────
# Step 5: Verifica DATABASE + update / deploy WEBAPP
# ────────────────────────────────
echo
if [[ $DO_UPDATE -eq 1 ]]; then
  # 5.1 DATABASE
  if service_exists "$SERVICE_DATABASE"; then
    if service_healthy "$SERVICE_DATABASE"; then
      echo "ℹ️  Servizio database già presente e attivo"
    else
      replicas_now="$(docker service ls --filter "name=$SERVICE_DATABASE" --format '{{.Replicas}}')"
      echo "⚠️   Servizio database presente ma repliche non attive (${replicas_now})"
      echo "▶︎   Provo un riavvio forzato del servizio ${SERVICE_DATABASE}"
      docker service update --force "$SERVICE_DATABASE"
      echo -n "⏳  Attendo che il database diventi operativo "
      for i in {1..10}; do
        sleep 3
        if service_healthy "$SERVICE_DATABASE"; then
          echo "✅"
          break
        fi
        echo -n "."
      done
      if ! service_healthy "$SERVICE_DATABASE"; then
        echo
        echo "⚠️   Il riavvio mirato è fallito, eseguo il redeploy completo dello stack"
        docker stack deploy -c "$COMPOSE_FILE" --with-registry-auth "$STACK_NAME"
      fi
    fi
  else
    echo "⚠️  Database mancante: deploy completo dello stack"
    docker stack deploy -c "$COMPOSE_FILE" --with-registry-auth "$STACK_NAME"
  fi

  # 5.2 WEBAPP
  if service_exists "$SERVICE_WEBAPP"; then
    echo "▶︎  Aggiornamento del servizio ${SERVICE_WEBAPP}"
    docker service update \
      --image "$TAG" \
      --with-registry-auth \
      --force \
      "$SERVICE_WEBAPP"

    echo "🧹  Pulizia container terminati (${SERVICE_WEBAPP})"
    docker service ps "$SERVICE_WEBAPP" --no-trunc \
      --filter "desired-state=shutdown" --format '{{.ID}}' \
    | xargs -r docker inspect --format '{{.Status.ContainerStatus.ContainerID}}' \
    | xargs -r docker rm -v
  else
    echo "⚠️  Servizio webapp assente: deploy completo dello stack"
    docker stack deploy -c "$COMPOSE_FILE" --with-registry-auth "$STACK_NAME"
  fi
else
  echo "⏭️  Rolling-update saltato"
fi

# ────────────────────────────────
# Step 5.b: Scale manuale dei servizi
# ────────────────────────────────
if [[ $DO_SCALE_DB -eq 1 ]]; then
  echo
  echo "▶︎  Scale ${SERVICE_DATABASE} → ${SCALE_DB_REPLICAS} repliche"
  if service_exists "$SERVICE_DATABASE"; then
    docker service scale "${SERVICE_DATABASE}=${SCALE_DB_REPLICAS}"
  else
    echo "⚠️   Servizio ${SERVICE_DATABASE} non esistente, scale ignorato"
  fi
fi

if [[ $DO_SCALE_WEBAPP -eq 1 ]]; then
  echo
  echo "▶︎  Scale ${SERVICE_WEBAPP} → ${SCALE_WEBAPP_REPLICAS} repliche"
  if service_exists "$SERVICE_WEBAPP"; then
    docker service scale "${SERVICE_WEBAPP}=${SCALE_WEBAPP_REPLICAS}"
  else
    echo "⚠️   Servizio ${SERVICE_WEBAPP} non esistente, scale ignorato"
  fi
fi

# ────────────────────────────────
# Step 6: Stack deploy (opzionale)
# ────────────────────────────────
echo
if [[ $DO_DEPLOY_STACK -eq 1 ]]; then
  echo "▶︎  Deploy dello stack ${STACK_NAME}"
  docker stack deploy -c "$COMPOSE_FILE" --with-registry-auth "$STACK_NAME"
else
  echo "⏭️  Stack deploy saltato"
fi

# ────────────────────────────────
# Step 7: Lista servizi (opzionale)
# ────────────────────────────────
echo
if [[ $DO_LIST_SERVICES -eq 1 ]]; then
  echo "▶︎  Servizi nello stack ${STACK_NAME}"
  docker stack services "$STACK_NAME"
else
  echo "⏭️  Lista servizi saltata"
fi

echo
echo "✅  Operazione completata"
