# Launch checklist — edbuddypro.com

## Needs you before launch

These need a business decision or information only you have. The site works without them, but each one is a gap a visitor or regulator can see.

- [ ] **Inbox.** Make sure `hello@edbuddypro.com` exists and someone reads it. Every form currently ends up there.
- [ ] **Refund window.** The HR page and FAQ promise a *7-day refund*. Confirm it, or change the figure in `src/pages/courses/ai-for-hr.html`, `src/pages/index.html` (FAQ) and `src/pages/legal/refund-policy.html`.
- [ ] **Privacy policy.** Add the registered entity name, CIN, registered office and the grievance officer's name and contact (required under the DPDP Act, 2023).
- [ ] **Legal review.** The legal pages are drafts that haven't been reviewed by a lawyer. Their open questions are hidden from the live site and listed in `reports/open-legal-items.md` (run `npm run build` to regenerate the list).
- [ ] **Do Not Sell My Info.** This page only applies if you meet California's CCPA thresholds. If you don't, remove it from the footer (`src/partials/footer.html`) and delete `src/pages/legal/do-not-sell-my-info.html`.

## Soon after launch

- [ ] **Leads backend.** Set `leads.endpoint` in `site.config.json` (see README → Connecting the forms).
- [ ] **Razorpay.** Wire the payment button (see README → Connecting payments).
- [ ] **Phone number.** Add it to `site.config.json → phone`. The "Call us" item appears in the bottom bar once it's set.
- [ ] **Social profiles.** Add the URLs to `site.config.json → social`. Each icon appears in the footer once set.
- [ ] **GA4** (optional). Add the id to `site.config.json → analytics.ga4`.
- [ ] **Role photos.** The homepage "Browse by role" panel had no images for 10 roles, so it reuses course photos for now. Add dedicated images to `src/assets/img/` and update the `rp` panels in `src/pages/index.html`.
- [ ] **Four courses.** Finance, Marketing, Sales and Product are "Opening soon" pages with a waitlist. Their old pages contained HR content and were removed. Build each from `courses/ai-for-hr.html` once its curriculum is written.
- [ ] **Real proof.** Once you have learners, add real numbers, named testimonials and a real case study on `/for-business`. Never use placeholders.
- [ ] **Search Console.** Add the domain in Google Search Console and submit `https://edbuddypro.com/sitemap.xml`.

---

## Audit: what was checked and changed

### "20 things to tell Claude before launching your site"

| # | Item | Status |
|---|---|---|
| 1 | Privacy policy | ✓ `/legal/privacy-policy` (draft; see above) |
| 2 | Terms page | ✓ `/legal/terms-of-service` |
| 3 | Clear CTA | ✓ "Request a callback" in the nav on every page; Enrol on HR; Notify me on opening-soon pages |
| 4 | FAQ | ✓ Homepage, HR course, business page |
| 5 | robots.txt | ✓ Generated; checkout excluded |
| 6 | sitemap.xml | ✓ Generated on every build (15 URLs) |
| 7 | Custom 404 | ✓ New "Module 404" page: shows the bad address and links to every course with its status |
| 8 | Alt text | ✓ Build fails if an image has none; decorative images use `alt=""` |
| 9 | Analytics | ✓ Vercel Web Analytics + Speed Insights (cookieless); GA4 ready behind consent |
| 10 | Meta titles | ✓ Every page; checked by the build |
| 11 | Meta descriptions | ✓ Every page (homepage and checkout were missing them) |
| 12 | Social share | ✓ Open Graph + Twitter tags on every page; 6 branded 1200×630 share images |
| 13 | Favicon | ✓ SVG + ICO + Apple touch icon + PWA icons + manifest (there were none) |
| 14 | Canonical URLs | ✓ Every page, on edbuddypro.com (they pointed at edbuddy.pro) |
| 15 | Cookie consent | ✓ Banner with Essential only / Accept all; "Cookie settings" in the footer |
| 16 | Mobile version | ✓ Checked at 390px with no sideways scroll on any page |
| 17 | Accessibility | ✓ Skip link, visible focus, labelled fields, reduced-motion respected, one `<h1>` per page |
| 18 | Test forms | ✓ Every form validates and submits through one handler (none of them did anything before) |
| 19 | Broken links | ✓ Fixed 39 `#` links and 3 links to a missing About page (most sat in the nav and footer, so they were broken on every page), plus 10 missing images. The build now blocks new ones |
| 20 | Performance | ✓ Course pages 726 KB → 31–184 KB; images on a CDN with hashed names; self-hosted font; long-lived caching |

### "30 reasons your site looks vibecoded"

| # | Item | What changed |
|---|---|---|
| 1 | Harsh gradients | Decorative gradients replaced with solid brand colours |
| 2 | Lucide icons | Not used |
| 3 | Pure white background | Main pages stay white (clean and on-brand); new pages add tinted bands and a navy 404 |
| 4 | Rainbow colouring | Ten different icon hues in "Browse by role" → one ink colour, blue when selected; purple icon set → brand blue |
| 5 | Drop shadows | Every shadow roughly halved; blue glows under buttons removed |
| 6 | 3 feature cards in a row | Existing card grids flattened (lighter shadows, tighter corners, no hover lift); new pages use lists and rules instead |
| 7 | Emojis | Removed |
| 8 | Liquid glass | Kept only where it does a job: the sticky nav, sticky bars and the curriculum overlay |
| 9 | Em dashes | None left in visible copy; each sentence re-punctuated by hand |
| 10 | Inter / Geist / Space Grotesk | Inter + Plus Jakarta → **Figtree** (your brand face), self-hosted |
| 11 | Coloured left stripe | None. Legal examples use a neutral grey rule only |
| 12 | Fake testimonials | Removed: "4,800+ learners", Trustpilot 4.8 (linked to a different company), Google 4.9, "312 ratings" (also in Google structured data), the 47-logo "our learners work at" strip, "92% completion", and the placeholder testimonial sections |
| 13 | Bento grids | Not used |
| 14 | Terminal window | Not used |
| 15 | "It's not X, it's Y" | 15 of the most templated lines rewritten |
| 16 | Checkmark bullets | 338 ticks → small solid brand-blue square markers |
| 17 | 3 pricing tiers | Single price |
| 18 | No real product demos | **Open:** add real course screenshots or a short walkthrough once the LMS is live |
| 19 | Soft corner radius | Radii tightened into a scale (8 / 10 / 12 / 14px) |
| 20 | Purple and black | Not used |
| 21 | No skeleton loaders | Images sit on tinted placeholders while loading |
| 22 | Radial orbs | All glow layers removed |
| 23 | Dot grids | Grid-paper backgrounds removed from every page |
| 24 | Sparkle icons | Not used |
| 25 | Animated arrows | Arrow nudges on hover removed |
| 26 | No TOS | Present |
| 27 | No privacy policy | Present |
| 28 | Hover animations | Card lifts, icon pops and scaling on hover removed |
| 29 | Neon colours | Not used |
| 30 | Basic pastel colours | Not used |

### Also fixed

- Placeholder phone number `1800 000 0000` and a Live chat button with nothing behind it
- Checkout collected card numbers and CVV in its own fields; those inputs are gone (Razorpay collects them)
- "Gateway not wired" and other internal notes that were visible to visitors
- Business page placeholders ("Case study: needs a real customer", "pricing tiers to be set" and others)
- Nav search box that searched nothing; Blogs, About and Login links that went nowhere
- Footer: Resources column and a "Popular courses" list of courses that don't exist
- Logo enlarged: nav 33 → 44px desktop, 26 → 36px phone; footer 34 → 44px
