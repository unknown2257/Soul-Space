# SoulSpace

SoulSpace is a premium, mobile-first, invite-only private communication platform. Each private space contains exactly two members. Users cannot register, discover users, create spaces, or join groups; all access is issued manually by an administrator.

## Demo credentials

- Member: `Adrija` / `ADR458X`
- Member: `Ayyan` / `AYN792K`
- Hidden admin: `admin@soulspace.app` / `SOULSPACE-ADMIN`

## Production setup

1. Create a Supabase project.
2. Run `supabase/migrations/20260607000000_soulspace_schema.sql` in Supabase SQL editor or via the Supabase CLI.
3. Create Storage buckets named `profile-photos`, `media`, `voice-notes`, `documents`, and `backups`.
4. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Run `npm install` and `npm run build`.

The app includes local demo persistence when Supabase environment variables are absent, while `src/lib/supabase.ts` enables Supabase Realtime integration when configured.
