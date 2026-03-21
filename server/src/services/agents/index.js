/**
 * Sistema Multi-Agentes para Análise de Jiu-Jitsu
 *
 * Arquitetura:
 * - 3 Agentes de Vídeo (Gemini Vision): Técnico, Tático, Regras IBJJF
 * - 3 Agentes de Estratégia (Gemini Texto): Scout, Gameplan, Regras Tático
 * - Orquestradores (GPT-4): consolidação e síntese final
 *
 * Execução paralela para otimização de tempo.
 */

const Orchestrator = require('./Orchestrator');
const TechnicalAgent = require('./TechnicalAgent');
const TacticalAgent = require('./TacticalAgent');
const RulesAgent = require('./RulesAgent');
const AgentBase = require('./AgentBase');

// Agentes de estratégia tática (texto puro, sem visão)
const {
  StrategyAgentBase,
  ScoutAgent,
  GameplanAgent,
  StrategyRulesAgent,
  StrategyOrchestrator,
} = require('./strategy');

module.exports = {
  // Análise de vídeo
  Orchestrator,
  TechnicalAgent,
  TacticalAgent,
  RulesAgent,
  AgentBase,
  // Estratégia tática
  StrategyAgentBase,
  ScoutAgent,
  GameplanAgent,
  StrategyRulesAgent,
  StrategyOrchestrator,
};

