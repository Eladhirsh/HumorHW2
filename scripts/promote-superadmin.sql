-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor) to promote
-- your own account to superadmin AFTER you've signed in with Google at least once.
--
-- Replace 'YOUR_EMAIL@gmail.com' with the email you use to sign in via Google OAuth.
--
-- This solves the bootstrapping problem: you need is_superadmin=TRUE to access
-- the admin panel, but you can't set it through the admin panel until you have access.
-- The Supabase SQL Editor has direct database access and bypasses RLS, so you can
-- run this UPDATE there to promote yourself.

UPDATE profiles
SET is_superadmin = TRUE
WHERE email = 'YOUR_EMAIL@gmail.com';
