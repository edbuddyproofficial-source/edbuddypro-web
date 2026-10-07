# edBuddy Pro — website

The marketing site for **edbuddypro.com**: course pages, checkout, business page and legal pages.
Plain HTML, CSS and JavaScript with a small build step. No framework, no dependencies to install.

- **Hosting:** Vercel (builds `main` on every push)
- **Images:** Cloudflare R2, served from `cdn.edbuddypro.com`
- **Code:** GitHub

```bash
npm run dev        # build and preview at http://localhost:4321
npm run build      # build into dist/ and check every page
./deploy.sh        # upload new images, push, Vercel deploys
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
  upload-assets.mjs     ← pushes src/assets/img to R2
vercel.json             ← clean URLs, redirects from old .html links, security + cache headers
deploy.sh               ← first-time setup and every release
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
- writes `sitemap.xml` and `robots.txt`
- **fails** if any internal link, `#anchor` or image is broken, or an image has no alt text

---

## Everyday changes

| I want to… | Edit |
|---|---|
| Change contact email, phone, social links | `site.config.json` |
| Change the menu or footer | `src/partials/nav.html`, `src/partials/footer.html` |
| Edit a page's words | the page in `src/pages/` |
| Swap a photo | replace the file in `src/assets/img/` with the **same name**, then `./deploy.sh` |
| Add a photo | drop it in `src/assets/img/`, reference it as `/assets/img/name.webp` |
| Add a page | create `src/pages/new-page.html` (copy a legal page as a starting point) |
| Open a course for enrolment | rebuild its page from `courses/ai-for-hr.html`, then update the nav, homepage cards and footer |

Use `.webp` images around 1200–1600px wide. Run `npm run dev` and look before you push.

---

## Deploying

### First time (once)

You need Node 18+, git and the [GitHub CLI](https://cli.github.com). Use the edbuddy accounts when each tool asks you to sign in.

1. **Domain on Cloudflare.** Make sure `edbuddypro.com` is added to the Cloudflare account and its nameservers point to Cloudflare. Copy the **Zone ID** from the domain's Overview page.
2. Run:
   ```bash
   GH_OWNER=<edbuddy-github-username> CF_ZONE_ID=<zone-id> ./deploy.sh setup
   ```
   This will:
   - create the private GitHub repo and push
   - create the R2 bucket `edbuddypro-assets`, attach `cdn.edbuddypro.com` and upload every image
   - create the Vercel project, set `CDN_URL`, connect GitHub, turn on Web Analytics and Speed Insights
   - add the domains and run the first production deploy
3. In Cloudflare DNS, add the two records Vercel prints. Set them to **DNS only** (grey cloud).
4. In Vercel → Settings → Domains, redirect `www.edbuddypro.com` to `edbuddypro.com`.

### Every release

```bash
MSG="Update HR course FAQ" ./deploy.sh
```

This uploads any new or changed images to R2, does a production build to check everything, commits and pushes. Vercel builds and deploys `main` in about a minute. Every other branch gets its own preview URL on Vercel.

Other commands: `./deploy.sh assets` (images only), `./deploy.sh prod` (deploy straight from your machine).

> Images go to R2 **before** the push. If you ever deploy and see a broken image, run `./deploy.sh assets`.

---

## Connecting the forms

Every form on the site (call-back panel, course enquiry, B2B, newsletter, waitlist, checkout)
goes through one function, `EBP.submitLead(kind, data)` in `src/scripts/site.js`.

- **Today:** `leads.endpoint` in `site.config.json` is empty, so a submit opens the visitor's email app
  with their details addressed to `hello@edbuddypro.com`. No enquiry is lost, but it relies on the visitor sending that email.
- **When the backend is ready:** put its URL in `leads.endpoint`. Every form will then `POST` JSON:
  ```json
  { "kind": "callback | enquiry | business | newsletter | waitlist | enrol", "page": "/courses/ai-for-hr",
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
