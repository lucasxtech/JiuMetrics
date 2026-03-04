# Componentes Comuns - JiuMetrics

Esta pasta contém componentes reutilizáveis e estilizados para uso em toda a aplicação.

## 📦 Componentes Disponíveis

### ✨ Novos/Atualizados (2026-03-04)

- **Button** - Componente de botão moderno com múltiplas variantes
- **Badge** - Tags/badges modernos com gradientes
- **Card** - Cards com animações e micro-interações
- **LoadingSpinner** - Spinner de loading aprimorado

### 📋 Existentes

- **AthleteCard** - Card especializado para atletas
- **ConfirmDeleteModal** - Modal de confirmação de exclusão
- **CustomSelect** - Select customizado
- **DiffViewer** - Visualizador de diferenças
- **ErrorMessage** - Mensagem de erro
- **FormattedText** - Texto formatado
- **Header** - Cabeçalho da aplicação
- **InlineDiff** - Diff inline
- **Modal** - Modal reutilizável
- **QuickAddModal** - Modal de adição rápida

## 🚀 Uso Rápido

```jsx
import Button from './components/common/Button';
import Badge from './components/common/Badge';
import Card from './components/common/Card';
import LoadingSpinner from './components/common/LoadingSpinner';

function MyComponent() {
  return (
    <Card hover>
      <h2>Título</h2>
      <Badge variant="success">Novo</Badge>
      
      {loading ? (
        <LoadingSpinner text="Carregando..." />
      ) : (
        <Button variant="primary" onClick={handleClick}>
          Salvar
        </Button>
      )}
    </Card>
  );
}
```

## 📚 Documentação Completa

Veja [STYLE_GUIDE.md](../../STYLE_GUIDE.md) para documentação completa de todos os componentes e classes CSS.

## ✅ Padrões

- Todos os componentes são funcionais (React Hooks)
- PropTypes para validação de props
- Classes CSS modulares quando necessário
- Tailwind CSS + CSS personalizado
- Acessibilidade por padrão (a11y)

## 🎨 Design System

### Cores

- **Primary**: Índigo/Roxo (#4f46e5 - #8b5cf6)
- **Success**: Verde (#10b981 - #059669)
- **Warning**: Amarelo/Laranja (#f59e0b - #d97706)
- **Danger**: Vermelho (#ef4444 - #dc2626)
- **Info**: Azul (#3b82f6 - #2563eb)

### Tamanhos

- **sm**: Pequeno
- **md**: Médio (padrão)
- **lg**: Grande
- **xl**: Extra grande

### Animações

Todas as animações usam `cubic-bezier(0.4, 0, 0.2, 1)` para transições suaves e naturais.

## 🔧 Adicionando Novos Componentes

1. Crie o arquivo do componente
2. Use PropTypes para validação
3. Documente props no JSDoc
4. Adicione ao README
5. Teste responsividade
6. Verifique acessibilidade

```jsx
import PropTypes from 'prop-types';

/**
 * Descrição do componente
 * @param {Object} props
 * @param {string} props.variant - Descrição
 */
export default function MyComponent({ variant = 'default' }) {
  return <div>...</div>;
}

MyComponent.propTypes = {
  variant: PropTypes.string,
};
```

---

**Mantido por:** Equipe JiuMetrics  
**Última atualização:** 2026-03-04
