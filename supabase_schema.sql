-- Run this script in your Supabase SQL Editor to create the users table

CREATE TABLE IF NOT EXISTS public.app_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    otp_code TEXT,
    otp_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Optional: Create an index on email for faster logins
CREATE INDEX IF NOT EXISTS idx_app_users_email ON public.app_users(email);

-- Enable RLS
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Allow public access (since the API isn't currently using a Service Role Key)
-- In a production environment with a Service Role Key in .env.local, you wouldn't need these public policies.
CREATE POLICY "Allow public insert" ON public.app_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select" ON public.app_users FOR SELECT USING (true);
CREATE POLICY "Allow public update" ON public.app_users FOR UPDATE USING (true);
