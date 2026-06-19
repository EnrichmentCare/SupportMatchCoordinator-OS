# Coordinator OS — Provisioning Checklist (do this once)

You chose to own the accounts. Here's everything to create. ~15 minutes. Once done,
paste me the values where noted and I'll wire the app to them in Phase 0.

## 1. Supabase project (Sydney)
1. Go to https://supabase.com → sign in → **New project**.
2. Name: `coordinator-os`. Generate a strong DB password (save it).
3. **Region: `Southeast Asia (Sydney) ap-southeast-2`** — important for AU data residency. ⚠️ Region can't be changed later.
4. After it provisions, open **Project Settings → API** and copy:
   - `Project URL`  → I'll set as `VITE_SUPABASE_URL`
   - `anon public key` → I'll set as `VITE_SUPABASE_ANON_KEY`
   - `service_role key` → **secret**, never shared with the frontend. Keep it safe; I'll only use it in Edge Function secrets.
5. **Authentication → Providers:** keep **Email** enabled. (Confirm Q: magic-link vs password — I'll default to email + password.)

## 2. Resend (email — needed Phase 3, set up now if easy)
1. https://resend.com → sign up → verify your sending domain (e.g. `mail.supportmatch.com.au`) or use their test domain to start.
2. Create an **API key** → keep it secret. I'll store it in Supabase Edge Function secrets, never in the frontend.

## 3. Netlify (hosting)
1. https://netlify.com → sign up (GitHub login is easiest).
2. We'll connect the repo in Phase 0; nothing to configure yet beyond the account.

## 4. GitHub (source)
1. Create an empty **private** repo, e.g. `coordinator-os`.
2. Tell me the repo URL; I'll push the scaffold there so Netlify can auto-deploy.

## What to send me to start Phase 0
- ✅ `VITE_SUPABASE_URL`
- ✅ `VITE_SUPABASE_ANON_KEY`
- ✅ GitHub repo URL
- (service_role + Resend keys: hold until I ask, and we'll put them straight into Supabase secrets)

> Secrets safety: the **anon key is safe to expose** (RLS protects data). The
> **service_role and Resend keys must never** touch the frontend — they only live in
> Supabase function secrets.
