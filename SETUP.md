# WHYRO Community — Setup guide

This is the first working application scaffold for WHYRO. It contains the React/Vite interface, custom vector logo, animated brand intro, project feed, Google OAuth wiring, project publishing form, contributor application form, and initial Supabase schema.

## 1. Requirements
- Node.js 20 or newer
- A Supabase project
- Access to the repository or hosting account currently serving `whyro.online`

## 2. Install and run locally
```bash
npm install
cp .env.example .env
npm run dev
```
Set both values in `.env` before expecting database features to work. Without credentials the interface opens in demo mode, and forms explain that setup is required.

## 3. Configure Supabase
1. Create a project at https://supabase.com/
2. Open **SQL Editor** and run `supabase/schema.sql`.
3. In Project Settings / API, copy the project URL and publishable (or anon) key into `.env`.
4. In Authentication → Providers, enable Google.
5. Create a Google OAuth client in Google Cloud Console. Add the callback URL shown by Supabase's Google provider setup.
6. In Supabase Authentication → URL Configuration, set the Site URL to `https://whyro.online` and add local/deployment callback URLs to Redirect URLs.
7. Make sure the deployed site is served over HTTPS.

## 4. Deploy
Build with:
```bash
npm run build
```
Deploy the generated `dist/` directory to the existing hosting provider. If the current domain points at a GitHub Pages repository, configure the deployment workflow to publish `dist/`; do not upload this project into a repository's live root until you've backed up the current site and confirmed the hosting setup.

## 5. Email notifications
The browser must never send email using a secret key. Create a Supabase Edge Function named `notify-contributor-application` that:
- accepts a newly created application ID,
- validates the request and fetches the application server-side,
- sends an email to the configured WHYRO owner address through an email provider,
- stores provider credentials as server-side secrets,
- applies rate limits and logs failures safely.

Then invoke that function after a successful application insert. This scaffold intentionally does not pretend email notifications are active until this secure server-side step is configured.

## 6. Team approval and admin dashboard
The initial schema stores applications as `pending` and defines the profile role field. Do not expose application records to public users. Build admin review through a protected server-side function or carefully designed RLS policies. Promote the first admin manually through the Supabase SQL editor after verifying the correct account ID. Never let a user change their own role through the public profile update policy; for production, move `role` into a protected table or add a trigger that prevents self-promotion.

## 7. Important production hardening before opening to everyone
- Review and tighten profile read/update policies; public profile data should contain only information intended to be public.
- Restrict project URL schemes to http/https and validate them server-side.
- Add upload storage buckets, file size/type checks, and storage RLS before allowing arbitrary uploads.
- Add abuse reporting, moderation, rate limits, spam protection, backups, and privacy/terms pages.
- Replace demo cards with real projects as the database fills.
- Add a safe project detail page and edit/delete controls scoped to the owner.
- Email notifications and administrator review are not live until the server-side functions are implemented.
- Do not put a Supabase service-role key or email API secret in frontend variables.

## 8. Domain, title, and logo
The page title and metadata use WHYRO as the product name. The favicon is `public/whyro-mark.svg`. Configure your host to serve the app at `https://whyro.online/` and confirm that deep links resolve to the application.
