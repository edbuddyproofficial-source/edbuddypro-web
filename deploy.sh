#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  edBuddy Pro — deploy
#
#  First time (creates the GitHub repo, R2 bucket + cdn domain, Vercel
#  project + domains, then ships to production):
#
#      GH_OWNER=<github-user-or-org> CF_ZONE_ID=<zone-id> ./deploy.sh setup
#
#  Every release after that (uploads any new images, then pushes; Vercel
#  builds and deploys main automatically):
#
#      ./deploy.sh
#
#  Other:  ./deploy.sh assets   upload images to R2 only
#          ./deploy.sh prod     deploy straight to production from this machine
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")"

REPO="edbuddypro-web"
BUCKET="${R2_BUCKET:-edbuddypro-assets}"
DOMAIN="edbuddypro.com"
CDN_HOST="cdn.edbuddypro.com"
CDN_URL="https://${CDN_HOST}"

say()  { printf '\n\033[1;34m▸ %s\033[0m\n' "$*"; }
need() { command -v "$1" >/dev/null 2>&1 || { echo "✗ $1 is not installed. $2"; exit 1; }; }

check_build() {
  say "Building with images on ${CDN_URL}"
  CDN_URL="$CDN_URL" node scripts/build.mjs
}

case "${1:-release}" in

setup)
  : "${GH_OWNER:?Set GH_OWNER to the GitHub account that should own the repo (the edbuddy account)}"
  : "${CF_ZONE_ID:?Set CF_ZONE_ID (Cloudflare dashboard → edbuddypro.com → Overview → API → Zone ID)}"
  need node "Install Node 18+ from nodejs.org"
  need git  "Install git"
  need gh   "Install the GitHub CLI: https://cli.github.com"

  say "1/6  GitHub: sign in and create ${GH_OWNER}/${REPO} (private)"
  gh auth status >/dev/null 2>&1 || gh auth login
  if ! git rev-parse --git-dir >/dev/null 2>&1; then git init -b main; fi
  git add -A
  git commit -m "edBuddy Pro site" >/dev/null 2>&1 || true
  if git remote get-url origin >/dev/null 2>&1; then
    git push -u origin main
  else
    gh repo create "${GH_OWNER}/${REPO}" --private --source=. --remote=origin --push
  fi

  say "2/6  Cloudflare: sign in, create the R2 bucket, attach ${CDN_HOST}"
  npx --yes wrangler login
  npx --yes wrangler r2 bucket create "$BUCKET" || echo "  (bucket already exists)"
  npx --yes wrangler r2 bucket domain add "$BUCKET" --domain "$CDN_HOST" --zone-id "$CF_ZONE_ID" --min-tls 1.2 --force \
    || echo "  (domain already attached, or add it in R2 → ${BUCKET} → Settings → Custom Domains)"

  say "3/6  Upload images to R2"
  node scripts/upload-assets.mjs
  check_build

  say "4/6  Vercel: sign in, create + link the project, turn on analytics"
  npx --yes vercel login
  npx --yes vercel project create "$REPO" || echo "  (project already exists)"
  npx --yes vercel link --yes --project "$REPO"
  npx --yes vercel env add CDN_URL production --value "$CDN_URL" --no-sensitive --force
  npx --yes vercel git connect --yes || echo "  (connect the repo in Vercel → Project → Settings → Git if this step fails)"
  npx --yes vercel project web-analytics enable "$REPO" || echo "  (enable Web Analytics in the Vercel dashboard)"
  npx --yes vercel project speed-insights enable "$REPO" || echo "  (enable Speed Insights in the Vercel dashboard)"

  say "5/6  Vercel: add ${DOMAIN} and www.${DOMAIN}"
  npx --yes vercel domains add "$DOMAIN" "$REPO" || true
  npx --yes vercel domains add "www.${DOMAIN}" "$REPO" || true

  say "6/6  First production deploy"
  npx --yes vercel deploy --prod --yes

  cat <<EOF

✓ Done. Last step, in Cloudflare → ${DOMAIN} → DNS → Records:
  add the two records Vercel printed above (or shows in Project → Settings → Domains),
  usually  A @ 76.76.21.21  and  CNAME www cname.vercel-dns.com.
  Set both to "DNS only" (grey cloud) so Vercel can issue the SSL certificate.
  Then in Vercel → Settings → Domains, set www.${DOMAIN} to redirect to ${DOMAIN}.
  ${CDN_HOST} was created by Cloudflare when the bucket domain was attached.
EOF
  ;;

assets)
  node scripts/upload-assets.mjs
  ;;

prod)
  node scripts/upload-assets.mjs
  check_build
  npx --yes vercel deploy --prod --yes
  ;;

release)
  node scripts/upload-assets.mjs
  check_build
  say "Pushing to GitHub; Vercel deploys main to ${DOMAIN}"
  git add -A
  git commit -m "${MSG:-Site update}" || echo "  (nothing new to commit)"
  git push
  ;;

*)
  echo "Usage: ./deploy.sh [setup|release|assets|prod]"; exit 1 ;;
esac
