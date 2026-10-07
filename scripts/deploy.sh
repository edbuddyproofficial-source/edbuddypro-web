#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
#  edBuddy Pro — deploy.sh
#
#      ./scripts/deploy.sh "What changed"
#
#  Git is the only way to production: this script checks, uploads any
#  new images to Cloudflare, commits, and pushes. Vercel builds from
#  GitHub.
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

# 4. confirm + push
if [ -z "$(git rev-list "origin/${branch}..HEAD" 2>/dev/null || echo new)" ]; then
  printf "\n  Nothing new to push. GitHub already has %s.\n\n" "$(git rev-parse --short HEAD)"; exit 0
fi

if [ "$branch" = "main" ]; then
  printf "\n  ${YEL}${BLD}This goes live on https://%s${NC}\n" "$DOMAIN"
  read -r -p "  Type  deploy  to continue: " c
  [ "$c" = "deploy" ] || die "Aborted. Nothing pushed."
else
  printf "\n  Branch ${BLD}%s${NC} → Vercel preview URL. Production untouched.\n" "$branch"
  read -r -p "  Continue? (y/N) " c
  [ "$c" = "y" ] || [ "$c" = "Y" ] || die "Aborted. Nothing pushed."
fi

step "Pushing to GitHub"
git push -u origin "$branch"

printf "\n${GRN}${BLD}✓ Pushed. Vercel is building (about a minute).${NC}\n"
printf "  ${DIM}https://vercel.com/dashboard → %s → Deployments${NC}\n" "$VERCEL_PROJECT"
[ "$branch" = "main" ] && printf "  ${DIM}Rollback: Deployments → previous build → Instant Rollback${NC}\n"
printf "\n"
