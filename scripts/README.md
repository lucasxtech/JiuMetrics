# 📜 Scripts de Desenvolvimento

Scripts shell para facilitar o desenvolvimento e execução do projeto.

## 📁 Arquivos

### dev.sh
Script completo com múltiplos comandos para facilitar o desenvolvimento.

**Uso:**
```bash
./scripts/dev.sh [comando]
```

**Comandos disponíveis:**
- `help` - Mostra todos os comandos disponíveis
- `install` - Instala dependências do frontend e backend
- `both` - Inicia frontend e backend simultaneamente

**Exemplos:**
```bash
# Instalar todas as dependências
./scripts/dev.sh install

# Iniciar aplicação completa
./scripts/dev.sh both

# Ver ajuda
./scripts/dev.sh help
```

### start.sh
Script simples para iniciar frontend e backend juntos.

**Uso:**
```bash
./scripts/start.sh
```

**O que faz:**
- Mata processos anteriores (evita conflito de porta)
- Inicia backend na porta 5050
- Inicia frontend na porta 5173
- Exibe URLs de acesso
- Permite parar tudo com Ctrl+C

**URLs:**
- Frontend: http://localhost:5173/JiuMetrics/
- Backend: http://localhost:5050

### startup-info.sh
Script informativo que exibe documentação completa do projeto.

**Uso:**
```bash
./scripts/startup-info.sh
```

**Exibe:**
- Stack tecnológica instalada
- Estrutura do projeto
- Instruções de início
- Páginas disponíveis
- API endpoints
- Componentes principais
- Dados de exemplo
- Próximos passos

## 🚀 Quick Start

```bash
# 1. Dar permissão de execução
chmod +x scripts/*.sh

# 2. Instalar dependências
./scripts/dev.sh install

# 3. Iniciar aplicação
./scripts/start.sh
```

## 📝 Notas

- Scripts otimizados para macOS/Linux
- No Windows, use Git Bash ou WSL
- Ajuste portas em `.env` se necessário
- Scripts param tudo com Ctrl+C
