# AngoPayX - Especificações Técnicas para o Agente Antigravity

Bem-vindo ao **AngoPayX**, a plataforma financeira angolana de intermediação de **USDT (TRC20)** e **Kwanza (Kz)**.

Este documento foi preparado especificamente para o agente autônomo **Antigravity** (`antigravity-preview-09-2026`) operar com máxima precisão sobre esta base de código.

---

## 1. Visão Geral da Arquitetura

* **Front-end:** React 19 SPA construído sobre Vite 8, estilizado com Tailwind CSS 4, e ícones Lucide React.
* **Back-end:** Servidor Node.js 22 rodando Express 4 via `tsx server.ts` (`PORT=3000`), montando `vite.middlewares` em desenvolvimento e servindo arquivos compilados em produção.
* **Autenticação Dupla:**
  * **Supabase Auth** para registo de utilizadores reais, confirmação por e-mail e gestão de sessões.
  * **Banco Local Auditável:** Armazenamento idempotente em `data/angopayx-database.json` com livro-razão financeiro (Ledger), verificação de saldos e controle estrito de RBAC.
* **IA / Antigravity:** Integração nativa com `@google/genai` (>= 2.4.0) e modelo de agente `antigravity-preview-09-2026`.

---

## 2. Métodos de Depósito em Kwanza (Kz)

Os clientes depositam Kz para comprar USDT através dos seguintes dados oficiais:

1. **Via Kwik / Transferência por IBAN:**
   * **Rede:** Kwik / Rede Interbancária EMIS
   * **IBAN Oficial:** `0420 0000 0000 1098 3557 1`
   * **Beneficiário:** `PayPal`

2. **Via Código de Referência Multicaixa / Kwik:**
   * **Entidade:** `10116`
   * **Referência ou ID:** `935 531 547`
   * **Beneficiário:** `Entidade: 10116 (PayPal / AngoPayX)`

---

## 3. Carteiras Externas para Saques Suportadas

O sistema suporta saque e registo de 4 plataformas/redes com logos oficiais:

1. **Binance (`BINANCE`):** Aceita **Binance UID** (8-10 dígitos) ou **E-mail cadastrado na Binance**. Taxa reduzida de 0.5 USDT via Binance Pay.
2. **Bybit (`BYBIT`):** Aceita **Bybit UID** ou **E-mail cadastrado na Bybit**. Taxa reduzida de 0.5 USDT.
3. **RedotPay (`REDOTPAY`):** Aceita **RedotPay ID** ou **E-mail cadastrado no RedotPay**. Taxa reduzida de 0.5 USDT.
4. **TRON (`TRC20` / `TRON`):** Aceita endereço público TRON iniciado por `T` (Base58 de 34 caracteres). Taxa de rede de 1.5 USDT com TXID obrigatório de 64 caracteres hexadecimais.

---

## 4. Estrutura de Funções Administrativas (RBAC)

Os privilégios de acesso são reconhecidos automaticamente com base no e-mail:
* `luisbongue4@gmail.com` -> **`super_admin`** (Acesso total: câmbios, taxas, saques, ledger, auditoria, Antigravity)
* `luisbongue5@gmail.com` -> **`finance_admin`** (Gestão financeira: compras, vendas, saques, reconciliação)
* `boavidabongue6@gmail.com` -> **`kyc_admin`** (Aprovação e conformidade documental KYC)
* Demais utilizadores -> **`client`** (Operações regulares de compra, venda, depósito e saque)

---

## 5. Endpoints Principais da API (`/api/*`)

* `GET /api/rates-and-methods`: Taxas de câmbio atuais e métodos de pagamento ativos.
* `POST /api/purchases/create`: Criação de ordem de compra de USDT com pagamento em Kz.
* `POST /api/purchases/receipt`: Upload de comprovativo de transferência bancária.
* `POST /api/sales/create`: Ordem de venda de USDT com recebimento na conta bancária do cliente.
* `POST /api/withdrawals/create`: Solicitação de saque para Binance, Bybit, RedotPay ou TRON.
* `GET /api/wallets/my` & `POST /api/wallets/add`: Gestão de carteiras salvas do cliente.
* `POST /api/admin/antigravity/run`: Execução de tarefas com o agente Antigravity no ambiente remoto.
* `GET /api/admin/antigravity/status`: Status da integração Antigravity e chaves configuradas.

---

## 6. Verificação de Código e Build

```bash
# Validação de TypeScript
npm run lint

# Compilação de Produção
npm run build

# Execução do Servidor
npm run dev # ou npm start
```
