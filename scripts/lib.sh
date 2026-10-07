# Shared helpers for setup.sh, check.sh and deploy.sh. Not run directly.
#
# Accounts are kept separate from any other project on this Mac:
#   · Vercel  logs in to its own config folder (~/.vercel-edbuddy), so the
#             edbuddy login never replaces another project's login.
#   · Cloudflare uses the API token in .env.local (never committed), so it
#             never touches `wrangler login`.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

GH_REPO="edbuddyproofficial-source/edbuddypro-web"
VERCEL_PROJECT="edbuddypro-web"
R2_BUCKET="${R2_BUCKET:-edbuddypro-assets}"
DOMAIN="edbuddypro.com"
CDN_HOST="cdn.edbuddypro.com"
CDN_URL="https://${CDN_HOST}"
VERCEL_CFG="${VERCEL_CFG:-$HOME/.vercel-edbuddy}"

if [ -t 1 ]; then
  GRN=$'\033[32m'; YEL=$'\033[33m'; RED=$'\033[31m'; BLU=$'\033[1;34m'; DIM=$'\033[2m'; BLD=$'\033[1m'; NC=$'\033[0m'
else
  GRN=; YEL=; RED=; BLU=; DIM=; BLD=; NC=
fi
step() { printf "\n${BLU}▸ %s${NC}\n" "$*"; }
ok()   { printf "  ${GRN}✓${NC} %s\n" "$*"; }
warn() { printf "  ${YEL}!${NC} %s\n" "$*"; }
die()  { printf "\n  ${RED}✗ %s${NC}\n\n" "$*" >&2; exit 1; }

# load .env.local (Cloudflare token etc.) if present
if [ -f .env.local ]; then set -a; . ./.env.local; set +a; fi

need() { command -v "$1" >/dev/null 2>&1 || die "$1 is not installed. $2"; }

# Vercel CLI, always against the edbuddy login
vc() {
  if command -v vercel >/dev/null 2>&1; then vercel --global-config "$VERCEL_CFG" "$@"
  else npx --yes vercel --global-config "$VERCEL_CFG" "$@"; fi
}

# Wrangler (Cloudflare CLI), authenticated by CLOUDFLARE_API_TOKEN from .env.local
wr() { npx --yes wrangler@4 "$@"; }

need_cloudflare() {
  [ -n "${CLOUDFLARE_API_TOKEN:-}" ] && [ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ] && return 0
  die "Cloudflare token missing. Copy .env.example to .env.local and fill it in (see README → First-time setup)."
}
