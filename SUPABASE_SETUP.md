# AngoPayX - Configuração Oficial do Supabase Auth v2

Este guia contém as instruções passo-a-passo e os scripts SQL para configurar a autenticação e o banco de dados no Supabase.

---

## 1. Variáveis de Ambiente Necessárias

No arquivo `.env` (ou no painel de segredos do ambiente de hospedagem), configure:

```env
# 1. FRONTEND (Client-side - seguro para bundle público)
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_... (ou anon key)

# 2. BACKEND (Server-side - estritamente confidencial, nunca exposto em VITE_)
SUPABASE_URL=https://SEU_PROJETO.supabase.co
SUPABASE_SECRET_KEY=sb_secret_... (ou service role key)
```

---

## 2. Script SQL de Inicialização (Execute no Supabase SQL Editor)

Acesse o **SQL Editor** no painel do Supabase e execute o seguinte script para criar as tabelas de perfis, controle de papéis (RBAC) e sincronização automática:

```sql
-- 1. Criação da Tabela de Perfis Públicos vinculada ao auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'super_admin', 'finance_admin', 'kyc_admin', 'auditor')),
  account_status TEXT NOT NULL DEFAULT 'Ativa' CHECK (account_status IN ('Ativa', 'Suspensa', 'Bloqueada')),
  kyc_status TEXT NOT NULL DEFAULT 'Não iniciado' CHECK (kyc_status IN ('Não iniciado', 'Pendente', 'Aprovado', 'Rejeitado')),
  tron_deposit_address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Habilitação de RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Acesso
CREATE POLICY "Utilizadores podem ver o seu próprio perfil" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Utilizadores podem atualizar o seu próprio perfil" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Administradores têm acesso de leitura geral" 
ON public.profiles FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('super_admin', 'finance_admin', 'kyc_admin')
  )
);

-- 4. Função Trigger para criar o perfil automaticamente ao registar novo utilizador
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT := 'client';
  tron_addr TEXT;
BEGIN
  -- Reconhecimento interno seguro das contas de administração
  IF NEW.email = 'luisbongue4@gmail.com' THEN
    assigned_role := 'super_admin';
  ELSIF NEW.email = 'luisbongue5@gmail.com' THEN
    assigned_role := 'finance_admin';
  ELSIF NEW.email = 'boavidabongue6@gmail.com' THEN
    assigned_role := 'kyc_admin';
  END IF;

  -- Gerar endereço TRC-20 inicial determinístico
  tron_addr := 'T' || UPPER(SUBSTRING(MD5(NEW.id::TEXT || NOW()::TEXT) FROM 1 FOR 33));

  INSERT INTO public.profiles (id, name, email, phone, role, tron_deposit_address)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    assigned_role,
    tron_addr
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Disparo do Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 3. Storage Bucket para Documentos KYC (Opcional)

No painel **Storage** do Supabase:
1. Crie um novo bucket chamado `kyc-documents`;
2. Defina-o como **Private** (não público);
3. Adicione uma política permitindo que apenas o titular do documento e administradores façam upload e leitura.
