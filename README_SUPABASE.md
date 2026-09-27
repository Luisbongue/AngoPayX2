# AngoPayX Supabase Auth v2 - Visão Geral e Guia de Execução

## Arquitetura de Autenticação Híbrida e Resiliente

O AngoPayX com **Supabase Auth v2** opera com alta confiabilidade:

1. **Quando o Supabase está configurado (Produção):**
   * O formulário de login (`AuthModal.tsx`) envia as credenciais para o Supabase Auth (`supabase.auth.signInWithPassword`);
   * O Supabase valida a palavra-passe e devolve tokens JWT assinados;
   * O backend do AngoPayX (`/api/*`) valida o token JWT usando `supabaseAdmin.auth.getUser(token)`;
   * Se a senha estiver incorreta ou o email não existir, o erro do Supabase é devolvido imediatamente com código HTTP 401 ("Invalid login credentials").

2. **Quando o Supabase está em ambiente local / preview:**
   * O backend mantém o banco de dados auditável em `data/angopayx-database.json` com hashes de senha SHA-256 e validação real;
   * O sistema **NUNCA** aceita senhas arbitrárias nem ignora a autenticação.

3. **Papéis Administrativos Seguros:**
   * `luisbongue4@gmail.com` -> Super Administrador
   * `luisbongue5@gmail.com` -> Gestor Financeiro
   * `boavidabongue6@gmail.com` -> Analista de Compliance KYC
   * Outros emails -> Acesso de Cliente regular.
