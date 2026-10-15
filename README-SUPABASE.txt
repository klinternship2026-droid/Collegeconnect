COLLEGECONNECT — SUPABASE AUTH SETUP

1. Open supabase-config.js.
2. Replace YOUR_PROJECT_URL with your Supabase Project URL, for example:
   https://YOUR_PROJECT_REF.supabase.co
3. Replace YOUR_PUBLISHABLE_KEY with the sb_publishable_... key from Supabase Settings > API Keys.
4. Do not put any secret/service_role key in this file.
5. Upload these files to the same folder in your GitHub repository and deploy to Vercel:
   index.html, styles.css, app.js, data.js, supabase-config.js
   Also include your logo.jpg if your site uses it.
6. Authentication uses Supabase email/password. New accounts are assigned the Student role by the database trigger.
7. If email confirmation is enabled, new users must confirm their email before signing in.

IMPORTANT SCOPE NOTE:
This first integration connects registration, sign-in, sign-out, and profile lookup to Supabase.
Events, books, clubs, RSVPs, reservations, announcements, external events, gallery content,
and admin actions are still using the existing localStorage demo data. They are NOT yet database-synced.
Do not treat this as a fully production-ready multi-user app until those features are migrated
to Supabase tables and their Row Level Security policies are tested.
