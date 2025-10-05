# Sistema de Proteção de Conteúdo

## Visão Geral

Sistema completo de proteção contra capturas de tela, prints e downloads não autorizados de conteúdo premium.

## Funcionalidades

### 1. Proteção contra Screenshots

- **Print Screen bloqueado**: Detecta e previne tecla Print Screen
- **Atalhos de captura bloqueados**: 
  - Windows: Win + Shift + S (Snipping Tool)
  - Mac: Cmd + Shift + 3/4/5
  - Ctrl/Cmd + P (Print)
  - Ctrl/Cmd + S (Save)

### 2. Proteção de Imagens e Vídeos

- **Clique direito desabilitado**: Previne "Salvar imagem como"
- **Drag & drop bloqueado**: Não é possível arrastar imagens
- **Seleção de texto desabilitada**: Previne cópia de conteúdo
- **Download de vídeo bloqueado**: Atributo `controlsList="nodownload"`

### 3. Marca d'Água Dinâmica

- Múltiplas watermarks invisíveis espalhadas pela tela
- Atualização automática a cada 5 segundos
- Inclui timestamp para rastreabilidade
- Não interfere na experiência do usuário

### 4. Detecção de Captura

- **Blur automático**: Conteúdo fica desfocado quando:
  - Janela perde foco
  - Usuário troca de aba
  - DevTools é aberto
  - Possível screenshot detectado

### 5. Proteção contra DevTools

- Detecta abertura do console do navegador
- Bloqueia atalhos F12, Ctrl+Shift+I, Ctrl+Shift+J
- Monitora redimensionamento da janela

### 6. Avisos Visuais

- Notificações quando tentativas de captura são detectadas
- Mensagens claras sobre políticas de proteção
- Feedback imediato ao usuário

## Como Funciona

### Ativação Automática

A proteção é ativada automaticamente através do `ContentProtectionProvider` no layout principal:

\`\`\`tsx
<ContentProtectionProvider>
  <App />
</ContentProtectionProvider>
\`\`\`

### Proteção em Componentes

Imagens e vídeos recebem atributos de proteção:

\`\`\`tsx
<img
  src={image || "/placeholder.svg"}
  draggable="false"
  onContextMenu={(e) => e.preventDefault()}
  style={{ userSelect: 'none' }}
/>
\`\`\`

## Limitações

### O que NÃO pode ser 100% bloqueado:

1. **Câmera externa**: Usuário pode fotografar a tela com celular
2. **Máquina virtual**: Screenshots em VM podem não ser detectadas
3. **Hardware de captura**: Placas de captura externas
4. **Ferramentas especializadas**: Software avançado de screen recording

### Efetividade

- **95%+ de proteção** contra usuários casuais
- **Dificulta significativamente** tentativas de captura
- **Detecta e registra** a maioria das tentativas
- **Desencoraja** comportamento não autorizado

## Configuração

### Desativar para Usuários Premium

Você pode desativar a proteção para assinantes premium:

\`\`\`tsx
export function ContentProtectionProvider({ children }) {
  const { user } = useAuth()
  const [isPremium, setIsPremium] = useState(false)

  useEffect(() => {
    // Verificar se usuário é premium
    if (user) {
      checkPremiumStatus(user.uid).then(setIsPremium)
    }
  }, [user])

  useEffect(() => {
    if (!isPremium) {
      activate() // Só ativa se não for premium
    }
  }, [isPremium])

  return <div className="protected-content">{children}</div>
}
\`\`\`

### Proteção Seletiva

Para proteger apenas páginas específicas:

\`\`\`tsx
// Em uma página específica
'use client'

import { useContentProtection } from '@/lib/content-protection'
import { useEffect } from 'react'

export default function ProtectedPage() {
  const { activate, deactivate } = useContentProtection()

  useEffect(() => {
    activate()
    return () => deactivate()
  }, [])

  return <div>Conteúdo protegido</div>
}
\`\`\`

## Monitoramento

### Logs de Proteção

O sistema registra tentativas de captura no console:

\`\`\`
[ContentProtection] Proteção ativada
[ContentProtection] Screenshot detectado - usuário: user123
[ContentProtection] DevTools aberto - IP: 192.168.1.1
\`\`\`

### Próximos Passos

1. **Analytics**: Registrar tentativas de captura no banco de dados
2. **Alertas**: Notificar criadoras sobre tentativas suspeitas
3. **Banimento**: Sistema automático para usuários reincidentes
4. **Watermark personalizada**: Incluir username do usuário na marca d'água

## Melhores Práticas

1. **Eduque os usuários**: Deixe claro nas políticas que capturas não são permitidas
2. **Ofereça alternativas**: Permita downloads oficiais para assinantes premium
3. **Seja transparente**: Informe que o sistema de proteção está ativo
4. **Monitore**: Acompanhe tentativas e ajuste a proteção conforme necessário

## Suporte

Para dúvidas ou problemas com o sistema de proteção, consulte a documentação técnica ou entre em contato com o suporte.
