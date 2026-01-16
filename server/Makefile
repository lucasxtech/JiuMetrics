.PHONY: dev start test clean help

# Cores para output
BLUE := \033[0;34m
GREEN := \033[0;32m
NC := \033[0m # No Color

help: ## Mostra esta mensagem de ajuda
	@echo "${BLUE}Comandos disponíveis para o backend:${NC}"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "${GREEN}%-15s${NC} %s\n", $$1, $$2}'

dev: ## Inicia servidor em modo desenvolvimento (nodemon)
	@echo "${BLUE}🔧 Iniciando servidor backend...${NC}"
	@npm run dev

start: ## Inicia servidor em modo produção
	@echo "${BLUE}🚀 Iniciando servidor em produção...${NC}"
	@npm start

test: ## Roda testes do backend
	@echo "${BLUE}🧪 Executando testes...${NC}"
	@npm test

test-watch: ## Roda testes em modo watch
	@echo "${BLUE}👀 Executando testes em watch mode...${NC}"
	@npm run test:watch

clean: ## Remove node_modules
	@echo "${BLUE}🧹 Removendo node_modules...${NC}"
	@rm -rf node_modules
	@echo "${GREEN}✅ Limpeza completa!${NC}"

install: ## Instala dependências
	@echo "${BLUE}📦 Instalando dependências...${NC}"
	@npm install
	@echo "${GREEN}✅ Dependências instaladas!${NC}"

migrate: ## Roda migrações do banco de dados
	@echo "${BLUE}🗄️  Executando migrações...${NC}"
	@node migrations/run-migrations.js

logs: ## Mostra logs do servidor (se estiver rodando em background)
	@tail -f logs/server.log
