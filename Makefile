.PHONY: dev dev-frontend dev-server install clean help

# Cores para output
BLUE := \033[0;34m
GREEN := \033[0;32m
NC := \033[0m # No Color

help: ## Mostra esta mensagem de ajuda
	@echo "${BLUE}Comandos disponíveis:${NC}"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "${GREEN}%-15s${NC} %s\n", $$1, $$2}'

dev: ## Inicia frontend e backend em paralelo
	@echo "${BLUE}🚀 Iniciando desenvolvimento completo...${NC}"
	@$(MAKE) -j2 dev-frontend dev-server

dev-frontend: ## Inicia apenas o frontend (porta 5173)
	@echo "${BLUE}⚛️  Iniciando frontend...${NC}"
	@cd frontend && npm run dev

dev-server: ## Inicia apenas o backend (porta 5050)
	@echo "${BLUE}🔧 Iniciando backend...${NC}"
	@cd server && npm run dev

install: ## Instala dependências (frontend e backend)
	@echo "${BLUE}📦 Instalando dependências do frontend...${NC}"
	@cd frontend && npm install
	@echo "${BLUE}📦 Instalando dependências do backend...${NC}"
	@cd server && npm install
	@echo "${GREEN}✅ Dependências instaladas!${NC}"

clean: ## Remove node_modules de frontend e backend
	@echo "${BLUE}🧹 Limpando node_modules...${NC}"
	@rm -rf frontend/node_modules
	@rm -rf server/node_modules
	@echo "${GREEN}✅ Limpeza completa!${NC}"

test: ## Roda testes do backend
	@echo "${BLUE}🧪 Executando testes...${NC}"
	@cd server && npm test

build: ## Build do frontend para produção
	@echo "${BLUE}🏗️  Fazendo build do frontend...${NC}"
	@cd frontend && npm run build
	@echo "${GREEN}✅ Build completo!${NC}"
