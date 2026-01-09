// Rotas para Chat de IA
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/auth');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// ====================================
// SESSÕES DE CHAT
// ====================================

// Criar nova sessão de chat
router.post('/session', chatController.createSession);

// Buscar sessão por ID
router.get('/session/:id', chatController.getSession);

// Listar sessões por contexto (análise ou estratégia)
router.get('/sessions/:contextType/:contextId', chatController.getSessionsByContext);

// Deletar sessão
router.delete('/session/:id', chatController.deleteSession);

// ====================================
// MENSAGENS
// ====================================

// Enviar mensagem e receber resposta da IA
router.post('/send', chatController.sendMessage);

// ====================================
// EDIÇÕES
// ====================================

// Aplicar sugestão de edição da IA
router.post('/apply-edit', chatController.applyEdit);

// Salvar edição manual do usuário
router.post('/manual-edit', chatController.manualEdit);

// ====================================
// VERSÕES/HISTÓRICO
// ====================================

// Buscar histórico de versões de uma análise
router.get('/versions/:analysisId', chatController.getVersions);

// Restaurar versão específica
router.post('/restore-version', chatController.restoreVersion);

// ====================================
// CHAT DE PERFIL TÉCNICO
// ====================================

// Criar sessão de chat para perfil técnico
router.post('/profile-session', chatController.createProfileSession);

// Enviar mensagem no chat de perfil
router.post('/profile-send', chatController.sendProfileMessage);

// Salvar resumo técnico editado
router.post('/profile-save', chatController.saveProfileSummary);

// Buscar histórico de versões do perfil
router.get('/profile-versions/:personType/:personId', chatController.getProfileVersions);

// Restaurar versão do perfil
router.post('/profile-restore', chatController.restoreProfileVersion);

// ====================================
// CHAT DE ESTRATÉGIA
// ====================================

// Criar sessão de chat para refinar estratégia
router.post('/strategy-session', chatController.createStrategySession);

// Enviar mensagem no chat de estratégia
router.post('/strategy-send', chatController.sendStrategyMessage);

module.exports = router;
