#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
#  edBuddy Pro — deploy.sh
#
#      ./scripts/deploy.sh "What changed"
#
#  Checks, uploads any new images to Cloudflare, commits, pushes to
#  GitHub (the record of every release), then deploys with the Vercel
#  CLI as the edbuddy account. Deploying from the CLI means it never
#  depends on Vercel's Git hook (the Hobby plan blocks Git deploys when
#  the commit author isn't the Vercel account owner).
#    · on main      → asks you to type  deploy  → edbuddypro.com
#    · other branch → asks y           → a Vercel preview URL only
# ═══════════════════════════════════════════════════════════
source "$(dirname "$0")/lib.sh"
MSG="${1:-}"

printf "\n${BLD}edBuddy Pro: deploy${NC}\n"

# 1. pre-flight
"$ROOT/scripts/check.sh" || die "Pre-flight failed. Nothing was deployed."

branch="$(git rev-parse --abbrev-ref HEAD)"

# 2. new images go to the CDN before the site that references them
step "Uploading new images to Cloudflare R2"
need_cloudflare
node scripts/upload-assets.mjs

# 3. commit
if [ -n "$(git status --short)" ]; then
  step "Changes to commit"
  git status --short | sed 's/^/  /'
  [ -n "$MSG" ] || read -r -p "  Commit message: " MSG
  [ -n "$MSG" ] || MSG="Site update"
  read -r -p "  Commit these as \"${MSG}\"? (y/N) " c
  [ "$c" = "y" ] || [ "$c" = "Y" ] || die "Aborted. Nothing committed or deployed."
  git add -A
  git commit -q -m "$MSG"
  ok "committed $(git rev-parse --short HEAD)"
fi

# 4. confirm
if [ "$branch" = "main" ]; then
  printf "\n  ${YEL}${BLD}This goes live on https://%s${NC}  (commit %s)\n" "$DOMAIN" "$(git rev-parse --short HEAD)"
  read -r -p "  Type  deploy  to continue: " c
  [ "$c" = "deploy" ] || die "Aborted. Nothing pushed or deployed."
else
  printf "\n  Branch ${BLD}%s${NC} → Vercel preview URL. Production untouched.\n" "$branch"
  read -r -p "  Continue? (y/N) " c
  [ "$c" = "y" ] || [ "$c" = "Y" ] || die "Aborted. Nothing pushed or deployed."
fi

# 5. push to GitHub (history)
if [ -n "$(git rev-list "origin/${branch}..HEAD" 2>/dev/null || echo new)" ]; then
  step "Pushing to GitHub"
  git push -u origin "$branch"
else
  ok "GitHub already has $(git rev-parse --short HEAD)"
fi

# 6. deploy with the Vercel CLI (edbuddy login only)
step "Deploying to Vercel"
vc whoami >/dev/null 2>&1 || { printf "  Log in with the ${BLD}edbuddy${NC} Vercel account.\n"; vc login; }
[ -f .vercel/project.json ] || vc link --yes --project "$VERCEL_PROJECT" >/dev/null
if [ "$branch" = "main" ]; then
  vc deploy --prod --yes
  printf "\n${GRN}${BLD}✓ Live on https://%s${NC}  (hard-refresh with ⌘ Shift R)\n" "$DOMAIN"
  printf "  ${DIM}Rollback: Vercel → %s → Deployments → previous build → Instant Rollback${NC}\n\n" "$VERCEL_PROJECT"
else
  vc deploy --yes
  printf "\n${GRN}${BLD}✓ Preview ready${NC} (URL above). Production untouched.\n\n"
fi
