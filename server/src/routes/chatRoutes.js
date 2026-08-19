// Rotas para Chat de IA
//
// Os handlers vinham de um único `chatController.js` de 818 linhas, dividido
// pela spec 006 em quatro módulos por subdomínio. As URLs e a ordem de
// registro são idênticas às de antes — o split não muda contrato de API.
const express = require('express');
const router = express.Router();
const chatSessionController = require('../controllers/chatSessionController');
const chatAnalysisController = require('../controllers/chatAnalysisController');
const chatProfileController = require('../controllers/chatProfileController');
const chatStrategyController = require('../controllers/chatStrategyController');
const authMiddleware = require('../middleware/auth');
const { chatLimiter } = require('../middleware/rateLimiter');

// Rate limiting antes da autenticação
router.use(chatLimiter);
router.use(authMiddleware);

// Aplica rate limiting a todas as rotas de chat
router.use(chatLimiter);

// ====================================
// SESSÕES DE CHAT
// ====================================

// Criar nova sessão de chat
router.post('/session', chatSessionController.createSession);

// Buscar sessão por ID
router.get('/session/:id', chatSessionController.getSession);

// Listar sessões por contexto (análise ou estratégia)
router.get('/sessions/:contextType/:contextId', chatSessionController.getSessionsByContext);

// Deletar sessão
router.delete('/session/:id', chatSessionController.deleteSession);

// ====================================
// MENSAGENS
// ====================================

// Enviar mensagem e receber resposta da IA
router.post('/send', chatSessionController.sendMessage);

// ====================================
// EDIÇÕES
// ====================================

// Aplicar sugestão de edição da IA
router.post('/apply-edit', chatAnalysisController.applyEdit);

// Salvar edição manual do usuário
router.post('/manual-edit', chatAnalysisController.manualEdit);

// ====================================
// VERSÕES/HISTÓRICO
// ====================================

// Buscar histórico de versões de uma análise
router.get('/versions/:analysisId', chatAnalysisController.getVersions);

// Restaurar versão específica
router.post('/restore-version', chatAnalysisController.restoreVersion);

// ====================================
// CHAT DE PERFIL TÉCNICO
// ====================================

// Criar sessão de chat para perfil técnico
router.post('/profile-session', chatProfileController.createProfileSession);

// Enviar mensagem no chat de perfil
router.post('/profile-send', chatProfileController.sendProfileMessage);

// Salvar resumo técnico editado
router.post('/profile-save', chatProfileController.saveProfileSummary);

// Buscar histórico de versões do perfil
router.get('/profile-versions/:personType/:personId', chatProfileController.getProfileVersions);

// Restaurar versão do perfil
router.post('/profile-restore', chatProfileController.restoreProfileVersion);

// ====================================
// CHAT DE ESTRATÉGIA
// ====================================

// Criar sessão de chat para refinar estratégia
router.post('/strategy-session', chatStrategyController.createStrategySession);

// Enviar mensagem no chat de estratégia
router.post('/strategy-send', chatStrategyController.sendStrategyMessage);

module.exports = router;
