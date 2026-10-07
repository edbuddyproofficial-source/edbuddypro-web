#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
#  edBuddy Pro — check.sh   (read-only, run any time)
#
#      ./scripts/check.sh
#
#  Git sync, secrets scan, JS syntax, then a production build that
#  fails on any broken link, missing image, #anchor or alt text.
#  deploy.sh runs this first and stops if it fails.
# ═══════════════════════════════════════════════════════════
source "$(dirname "$0")/lib.sh"
need git  "Install Xcode command line tools: xcode-select --install"
need node "Install Node 18+ from nodejs.org"

FAIL=0

step "Git"
branch="$(git rev-parse --abbrev-ref HEAD)"
ok "branch: ${BLD}${branch}${NC}"
if git remote get-url origin >/dev/null 2>&1; then
  if git fetch -q origin 2>/dev/null; then
    if git rev-parse -q --verify "origin/${branch}" >/dev/null; then
      behind="$(git rev-list --count "HEAD..origin/${branch}")"
      ahead="$(git rev-list --count "origin/${branch}..HEAD")"
      [ "$behind" -gt 0 ] && { printf "  ${RED}✗${NC} %s commit(s) behind origin/%s: run  git pull\n" "$behind" "$branch"; FAIL=1; } \
                          || ok "up to date with origin (${ahead} to push)"
    else
      ok "origin/${branch} doesn't exist yet (first push)"
    fi
  else
    warn "couldn't reach GitHub (offline, or no access to ${GH_REPO})"
  fi
else
  warn "no origin remote: run ./scripts/setup.sh"
fi
changed="$(git status --short | wc -l | tr -d ' ')"
[ "$changed" = "0" ] && ok "working tree clean" || warn "${changed} file(s) changed, not yet committed"

step "Secrets"
hits="$(git ls-files -co --exclude-standard | grep -vE '^(\.env\.example|scripts/check\.sh|README\.md)$' \
  | xargs grep -nIE 'rzp_(live|test)_[A-Za-z0-9]{8,}|sk_(live|test)_[A-Za-z0-9]{10,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY|CLOUDFLARE_API_TOKEN=[A-Za-z0-9_-]{20,}' 2>/dev/null || true)"
if [ -n "$hits" ]; then printf "  ${RED}✗${NC} possible secret in tracked files:\n%s\n" "$hits"; FAIL=1
else ok "no keys or tokens in the repo"; fi
git ls-files --error-unmatch .env.local >/dev/null 2>&1 && { printf "  ${RED}✗${NC} .env.local is tracked by git: run  git rm --cached .env.local\n"; FAIL=1; } || true

step "JavaScript"
for f in src/scripts/*.js scripts/*.mjs scripts/lib/*.mjs; do
  node --check "$f" 2>/dev/null || { printf "  ${RED}✗${NC} syntax error in %s\n" "$f"; node --check "$f" || true; FAIL=1; }
done
[ "$FAIL" = 0 ] && ok "all scripts parse"

step "Build (production, images on ${CDN_HOST})"
if CDN_URL="$CDN_URL" node scripts/build.mjs > /tmp/ebp-build.log 2>&1; then
  grep -E '^Built|✓|drafting notes' /tmp/ebp-build.log | sed 's/^/  /'
  grep -E '^ +!' /tmp/ebp-build.log || true
else
  sed -n '/Errors:/,$p' /tmp/ebp-build.log; FAIL=1
fi

step "Images on Cloudflare R2"
pending="$(node scripts/upload-assets.mjs --pending 2>/dev/null | tail -1)"
[ "$pending" = "0" ] && ok "all images already on the CDN" || warn "${pending} new image(s) will upload on deploy"

echo
[ "$FAIL" = 0 ] && printf "${GRN}${BLD}✓ Ready to deploy.${NC}\n\n" || { printf "${RED}${BLD}✗ Fix the items above first.${NC}\n\n"; exit 1; }
