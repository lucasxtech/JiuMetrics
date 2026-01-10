.PHONY: dev build preview test clean install help

# Cores para output
BLUE := \033[0;34m
GREEN := \033[0;32m
NC := \033[0m # No Color

help: ## Mostra esta mensagem de ajuda
	@echo "${BLUE}Comandos disponíveis para o frontend:${NC}"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "${GREEN}%-15s${NC} %s\n", $$1, $$2}'

dev: ## Inicia servidor de desenvolvimento Vite
	@echo "${BLUE}⚛️  Iniciando frontend...${NC}"
	@npm run dev

build: ## Build para produção
	@echo "${BLUE}🏗️  Fazendo build...${NC}"
	@npm run build
	@echo "${GREEN}✅ Build completo!${NC}"

preview: ## Preview do build de produção
	@echo "${BLUE}👀 Preview do build...${NC}"
	@npm run preview

test: ## Roda testes
	@echo "${BLUE}🧪 Executando testes...${NC}"
	@npm test

test-watch: ## Roda testes em modo watch
	@echo "${BLUE}👀 Executando testes em watch mode...${NC}"
	@npm run test:watch

lint: ## Roda linter
	@echo "${BLUE}🔍 Executando linter...${NC}"
	@npm run lint

clean: ## Remove node_modules e dist
	@echo "${BLUE}🧹 Limpando...${NC}"
	@rm -rf node_modules dist
	@echo "${GREEN}✅ Limpeza completa!${NC}"

install: ## Instala dependências
	@echo "${BLUE}📦 Instalando dependências...${NC}"
	@npm install
	@echo "${GREEN}✅ Dependências instaladas!${NC}"
