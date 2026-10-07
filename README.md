# edBuddy Pro — website

The marketing site for **edbuddypro.com**: course pages, checkout, business page and legal pages.
Plain HTML, CSS and JavaScript with a small build step. No framework, no dependencies to install.

- **Hosting:** Vercel (builds `main` on every push)
- **Images:** Cloudflare R2, served from `cdn.edbuddypro.com`
- **Code:** GitHub

```bash
cd ~/Developer/edbuddypro
npm run dev                          # preview at http://localhost:4321
./scripts/check.sh                   # read-only pre-flight, run any time
./scripts/deploy.sh "What changed"   # check → images to R2 → commit → push → Vercel deploys
```

---

## How the repo is laid out

```
site.config.json        ← domain, CDN, contact email, phone, socials, analytics, lead endpoint
src/
  pages/                ← one file per URL (the path is the URL)
    index.html                → /
    for-business.html         → /for-business
    checkout.html             → /checkout
    404.html                  → any unknown URL
    courses/ai-for-hr.html    → /courses/ai-for-hr        (full course page)
    courses/ai-for-*.html     → /courses/ai-for-finance … (opening-soon pages)
    legal/*.html              → /legal/privacy-policy …
    about.html                → /about
    resources.html            → /resources            (hub for everything below)
    resources/guides.html     → /resources/guides     (+ guides/*.html, one per guide)
    resources/prompt-library.html, resources/webinars.html
    blog.html                 → /blog                 (+ blog/*.html, one per article)
    free-lessons.html         → /free-lessons         (3 free HR lessons)
    verify.html               → /verify               (certificate verification)
    search.html               → /search               (site search; index built into dist/search-index.json)
    login.html                → /login                (learner login help until the LMS URL is set)
  partials/             ← shared pieces, dropped in with <!-- @include name -->
    head.html                 meta, favicon, fonts, base styles, analytics
    nav.html  footer.html  bottom-bar.html
  styles/               ← base.css (every page) + one file per page type + components.css
  scripts/              ← site.js (every page) + one file per page type
  assets/
    img/                ← every photo (uploaded to R2 on deploy)
    icons.svg           ← icon sprite, used as <use href="/assets/icons.svg#id">
  public/               ← copied to the site root as-is (favicons, fonts, og/ share images)
scripts/
  build.mjs             ← src/ → dist/, plus SEO tags, sitemap, robots, link checks
  serve.mjs             ← local preview that behaves like Vercel
  upload-assets.mjs     ← pushes new images in src/assets/img to R2 (log: r2-uploaded.txt)
  setup.sh              ← once per Mac: GitHub, Cloudflare R2, Vercel, first deploy
  check.sh              ← read-only pre-flight
  deploy.sh             ← every release
  lib.sh                ← shared settings (repo, bucket, domain) and helpers
vercel.json             ← clean URLs, redirects from old .html links, security + cache headers
.env.example            ← optional: Cloudflare API token instead of browser login (never committed)
```

### What the build does for you

Every page only needs a `<title>`, a `<meta name="description">`, and `<!-- @include head -->`.
The build then:

- expands `<!-- @include nav -->` and the other partials
- fills `{{site.email}}`, `{{social.linkedin}}` and similar from `site.config.json`, and drops any
  link left empty (a social profile you haven't set yet, for example, simply doesn't show)
- writes the canonical URL, Open Graph and Twitter tags. Give a page its own share image with
  `<meta name="ebp:og-image" content="/og/hr.png">`
- removes HTML comments and the legal pages' drafting notes (listed in `reports/open-legal-items.md`)
- points images at the CDN and gives each image a content hash in its name, so it can be cached forever
- stamps CSS/JS URLs with a version so browsers always get the latest after a deploy
- writes `sitemap.xml`, `robots.txt` and `search-index.json` (powers the nav search box)
- **fails** if any internal link, `#anchor` or image is broken, or an image has no alt text

---

## Everyday changes

| I want to… | Edit |
|---|---|
| Change contact email, phone, social links | `site.config.json` |
| Change the menu or footer | `src/partials/nav.html`, `src/partials/footer.html` |
| Edit a page's words | the page in `src/pages/` |
| Swap a photo | replace the file in `src/assets/img/` with the **same name**, then `./scripts/deploy.sh` |
| Add a photo | drop it in `src/assets/img/`, reference it as `/assets/img/name.webp` |
| Add a page | create `src/pages/new-page.html` (copy a legal page as a starting point) |
| Add a blog post or guide | copy an existing one in `src/pages/blog/` or `src/pages/resources/guides/`, then add a card to `blog.html` or `resources/guides.html` |
| Add a prompt | copy an `<article class="pl-item">` in `src/pages/resources/prompt-library.html` and set `data-role` |
| Open a course for enrolment | rebuild its page from `courses/ai-for-hr.html`, then update the nav, homepage cards and footer |

Use `.webp` images around 1200–1600px wide. Run `npm run dev` and look before you push.

---

## Deploying

`deploy.sh` pushes to GitHub (the history of every release), then deploys with the Vercel CLI as the edbuddy account. Vercel's own Git auto-deploy is switched off in `vercel.json`, because the Hobby plan blocks Git deploys whose commit author isn't the Vercel account owner.
Vercel and Cloudflare both log in through the browser, like Wisherly, but this project keeps its **own**
logins (`~/.vercel-edbuddy` and `~/.edbuddy-cli`). Logging in here never signs any other project out.
If a login link opens in the wrong Chrome profile, copy it into the edbuddy profile.

### First-time setup (once per Mac)

1. **Folder:** the project lives at `~/Developer/edbuddypro`.
2. **GitHub access:** your Mac must be able to push to `edbuddyproofficial-source/edbuddypro-web`.
   If your usual GitHub account isn't on that org, invite it under repo Settings → Collaborators and accept.
3. **Run setup:**
   ```bash
   ./scripts/setup.sh
   ```
   It pushes the code, logs in to Cloudflare in the browser, creates the R2 bucket, connects `cdn.edbuddypro.com`, uploads the images,
   logs in to Vercel as the edbuddy account, links the project, sets `CDN_URL`, connects GitHub,
   turns on analytics, adds the domains and does the first production deploy.
   Where a step needs the dashboard, it says exactly what to click and waits.
4. **DNS:** add the two records the script prints in Cloudflare → edbuddypro.com → DNS, set to **DNS only**.

### Every release

```bash
cd ~/Developer/edbuddypro
./scripts/deploy.sh "Update HR course FAQ"
```

1. runs `check.sh` and stops on any broken link, missing image, secret or syntax error
2. uploads any new images to R2 (before the site that uses them goes live)
3. shows what changed and asks **y** to commit
4. on `main`, asks you to type **deploy**; on any other branch, **y** (preview URL only)
5. pushes to GitHub, then deploys with the Vercel CLI; live in about a minute

**Preview first:** `git checkout -b my-change`, then `./scripts/deploy.sh "…"` gives a preview URL.
When it looks right: `git checkout main && git merge my-change && ./scripts/deploy.sh`.

**Rollback:** Vercel → edbuddypro-web → Deployments → previous build → **Instant Rollback**.

## Connecting the forms

Every form on the site (call-back panel, course enquiry, B2B, newsletter, waitlist, webinar, certificate verification, checkout)
goes through one function, `EBP.submitLead(kind, data)` in `src/scripts/site.js`.

- **Today:** `leads.endpoint` in `site.config.json` is empty, so a submit opens the visitor's email app
  with their details addressed to `hello@edbuddypro.com`. No enquiry is lost, but it relies on the visitor sending that email.
- **When the backend is ready:** put its URL in `leads.endpoint`. Every form will then `POST` JSON:
  ```json
  { "kind": "callback | enquiry | business | newsletter | waitlist | webinar | verify | access | enrol", "page": "/courses/ai-for-hr",
    "data": { "name": "…", "email": "…" }, "at": "2026-10-07T10:00:00.000Z" }
  ```
  Return any 2xx and the visitor sees a confirmation. Anything else shows an error with the email address.

## Connecting payments

`/checkout` sells **AI for HR Professionals** (₹4,999 incl. GST). The page shows the order and lets the
buyer choose UPI, card, net banking or wallet. Card and UPI details are **not** collected on our page;
that happens inside Razorpay Checkout. To go live:

1. Create a server endpoint that creates a Razorpay order (it needs the secret key, so it can't live in this static site).
2. In `src/scripts/checkout.js`, replace the `[data-pay]` handler: load `https://checkout.razorpay.com/v1/checkout.js`,
   open Razorpay with the order id, and verify the payment signature on your server.
3. Until then, Pay sends an enrolment request through `EBP.submitLead('enrol', …)`.

## Analytics and cookies

- **Vercel Web Analytics + Speed Insights** are cookieless and load on every page.
- **GA4** (optional): put the measurement id in `site.config.json → analytics.ga4`. It only loads after a visitor clicks **Accept all** on the cookie banner. "Cookie settings" in the footer reopens the banner.

See `LAUNCH-CHECKLIST.md` for what still needs a decision before or soon after going live.
