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

-- L3 cache hit analytics per actor (user/admin)
CREATE TABLE IF NOT EXISTS public.cache_l3_hits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_type TEXT NOT NULL CHECK (subject_type IN ('user', 'admin')),
    subject_key TEXT UNIQUE NOT NULL,
    app_user_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    subject_email TEXT,
    l3_hit_count BIGINT NOT NULL DEFAULT 0,
    last_cache_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cache_l3_hits_app_user_id ON public.cache_l3_hits(app_user_id);
CREATE INDEX IF NOT EXISTS idx_cache_l3_hits_subject_type ON public.cache_l3_hits(subject_type);

ALTER TABLE public.cache_l3_hits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert l3 hits" ON public.cache_l3_hits FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select l3 hits" ON public.cache_l3_hits FOR SELECT USING (true);
CREATE POLICY "Allow public update l3 hits" ON public.cache_l3_hits FOR UPDATE USING (true);
