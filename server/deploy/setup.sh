#!/usr/bin/env bash
# One-shot bootstrap for a fresh Ubuntu 22.04 LTS VPS (Hetzner/DO/Linode/Fly.io).
# Installs Docker + Docker Compose v2, pulls the repo, and brings the stack up.
# Re-runs are idempotent.

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/your-org/SkySync.git}"
INSTALL_DIR="${INSTALL_DIR:-/opt/skysync}"

log() { echo -e "\033[36m[setup]\033[0m $*"; }

log "Updating apt and installing baseline packages"
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg git ufw

if ! command -v docker >/dev/null 2>&1; then
    log "Installing Docker Engine + Compose plugin"
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
        | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    sudo systemctl enable --now docker
fi

log "Opening firewall ports (80/443 TCP, 7881 TCP, 7882 UDP, 50000-60000 UDP)"
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 7881/tcp
sudo ufw allow 7882/udp
sudo ufw allow 50000:60000/udp
sudo ufw --force enable

if [ ! -d "${INSTALL_DIR}" ]; then
    log "Cloning SkySync repo to ${INSTALL_DIR}"
    sudo git clone "${REPO_URL}" "${INSTALL_DIR}"
fi

cd "${INSTALL_DIR}/SkySync/server"
if [ ! -f .env ]; then
    log "Creating .env from template — FILL IN VALUES BEFORE RUNNING UP"
    sudo cp .env.example .env
    log "Edit ${INSTALL_DIR}/SkySync/server/.env then run: sudo docker compose up -d"
    exit 0
fi

log "Starting LiveKit stack"
sudo docker compose pull
sudo docker compose up -d
log "Done. Tail logs with: sudo docker compose logs -f"
