# Configuração do Stripe para Assinaturas

## Passo 1: Criar Produtos no Stripe Dashboard

1. Acesse o [Stripe Dashboard](https://dashboard.stripe.com)
2. Vá em **Products** → **Add Product**
3. Crie 4 produtos de assinatura:

### Produto 1: Assinatura Prata
- **Nome**: Assinatura Prata
- **Descrição**: Acesso a conteúdo exclusivo básico
- **Pricing**: Recurring
- **Price**: R$ 19,90 BRL
- **Billing period**: Monthly
- Após criar, copie o **Price ID** (começa com `price_...`)

### Produto 2: Assinatura Gold
- **Nome**: Assinatura Gold
- **Descrição**: Acesso completo a conteúdo premium
- **Pricing**: Recurring
- **Price**: R$ 39,90 BRL
- **Billing period**: Monthly
- Copie o **Price ID**

### Produto 3: Assinatura Platinum
- **Nome**: Assinatura Platinum
- **Descrição**: Experiência VIP completa
- **Pricing**: Recurring
- **Price**: R$ 79,90 BRL
- **Billing period**: Monthly
- Copie o **Price ID**

### Produto 4: Assinatura Diamante
- **Nome**: Assinatura Diamante
- **Descrição**: Acesso total e benefícios exclusivos
- **Pricing**: Recurring
- **Price**: R$ 99,90 BRL
- **Billing period**: Monthly
- Copie o **Price ID**

## Passo 2: Atualizar Price IDs no Código

Abra o arquivo `lib/stripe-products.ts` e substitua os placeholders pelos Price IDs reais:

\`\`\`typescript
stripePriceId: 'price_1234567890abcdef', // Substitua com o ID real
\`\`\`

## Passo 3: Configurar Webhooks

1. No Stripe Dashboard, vá em **Developers** → **Webhooks**
2. Clique em **Add endpoint**
3. **Endpoint URL**: `https://seu-dominio.com/api/webhooks/stripe`
   - Para desenvolvimento local, use o Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
4. **Events to send**: Selecione:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copie o **Signing secret** (começa com `whsec_...`)
6. Adicione às variáveis de ambiente:
   \`\`\`
   STRIPE_WEBHOOK_SECRET=whsec_seu_secret_aqui
   \`\`\`

## Passo 4: Testar o Fluxo

### Teste Local com Stripe CLI
\`\`\`bash
# Instalar Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Escutar webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Testar webhook
stripe trigger checkout.session.completed
\`\`\`

### Cartões de Teste
Use estes números de cartão no checkout:
- **Sucesso**: 4242 4242 4242 4242
- **Falha**: 4000 0000 0000 0002
- **3D Secure**: 4000 0027 6000 3184

Data de validade: Qualquer data futura
CVC: Qualquer 3 dígitos
CEP: Qualquer 5 dígitos

## Passo 5: Variáveis de Ambiente Necessárias

Certifique-se de ter todas estas variáveis configuradas:

\`\`\`env
# Stripe Keys (já configuradas via integração)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Webhook Secret (adicionar após criar webhook)
STRIPE_WEBHOOK_SECRET=whsec_...

# App URL (para redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

## Fluxo de Assinatura

1. **Usuário escolhe plano** → Clica em "Assinar Agora"
2. **Checkout criado** → Server action cria sessão do Stripe
3. **Pagamento processado** → Stripe processa o pagamento
4. **Webhook recebido** → `checkout.session.completed`
5. **Assinatura ativada** → Usuário recebe acesso ao conteúdo
6. **Comissões processadas** → Sistema MLM distribui comissões automaticamente

## Próximos Passos

- [ ] Criar produtos no Stripe Dashboard
- [ ] Copiar Price IDs e atualizar `lib/stripe-products.ts`
- [ ] Configurar webhook endpoint
- [ ] Adicionar `STRIPE_WEBHOOK_SECRET` às variáveis de ambiente
- [ ] Testar fluxo completo com cartões de teste
- [ ] Verificar se comissões MLM estão sendo processadas corretamente
