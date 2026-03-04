# Guia de Estilização - JiuMetrics

Este documento descreve as melhorias de estilização implementadas no projeto e como utilizá-las.

## 📋 Índice

- [Componentes Reutilizáveis](#componentes-reutilizáveis)
- [Classes CSS Utilitárias](#classes-css-utilitárias)
- [Animações](#animações)
- [Cores e Gradientes](#cores-e-gradientes)
- [Micro-interações](#micro-interações)

---

## 🎨 Componentes Reutilizáveis

### Button

Componente de botão moderno com múltiplas variantes e estados.

```jsx
import Button from './components/common/Button';

// Uso básico
<Button variant="primary">Salvar</Button>

// Com ícone
<Button variant="success" icon={<CheckIcon />}>
  Confirmar
</Button>

// Com loading
<Button variant="primary" loading={isLoading}>
  Processar
</Button>

// Tamanhos
<Button size="sm">Pequeno</Button>
<Button size="md">Médio</Button>
<Button size="lg">Grande</Button>

// Variantes
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="success">Success</Button>
<Button variant="danger">Danger</Button>
<Button variant="warning">Warning</Button>
<Button variant="ghost">Ghost</Button>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost'
- `size`: 'sm' | 'md' | 'lg'
- `loading`: boolean
- `disabled`: boolean
- `icon`: ReactNode
- `type`: 'button' | 'submit' | 'reset'
- `onClick`: Function

---

### Badge

Componente de badge/tag moderno para destacar informações.

```jsx
import Badge from './components/common/Badge';

// Uso básico
<Badge variant="primary">Novo</Badge>

// Com ícone
<Badge variant="success" icon={<StarIcon />}>
  Destacado
</Badge>

// Variantes
<Badge variant="primary">Primary</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="danger">Danger</Badge>
<Badge variant="info">Info</Badge>
<Badge variant="neutral">Neutral</Badge>
```

**Props:**
- `variant`: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
- `icon`: ReactNode
- `className`: string

---

### Card

Componente de card moderno com gradiente animado no hover.

```jsx
import Card, { CardHeader, CardBody, CardFooter } from './components/common/Card';

// Card básico
<Card>
  <h3>Título</h3>
  <p>Conteúdo</p>
</Card>

// Card com seções
<Card hover>
  <CardHeader>
    <h3>Cabeçalho</h3>
  </CardHeader>
  <CardBody>
    <p>Conteúdo principal</p>
  </CardBody>
  <CardFooter>
    <button>Ação</button>
  </CardFooter>
</Card>

// Card clicável
<Card onClick={() => navigate('/detalhes')} hover>
  <p>Clique para ver detalhes</p>
</Card>
```

**Props:**
- `hover`: boolean (adiciona efeito lift ao hover)
- `onClick`: Function (torna o card clicável)
- `gradient`: boolean (mostrar gradiente animado no topo)
- `className`: string

---

### LoadingSpinner

Spinner moderno com animação dupla e texto opcional.

```jsx
import LoadingSpinner from './components/common/LoadingSpinner';

// Uso básico
<LoadingSpinner />

// Com texto
<LoadingSpinner text="Carregando dados..." />

// Tamanhos
<LoadingSpinner size="sm" />
<LoadingSpinner size="md" />
<LoadingSpinner size="lg" />
<LoadingSpinner size="xl" />
```

**Props:**
- `size`: 'sm' | 'md' | 'lg' | 'xl'
- `text`: string

---

## 🎯 Classes CSS Utilitárias

### Botões

Classes globais para botões padronizados:

```html
<!-- Botões básicos -->
<button class="btn btn-primary">Primary</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-success">Success</button>
<button class="btn btn-danger">Danger</button>
<button class="btn btn-warning">Warning</button>
<button class="btn btn-ghost">Ghost</button>

<!-- Tamanhos -->
<button class="btn btn-primary btn-sm">Pequeno</button>
<button class="btn btn-primary btn-lg">Grande</button>
```

### Badges

```html
<span class="badge-modern badge-primary">Primary</span>
<span class="badge-modern badge-success">Success</span>
<span class="badge-modern badge-warning">Warning</span>
<span class="badge-modern badge-danger">Danger</span>
<span class="badge-modern badge-info">Info</span>
<span class="badge-modern badge-neutral">Neutral</span>
```

### Cards

```html
<div class="card-modern">
  Conteúdo do card
</div>

<!-- Sem gradiente animado -->
<div class="card-modern no-gradient">
  Conteúdo
</div>
```

### Upload Zone

```html
<div class="upload-zone">
  Arraste arquivos aqui
</div>

<!-- Estado dragging (adicione via JS) -->
<div class="upload-zone dragging">
  Solte aqui
</div>
```

### Stat Card

```html
<div class="stat-card">
  <div class="text-sm text-slate-600">Total</div>
  <div class="text-3xl font-bold">42</div>
</div>
```

---

## 🎬 Animações

### Classes de Animação

```html
<!-- Fade in -->
<div class="animate-fadeIn">Conteúdo</div>

<!-- Slide in -->
<div class="animate-slideIn">Conteúdo</div>

<!-- Scale in -->
<div class="animate-scaleIn">Conteúdo</div>

<!-- Slide up -->
<div class="animate-slideUp">Conteúdo</div>

<!-- Slide from right -->
<div class="animate-slideInRight">Conteúdo</div>

<!-- Fade and scale -->
<div class="animate-fadeInScale">Conteúdo</div>

<!-- Bounce sutil -->
<div class="animate-bounce">Conteúdo</div>

<!-- Shimmer (skeleton loading) -->
<div class="animate-shimmer h-8 rounded"></div>
```

---

## 🌈 Cores e Gradientes

### Gradientes de Texto

```html
<h1 class="text-gradient-primary">Título com gradiente</h1>
<h2 class="text-gradient-blue">Subtítulo azul</h2>
<h3 class="text-gradient-orange">Texto laranja</h3>
<h4 class="text-gradient-green">Texto verde</h4>
<h5 class="text-gradient-purple">Texto roxo</h5>
```

### Backgrounds com Gradiente

```html
<div class="bg-gradient-primary p-4 rounded-lg">
  Conteúdo com fundo gradiente
</div>

<div class="bg-gradient-blue p-4 rounded-lg">Azul</div>
<div class="bg-gradient-orange p-4 rounded-lg">Laranja</div>
<div class="bg-gradient-green p-4 rounded-lg">Verde</div>
<div class="bg-gradient-purple p-4 rounded-lg">Roxo</div>
```

### Efeitos de Brilho (Glow)

```html
<div class="glow-primary p-4 rounded-lg">
  Box com glow azul
</div>

<div class="glow-blue">Glow azul</div>
<div class="glow-green">Glow verde</div>
<div class="glow-orange">Glow laranja</div>
```

---

## ✨ Micro-interações

### Classes de Hover

```html
<!-- Lift ao hover -->
<div class="hover-lift">
  Elemento que sobe ao passar o mouse
</div>

<!-- Scale ao hover -->
<div class="hover-scale">
  Elemento que aumenta ao passar o mouse
</div>

<!-- Glow ao hover -->
<div class="hover-glow">
  Elemento com sombra ao passar o mouse
</div>
```

### Exemplos Combinados

```html
<!-- Card interativo completo -->
<div class="card-modern hover-lift">
  <h3 class="text-gradient-primary">Título</h3>
  <p>Descrição do card</p>
  <button class="btn btn-primary btn-sm">Ver mais</button>
</div>

<!-- Badge animado -->
<span class="badge-modern badge-success animate-fadeIn">
  Novo
</span>

<!-- Botão com ícone -->
<button class="btn btn-primary hover-lift">
  <svg>...</svg>
  <span>Salvar</span>
</button>
```

---

## 🎨 Paleta de Cores Tailwind Estendida

O projeto agora inclui paletas completas para as cores principais:

```js
// primary (roxo)
primary-50 até primary-900

// secondary (índigo)
secondary-50 até secondary-900

// accent (laranja)
accent-50 até accent-900
```

Uso no Tailwind:

```html
<div class="bg-primary-500 text-white">Fundo primário</div>
<div class="bg-secondary-600 text-white">Fundo secundário</div>
<div class="bg-accent-500 text-white">Fundo accent</div>
```

---

## 🚀 Melhores Práticas

### 1. Consistência

Use sempre os componentes reutilizáveis quando disponíveis:

```jsx
// ✅ BOM
<Button variant="primary" onClick={handleSave}>Salvar</Button>

// ❌ EVITAR
<button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={handleSave}>
  Salvar
</button>
```

### 2. Acessibilidade

Todos os componentes incluem suporte para navegação por teclado e foco visível.

### 3. Performance

Animações usam `transform` e `opacity` para melhor performance (GPU-accelerated).

### 4. Responsividade

Todos os estilos são mobile-first e responsivos por padrão.

---

## 📦 Estrutura de Arquivos

```
frontend/src/
├── components/
│   └── common/
│       ├── Button.jsx          # ✨ Novo
│       ├── Badge.jsx           # ✨ Atualizado
│       ├── Card.jsx            # ✨ Novo
│       ├── LoadingSpinner.jsx  # ✨ Atualizado
│       └── Modal.jsx           # ✨ Atualizado
├── index.css                   # ✨ Muito melhorado
└── tailwind.config.js          # ✨ Estendido
```

---

## 🔧 Customização

### Modificar Cores

Edite `tailwind.config.js`:

```js
theme: {
  extend: {
    colors: {
      primary: {
        // Sua paleta personalizada
      }
    }
  }
}
```

### Adicionar Nova Variante de Botão

Edite `index.css`:

```css
.btn-custom {
  background: linear-gradient(135deg, #color1, #color2);
  color: white;
  /* ... */
}
```

---

## 📚 Recursos Adicionais

- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [CSS Animations Guide](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations)
- [Web Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Última atualização:** 2026-03-04
