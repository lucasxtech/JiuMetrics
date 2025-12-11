#!/bin/bash

# Mata processos anteriores
pkill -f "node.*index.js"
pkill -f "vite"

echo "🥋 Iniciando JiuMetrics..."

# Inicia o backend
cd "/Users/lucasmenezes/Downloads/js-curso-2-aula1/projeto analise atletas/server"
npm start &
BACKEND_PID=$!
echo "✅ Backend iniciado (PID: $BACKEND_PID)"

# Aguarda o backend iniciar
sleep 3

# Inicia o frontend
cd "/Users/lucasmenezes/Downloads/js-curso-2-aula1/projeto analise atletas/frontend"
npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend iniciado (PID: $FRONTEND_PID)"

echo ""
echo "================================"
echo "🌐 Frontend: http://localhost:5173/JiuMetrics/"
echo "🔧 Backend:  http://localhost:5050"
echo "================================"
echo ""
echo "Pressione Ctrl+C para parar tudo"

# Aguarda sinais de término
trap "echo ''; echo '🛑 Parando servidores...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

# Mantém o script rodando
wait
