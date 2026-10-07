# Shared helpers for setup.sh, check.sh and deploy.sh. Not run directly.
#
# Logins are kept separate from any other project on this Mac (e.g. Wisherly):
#   · Vercel     browser login stored in ~/.vercel-edbuddy
#   · Cloudflare browser login stored in ~/.edbuddy-cli/.wrangler
# so logging in here never logs another project out, and vice versa.

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
# Wrangler keeps its login under $XDG_CONFIG_HOME/.wrangler; this gives edBuddy its own
export XDG_CONFIG_HOME="${EBP_CLI_HOME:-$HOME/.edbuddy-cli}"

if [ -t 1 ]; then
  GRN=$'\033[32m'; YEL=$'\033[33m'; RED=$'\033[31m'; BLU=$'\033[1;34m'; DIM=$'\033[2m'; BLD=$'\033[1m'; NC=$'\033[0m'
else
  GRN=; YEL=; RED=; BLU=; DIM=; BLD=; NC=
fi
step() { printf "\n${BLU}▸ %s${NC}\n" "$*"; }
ok()   { printf "  ${GRN}✓${NC} %s\n" "$*"; }
warn() { printf "  ${YEL}!${NC} %s\n" "$*"; }
die()  { printf "\n  ${RED}✗ %s${NC}\n\n" "$*" >&2; exit 1; }

# optional .env.local (only needed if you prefer an API token to the browser login)
if [ -f .env.local ]; then set -a; . ./.env.local; set +a; fi

need() { command -v "$1" >/dev/null 2>&1 || die "$1 is not installed. $2"; }

# Vercel CLI, always against the edbuddy login
vc() {
  if command -v vercel >/dev/null 2>&1; then vercel --global-config "$VERCEL_CFG" "$@"
  else npx --yes vercel --global-config "$VERCEL_CFG" "$@"; fi
}

# Wrangler (Cloudflare CLI), always against the edbuddy login
wr() { npx --yes wrangler@4 "$@"; }

# Make sure we're logged in to Cloudflare as edbuddy (browser login, like Wisherly)
need_cloudflare() {
  if [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then return 0; fi           # token in .env.local wins
  if wr whoami --json >/dev/null 2>&1; then return 0; fi
  printf "\n  ${BLD}Cloudflare login${NC}: a link opens in your browser. If it opens in the wrong\n"
  printf "  Chrome profile, copy the link from below into the ${BLD}edbuddy${NC} profile and click Allow.\n\n"
  wr login || die "Cloudflare login didn't complete. Run the script again."
}
