/**
 * Sistema Multi-Agentes para Análise de Jiu-Jitsu
 * 
 * Arquitetura:
 * - 3 Agentes Especializados (Gemini Vision): Técnico, Tático, Regras IBJJF
 * - 1 Orquestrador (GPT-5): Consolidação e síntese narrativa
 * 
 * Execução paralela para otimização de tempo.
 */

const Orchestrator = require('./Orchestrator');
const TechnicalAgent = require('./TechnicalAgent');
const TacticalAgent = require('./TacticalAgent');
const RulesAgent = require('./RulesAgent');
const AgentBase = require('./AgentBase');

module.exports = {
  Orchestrator,
  TechnicalAgent,
  TacticalAgent,
  RulesAgent,
  AgentBase
};
