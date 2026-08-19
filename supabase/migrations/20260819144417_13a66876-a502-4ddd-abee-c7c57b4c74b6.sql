
-- Enums for content approval
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_status') THEN
    CREATE TYPE content_status AS ENUM (
      'internally_approved',
      'client_approved',
      'internal_changes_requested',
      'client_changes_requested',
      'pending_internal_approval'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'funnel_stage') THEN
    CREATE TYPE funnel_stage AS ENUM (
      'attraction',
      'education',
      'conversion'
    );
  END IF;
END $$;

-- Table for content approval posts
CREATE TABLE IF NOT EXISTS public.content_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  caption TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status content_status DEFAULT 'pending_internal_approval',
  funnel_stage funnel_stage,
  media_urls TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Comments for approval
CREATE TABLE IF NOT EXISTS public.content_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.content_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Public access tokens for clients (isolation)
CREATE TABLE IF NOT EXISTS public.client_public_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_posts TO authenticated;
GRANT ALL ON public.content_posts TO service_role;
GRANT SELECT ON public.content_posts TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_comments TO authenticated;
GRANT ALL ON public.content_comments TO service_role;
GRANT SELECT, INSERT ON public.content_comments TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_public_access TO authenticated;
GRANT ALL ON public.client_public_access TO service_role;
GRANT SELECT ON public.client_public_access TO anon;

-- RLS
ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_public_access ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow authenticated to manage posts') THEN
    CREATE POLICY "Allow authenticated to manage posts" ON public.content_posts FOR ALL TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow authenticated to manage comments') THEN
    CREATE POLICY "Allow authenticated to manage comments" ON public.content_comments FOR ALL TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow authenticated to manage access tokens') THEN
    CREATE POLICY "Allow authenticated to manage access tokens" ON public.client_public_access FOR ALL TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow public read of posts for client') THEN
    CREATE POLICY "Allow public read of posts for client" ON public.content_posts FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow public read of comments for client') THEN
    CREATE POLICY "Allow public read of comments for client" ON public.content_comments FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow public insert of comments for client') THEN
    CREATE POLICY "Allow public insert of comments for client" ON public.content_comments FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;
