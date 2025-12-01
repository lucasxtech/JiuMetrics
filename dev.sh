#!/bin/bash

# Script para facilitar desenvolvimento e deploy
# Usage: ./dev.sh [comando]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🥋 Análise Tática de Jiu-Jitsu"
echo "================================\n"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função de ajuda
help() {
  echo -e "${BLUE}Comandos disponíveis:${NC}"
  echo ""
  echo -e "${GREEN}npm run dev${NC}              - Inicia frontend em modo desenvolvimento"
  echo -e "${GREEN}npm run build${NC}            - Constrói frontend para produção"
  echo -e "${GREEN}npm run preview${NC}          - Visualiza build de produção"
  echo ""
  echo -e "${BLUE}Backend:${NC}"
  echo -e "${GREEN}npm run dev${NC}              - Inicia servidor com auto-reload"
  echo -e "${GREEN}npm run start${NC}            - Inicia servidor em produção"
  echo ""
  echo -e "${BLUE}Scripts rápidos:${NC}"
  echo -e "${GREEN}./dev.sh help${NC}            - Mostra esta mensagem"
  echo -e "${GREEN}./dev.sh install${NC}         - Instala todas as dependências"
  echo -e "${GREEN}./dev.sh both${NC}            - Inicia frontend e backend juntos"
  echo ""
}

# Instalar dependências
install_deps() {
  echo -e "${BLUE}Instalando dependências do frontend...${NC}"
  cd "$SCRIPT_DIR/frontend"
  npm install
  
  echo -e "\n${BLUE}Instalando dependências do backend...${NC}"
  cd "$SCRIPT_DIR/server"
  npm install
  
  echo -e "\n${GREEN}✓ Dependências instaladas com sucesso!${NC}"
}

# Iniciar ambos
start_both() {
  echo -e "${GREEN}Iniciando aplicação...${NC}"
  echo -e "${BLUE}Frontend: http://localhost:5173${NC}"
  echo -e "${BLUE}Backend:  http://localhost:5000${NC}"
  echo ""
  echo -e "${RED}Pressione Ctrl+C para parar${NC}\n"
  
  # Iniciar backend em background
  cd "$SCRIPT_DIR/server"
  npm run dev &
  SERVER_PID=$!
  
  # Aguardar um pouco
  sleep 2
  
  # Iniciar frontend em foreground
  cd "$SCRIPT_DIR/frontend"
  npm run dev
  
  # Cleanup ao sair
  trap "kill $SERVER_PID 2>/dev/null" EXIT
}

# Main
case "$1" in
  help|--help|-h)
    help
    ;;
  install)
    install_deps
    ;;
  both)
    start_both
    ;;
  *)
    help
    ;;
esac
