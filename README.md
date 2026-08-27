# Patricia Morales portfolio

An editorial public portfolio and private, no-login content editor for Patricia Camille S. Morales. Supabase supplies PostgreSQL and persistent Storage; Vinext/Vite serves the site and a controlled server-side write API.

## URLs

- Public portfolio: `/`
- Published project pages: `/work/[niche-slug]/[project-slug]`
- Public niche CV: `/cv/[niche-slug]`
- Generated niche CV PDF: `/cv/[niche-slug]/pdf`
- Private editor: `/<your PORTFOLIO_EDITOR_SECRET value>`

The private editor does not use accounts, passwords, email, or magic links. **Anyone who possesses its URL can edit the portfolio.** Keep it out of messages, screenshots, public bookmarks, analytics exports, and documentation that will be published. Robots metadata prevents indexing requests but is not security.

To rotate access, generate a new long random value, change `PORTFOLIO_EDITOR_SECRET` in local and Vercel environments, and redeploy. The new value becomes the final URL segment and the old URL stops rendering the editor.

## Security and data flow

The browser uses the public Supabase anon key only for published reads. PostgreSQL RLS exposes published/visible rows and does not grant anonymous writes. The editor sends its private route secret to `/api/portfolio-editor`; the server validates the secret, resource, fields, filters, upload type, size, bucket, and path before using the server-only Supabase service-role key. The service-role key is never sent to browser JavaScript.

This capability-URL model is intentionally weaker than authentication: a copied URL grants editing access. It is suitable only because the owner explicitly accepts that tradeoff.

## Environment variables

Copy `.env.example` to `.env.local`.

| Variable                        | Exposure        | Purpose                             |
| ------------------------------- | --------------- | ----------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Browser-safe    | Supabase project URL                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe    | Published read access               |
| `NEXT_PUBLIC_SITE_URL`          | Browser-safe    | Canonical production origin         |
| `SUPABASE_SERVICE_ROLE_KEY`     | **Server only** | Controlled editor mutations/uploads |
| `PORTFOLIO_EDITOR_SECRET`       | **Server only** | Private route and API capability    |

Never prefix either server-only value with `NEXT_PUBLIC_`. Use a long, random editor secret and keep it private.

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/migrations/202608270001_initial_portfolio.sql`.
3. Run `supabase/migrations/202608270002_complete_editor.sql`.
4. Run `supabase/migrations/202608270003_multi_niche_views.sql`.
5. Run `supabase/migrations/202608270004_direct_niche_ownership.sql`.
6. Run `supabase/migrations/202608270005_configurable_dynamic_cvs.sql`.
7. Run `supabase/migrations/202608270006_global_shared_records_and_track_mappings.sql`.
8. Copy the project URL, anon key, and service-role key into the matching environments.
9. Do not create Auth users or configure magic-link redirects; Supabase Auth is not used.

Migrations are additive and must be run in filename order. The migrations contain no editor allowlist, Auth helper, authenticated editor policy, or anonymous write policy. The Storage bucket remains publicly readable but can be written only through the server service role.

## Local setup

1. Install Node.js 22.x.
2. Run `npm install`.
3. Create `.env.local` with all five variables.
4. Run `npm run dev`.
5. Open the private editor URL above.

## Using the editor

- **Dashboard:** see published, draft, and archived project counts plus missing optional profile details.
- **Profile:** edit biography and headline; upload, replace, remove, preview, describe, and reposition the professional photo.
- **Education / Experience:** add verified records, publish or hide, reorder, archive, and restore.
- **Skills:** manage groups and individual skills without JSON.
- **Certifications / Awards / Organizations:** add, edit, publish, reorder, archive, restore, and link supporting files.
- **Projects:** begin as drafts, edit metadata, choose or upload covers, compose pages from text, heading, image, gallery, quote, video, and document blocks, preview privately, then publish.
- **Media:** upload JPEG, PNG, WebP, AVIF, PDF, or MP4 files up to 15 MB, edit image alt text/captions, reuse files, and archive carefully.
- **CV:** every active niche automatically generates a focused CV from Contact, Professional Summary, Experience, Education, and Skills when usable content exists.
- **Contact:** edit public email/call-to-action and manage real social links.
- **Site Settings:** enable or hide optional public sections. Empty sections remain hidden.

## Six separate targeted portfolios

Patricia has six professional niches. They share Patricia's identity, biographies and professional photo, Education, factual Experience records, Certifications, Awards, Organizations, Contact/Social Links, and the reusable Media Library. Each niche independently selects and presents the relevant shared records. There is no seventh broad portfolio view.

### Configure the six niches

1. Apply migration `202608270004_direct_niche_ownership.sql`.
2. Open **Portfolio Views** in the private editor.
3. Select one of the six empty niche slots.
4. Enter its name, selector label, and shareable slug, then save it.
5. Activate the niche when its content is ready. The first active niche becomes the default automatically.
6. To change the default, open another active niche and select **Default niche**.

The public homepage `/` renders the default niche. A direct client-facing link uses `/?track=your-niche-slug`. The selector and browser Back/Forward controls keep that URL state.

### Edit one niche

The **THIS NICHE** banner means changes stay inside the selected niche. Its tabs manage:

- **Positioning:** headline, Supporting Headline, Professional Summary, Career Framing, and niche-specific Contact CTA wording.
- **Projects:** independent projects and complete case studies, including covers, galleries, videos, documents, drafts, publishing, archives, featured state, and order.
- **Experience:** select global Experience records, then write a niche-specific role/title and highlights.
- **Skills:** independent skill groups and skills.
- **Certifications, Awards, Organizations:** select the relevant records from their global canonical collections.
- **CV:** generated automatically with a consistent five-section structure; there is no niche CV settings screen.
- **Public sections:** follow one fixed narrative order and hide automatically when empty.
- **Metadata:** generated automatically from Patricia's name, the niche name, and its Supporting Headline or Professional Summary.

To present similar work or experience in another niche, create a separate tailored record there. Editing the first record will not change the second.

### Use a niche CV

Open an active niche on the public portfolio. **View CV** and **Download CV** appear automatically as soon as its standard CV sections provide meaningful content. Empty headings are omitted. The downloaded filename is generated from Patricia's name and the niche name.

The preview and PDF use the same resolver. Contact Details and Education are global. Professional Summary, mapped Experience presentation, and Skills come only from the selected niche. Projects, Certifications, Awards, Organizations, biographies, Career Framing, CTA content, and the professional photo are deliberately excluded.

### Global content

Sections marked **GLOBAL CONTENT** affect every niche:

- Patricia's name and identity
- Short and long biographies
- Primary CTA label and destination
- One professional photo, including alt text and focal position
- Education, including the verified Olivarez College record
- Factual Experience, Certifications, Awards, and Organizations
- Contact details and social links
- Uploaded Media Library files
- Truly site-wide settings

The Media Library can reuse one uploaded file in several niches without copying its bytes. Content records that reference those assets remain niche-owned.

Project pages use `/work/[niche-slug]/[project-slug]`, preventing a project from being resolved through the wrong niche.

## Deployment to Vercel

Import the Git repository, select the **Other** framework preset, and use `npm run build:vercel` as the build command. Leave both the Output Directory override and Install Command override disabled: Nitro emits Vercel's Build Output API directly at `.vercel/output`, and Vercel detects the npm lockfile. Use Node.js 22.x and add all five variables to Production and Preview environments. Mark `SUPABASE_SERVICE_ROLE_KEY` and `PORTFOLIO_EDITOR_SECRET` as sensitive. Normal content changes then use only the private editor; code/design or secret-route rotation requires a redeploy.

## Backups and recovery

Enable Supabase backups or PITR, periodically export the database, and separately copy Storage objects. Archived records can be restored in the editor. Test database restores in a separate Supabase project before overwriting production.

## Validation

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `git diff --check`.
