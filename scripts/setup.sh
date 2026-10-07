#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
#  edBuddy Pro — setup.sh   (once, on this Mac)
#
#      ./scripts/setup.sh
#
#  1. GitHub     push this repo to edbuddyproofficial-source/edbuddypro-web
#  2. Cloudflare log in (browser), create the R2 bucket, connect cdn.edbuddypro.com, upload images
#  3. Vercel     log in (edbuddy account only), link the project, set CDN_URL,
#                connect GitHub, turn on analytics, add the domains
#  4. First production deploy
#
#  Safe to re-run: every step skips what already exists.
# ═══════════════════════════════════════════════════════════
source "$(dirname "$0")/lib.sh"
need git  "Install Xcode command line tools: xcode-select --install"
need node "Install Node 18+ from nodejs.org"
printf "\n${BLD}edBuddy Pro: one-time setup${NC}\n"

# ── 1. GitHub ───────────────────────────────────────────────
step "1/4  GitHub → ${GH_REPO}"
git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/${GH_REPO}.git"
if ! git ls-remote origin >/dev/null 2>&1; then
  die "This Mac can't reach ${GH_REPO}.
     Either sign in to GitHub as an account with access (gh auth login),
     or invite your usual GitHub account as a collaborator on the repo
     (Settings → Collaborators), accept the invite, and run this again."
fi
git push -u origin main
ok "code is on GitHub"

# ── 2. Cloudflare R2 ────────────────────────────────────────
step "2/4  Cloudflare R2 → ${R2_BUCKET} on ${CDN_HOST}"
need_cloudflare
who="$(wr whoami 2>/dev/null | grep -Eo '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+' | head -1 || true)"
[ -n "${CLOUDFLARE_API_TOKEN:-}" ] && who="API token from .env.local"
ok "Cloudflare: ${who:-logged in}"
read -r -p "  Is that the edbuddy Cloudflare account? (y/N) " c
[ "$c" = "y" ] || [ "$c" = "Y" ] || die "Run  XDG_CONFIG_HOME=~/.edbuddy-cli npx wrangler logout  and then this script again."
if wr r2 bucket list 2>/dev/null | grep -Eq "name:[[:space:]]+${R2_BUCKET}\$"; then ok "bucket exists"
else wr r2 bucket create "$R2_BUCKET" >/dev/null && ok "bucket created"; fi

if [ -n "${CF_ZONE_ID:-}" ] && wr r2 bucket domain add "$R2_BUCKET" --domain "$CDN_HOST" --zone-id "$CF_ZONE_ID" --min-tls 1.2 --force >/dev/null 2>&1; then
  ok "${CDN_HOST} connected"
elif curl -fsI "${CDN_URL}/" >/dev/null 2>&1 || wr r2 bucket domain list "$R2_BUCKET" 2>/dev/null | grep -q "$CDN_HOST"; then
  ok "${CDN_HOST} already connected"
else
  warn "Connect the domain in the dashboard (30 seconds):"
  printf "      Cloudflare → R2 → %s → Settings → Custom Domains → Add → %s\n" "$R2_BUCKET" "$CDN_HOST"
  read -r -p "      Press Enter once it shows Active… " _
fi
node scripts/upload-assets.mjs

# ── 3. Vercel ───────────────────────────────────────────────
step "3/4  Vercel → ${VERCEL_PROJECT}"
if ! vc whoami >/dev/null 2>&1; then
  printf "  Log in with the ${BLD}edbuddy${NC} Vercel account (your other Vercel login is untouched).\n"
  vc login
fi
ok "Vercel account: $(vc whoami 2>/dev/null | tail -1)"
read -r -p "  Is that the edbuddy account? (y/N) " c
[ "$c" = "y" ] || [ "$c" = "Y" ] || die "Run  vercel --global-config ~/.vercel-edbuddy logout  and then this script again."

vc project ls 2>/dev/null | grep -qw "$VERCEL_PROJECT" \
  || vc project create "$VERCEL_PROJECT" >/dev/null 2>&1 || vc project add "$VERCEL_PROJECT" >/dev/null 2>&1 || true
vc link --yes --project "$VERCEL_PROJECT" >/dev/null 2>&1 || {
  printf "  Answer: set up → y, scope → the edbuddy account, link to existing → y, name → %s\n" "$VERCEL_PROJECT"
  vc link; }
ok "linked to project ${VERCEL_PROJECT}"
vc env add CDN_URL production --value "$CDN_URL" --no-sensitive --force >/dev/null 2>&1 \
  || printf '%s' "$CDN_URL" | vc env add CDN_URL production >/dev/null 2>&1 || true
ok "CDN_URL = ${CDN_URL}"

if vc git connect --yes >/dev/null 2>&1; then ok "GitHub connected: every push to main deploys"
else
  warn "Connect GitHub in the dashboard:"
  printf "      Vercel → %s → Settings → Git → Connect → %s\n" "$VERCEL_PROJECT" "$GH_REPO"
  printf "      (if the repo isn't listed: Adjust GitHub App Permissions → give Vercel access to it)\n"
  read -r -p "      Press Enter once connected… " _
fi
vc project web-analytics enable "$VERCEL_PROJECT" >/dev/null 2>&1 && ok "Web Analytics on" || warn "turn on Web Analytics in the dashboard"
vc project speed-insights enable "$VERCEL_PROJECT" >/dev/null 2>&1 && ok "Speed Insights on" || warn "turn on Speed Insights in the dashboard"
vc domains add "$DOMAIN" "$VERCEL_PROJECT" >/dev/null 2>&1 || true
vc domains add "www.${DOMAIN}" "$VERCEL_PROJECT" >/dev/null 2>&1 || true
ok "domains added: ${DOMAIN}, www.${DOMAIN}"

# ── 4. First deploy ─────────────────────────────────────────
step "4/4  First production deploy"
vc deploy --prod --yes

cat <<EOF

${GRN}${BLD}✓ Setup done.${NC}

  ${BLD}Last step, in Cloudflare → ${DOMAIN} → DNS → Records${NC}
  Add the two records Vercel shows in Project → Settings → Domains, usually:
      A      @     76.76.21.21
      CNAME  www   cname.vercel-dns.com
  Set both to ${BLD}DNS only${NC} (grey cloud) so Vercel can issue the SSL certificate.
  Then in Vercel → Settings → Domains, set www.${DOMAIN} to redirect to ${DOMAIN}.

  From now on:  ${BLD}./scripts/deploy.sh "What changed"${NC}

EOF
