-- ========================================================
-- ANGOPAYX — SUPABASE SQL SCHEMA & SECURITY POLICIES
-- ========================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA PROFILES (Perfis de Utilizador)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'client',
  kyc_status TEXT DEFAULT 'Não iniciado',
  account_status TEXT DEFAULT 'Ativa',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilizador pode ver o seu próprio perfil" 
  ON public.profiles FOR SELECT 
  USING (auth.uid()::text = id OR auth.jwt()->>'email' = 'luisbongue4@gmail.com');

CREATE POLICY "Utilizador pode atualizar o seu próprio perfil" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid()::text = id OR auth.jwt()->>'email' = 'luisbongue4@gmail.com');

CREATE POLICY "Administrador total para profiles" 
  ON public.profiles FOR ALL 
  USING (auth.jwt()->>'email' = 'luisbongue4@gmail.com');

-- 3. TABELA KYC_RECORDS (Verificação de Identidade)
CREATE TABLE IF NOT EXISTS public.kyc_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  full_name TEXT NOT NULL,
  document_type TEXT DEFAULT 'BI',
  document_number TEXT NOT NULL,
  nationality TEXT DEFAULT 'Angolana',
  date_of_birth TEXT,
  status TEXT DEFAULT 'Pendente',
  status_slug TEXT DEFAULT 'pending',
  bi_frente_path TEXT NOT NULL,
  bi_verso_path TEXT NOT NULL,
  selfie_path TEXT NOT NULL,
  rejection_reason TEXT,
  admin_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_kyc_user_id UNIQUE(user_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_kyc_user_id ON public.kyc_records(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON public.kyc_records(status);

-- RLS para KYC Records
ALTER TABLE public.kyc_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilizadores podem consultar apenas o seu próprio KYC" 
  ON public.kyc_records FOR SELECT 
  USING (auth.uid()::text = user_id OR auth.jwt()->>'email' = 'luisbongue4@gmail.com');

CREATE POLICY "Utilizadores podem criar o seu próprio KYC" 
  ON public.kyc_records FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id OR auth.jwt()->>'email' = 'luisbongue4@gmail.com');

CREATE POLICY "Utilizadores podem atualizar o seu próprio KYC pendente" 
  ON public.kyc_records FOR UPDATE 
  USING (auth.uid()::text = user_id OR auth.jwt()->>'email' = 'luisbongue4@gmail.com');

CREATE POLICY "Apenas Administrador pode aprovar ou rejeitar KYC" 
  ON public.kyc_records FOR ALL 
  USING (auth.jwt()->>'email' = 'luisbongue4@gmail.com');

-- 4. BUCKET STORAGE KYC-DOCUMENTS (POLÍTICAS DE ACESSO PRIVADO)
-- Garantir que o bucket existe como privado
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents',
  'kyc-documents',
  false,
  10485760, -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

-- Políticas do Storage
CREATE POLICY "Upload restrito à pasta do próprio utilizador no KYC"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'kyc-documents' AND
    (
      (storage.foldername(name))[1] = 'kyc' AND
      (storage.foldername(name))[2] = auth.uid()::text
    ) OR auth.jwt()->>'email' = 'luisbongue4@gmail.com'
  );

CREATE POLICY "Visualização de documentos KYC restrita ao proprietário ou admin"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'kyc-documents' AND
    (
      (storage.foldername(name))[1] = 'kyc' AND
      (storage.foldername(name))[2] = auth.uid()::text
    ) OR auth.jwt()->>'email' = 'luisbongue4@gmail.com'
  );
