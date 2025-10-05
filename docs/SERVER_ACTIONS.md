# Server Actions - Documentação

## O que são Server Actions?

Server Actions são funções que rodam **no servidor** (não no navegador do usuário). Isso melhora drasticamente a segurança da plataforma porque:

1. **Código sensível não fica exposto** - Usuários não podem ver ou manipular a lógica no navegador
2. **Validação server-side** - Dados são validados no servidor antes de serem salvos
3. **Proteção contra manipulação** - Impossível burlar regras de negócio via console do navegador
4. **Melhor performance** - Operações pesadas rodam no servidor

## Estrutura Implementada

### 1. Validações (lib/validations.ts)

Schemas de validação usando Zod para garantir que os dados estão corretos:

- `createPostSchema` - Valida criação de posts
- `createCommentSchema` - Valida comentários
- `toggleLikeSchema` - Valida curtidas
- `createSubscriptionSchema` - Valida assinaturas (preparado para futuro)

**Exemplo de validação:**
\`\`\`typescript
const createPostSchema = z.object({
  content: z.string().min(1).max(5000),
  mediaUrls: z.array(z.string().url()).max(10).optional(),
  visibility: z.enum(["public", "subscribers", "premium"]),
})
\`\`\`

### 2. Server Actions (app/actions/)

Funções que rodam no servidor e fazem as operações críticas:

#### app/actions/posts.ts
- `createPostAction` - Cria posts com validação completa
  - Valida dados de entrada
  - Verifica se usuário está logado
  - Confirma que usuário é criadora
  - Cria o post no Firebase
  - Revalida cache do Next.js

#### app/actions/comments.ts
- `createCommentAction` - Adiciona comentários com segurança
  - Valida conteúdo do comentário
  - Verifica autenticação
  - Adiciona comentário ao Firebase
  - Retorna XP ganho

#### app/actions/likes.ts
- `toggleLikeAction` - Gerencia curtidas de forma segura
  - Valida ID do post
  - Verifica permissões do usuário
  - Adiciona/remove curtida
  - Retorna XP ganho

### 3. Componentes Atualizados

Os seguintes componentes agora usam Server Actions ao invés de chamar Firebase diretamente:

- `components/comment-modal.tsx` - Usa `createCommentAction`
- `components/post-card.tsx` - Usa `toggleLikeAction`
- `components/creator-post-composer.tsx` - Usa `createPostAction`

## Como Funciona

### Antes (Inseguro):
\`\`\`typescript
// Cliente chama Firebase diretamente
const handleLike = async () => {
  await toggleLike(userId, postId) // Qualquer um pode manipular isso
}
\`\`\`

### Depois (Seguro):
\`\`\`typescript
// Cliente chama Server Action
const handleLike = async () => {
  const result = await toggleLikeAction({ postId })
  // Validação e lógica acontecem no servidor
  if (!result.success) {
    console.error(result.error)
  }
}
\`\`\`

## Benefícios Implementados

### Segurança
- Validação de dados no servidor
- Verificação de autenticação obrigatória
- Verificação de permissões (ex: só criadoras podem postar)
- Proteção contra manipulação de dados

### Performance
- Cache automático do Next.js
- Revalidação inteligente de páginas
- Menos código no cliente

### Experiência do Usuário
- Mensagens de erro claras
- Feedback de XP ganho
- Validação em tempo real

## Próximos Passos

### Operações que ainda precisam de Server Actions:

1. **Assinaturas** - Criar `createSubscriptionAction` quando integrar pagamento
2. **Retweets** - Mover `toggleRetweet` para Server Action
3. **Perfil** - Atualização de perfil via Server Action
4. **Upload de mídia** - Validar e processar uploads no servidor
5. **Notificações** - Criar/marcar como lida via Server Action

### Rate Limiting (Futuro)

Adicionar proteção contra spam:
\`\`\`typescript
// Exemplo de rate limiting
const rateLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60000, // 1 minuto
})
\`\`\`

## Testando

Para testar se as Server Actions estão funcionando:

1. Abra o console do navegador
2. Tente criar um post/comentário/curtida
3. Verifique que não há chamadas diretas ao Firebase
4. Todas as operações devem passar por `/api` ou Server Actions

## Segurança Adicional Recomendada

- [ ] Adicionar rate limiting
- [ ] Implementar CSRF protection
- [ ] Adicionar logs de auditoria
- [ ] Implementar sanitização de HTML
- [ ] Adicionar validação de tamanho de arquivos
- [ ] Implementar detecção de conteúdo malicioso
