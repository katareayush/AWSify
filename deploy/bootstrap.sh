#!/usr/bin/env bash
# Provision a fresh Ubuntu 24.04 EC2 box to run awsify via Docker Compose.
# Usage (run as the ubuntu user, or via cloud-init UserData):
#   curl -fsSL https://raw.githubusercontent.com/<owner>/<repo>/main/deploy/bootstrap.sh | bash
# Or scp this file and: bash bootstrap.sh
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/katareayush/awsify.git}"
BRANCH="${BRANCH:-main}"
APP_DIR="${APP_DIR:-/opt/awsify}"

log() { printf "\033[1;32m[bootstrap]\033[0m %s\n" "$*"; }

log "Updating apt and installing base packages..."
sudo apt-get update -y
sudo apt-get install -y --no-install-recommends \
  ca-certificates curl gnupg git ufw fail2ban

log "Installing Docker Engine + Compose plugin..."
if ! command -v docker >/dev/null 2>&1; then
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $VERSION_CODENAME stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
sudo usermod -aG docker "$USER" || true

log "Configuring firewall (22, 80, 443)..."
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

log "Cloning awsify into ${APP_DIR}..."
sudo mkdir -p "$APP_DIR"
sudo chown "$USER:$USER" "$APP_DIR"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
else
  git -C "$APP_DIR" fetch --depth=1 origin "$BRANCH"
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
fi

log "Seeding deploy/.env from .env.example (if not present)..."
if [ ! -f "$APP_DIR/deploy/.env" ]; then
  cp "$APP_DIR/deploy/.env.example" "$APP_DIR/deploy/.env"
  chmod 600 "$APP_DIR/deploy/.env"
  echo
  echo ">>> Edit $APP_DIR/deploy/.env and fill in the secrets before running 'docker compose up'."
fi

cat <<'NEXT'

Bootstrap done. Next steps (run as ubuntu, you may need to re-login for docker group):

  1. nano /opt/awsify/deploy/.env      # fill in secrets
  2. cd /opt/awsify/deploy
  3. # First run: migrate the database (uses Neon DIRECT url, not pooler)
  4. docker compose run --rm --entrypoint sh api -c "pnpm --filter @awsify/database prisma migrate deploy"
  5. docker compose up -d --build
  6. docker compose logs -f

Update flow later:
  cd /opt/awsify && git pull
  cd deploy && docker compose up -d --build

NEXT
