/**
 * Configuração centralizada de IA para o frontend
 */

export const DEFAULT_AI_MODEL = 'gemini-2.0-flash';

export const AVAILABLE_MODELS = [
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro (Preview)',
    description: 'Máxima precisão para análises avançadas',
    maxTokens: 32768
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Equilíbrio entre velocidade e precisão',
    maxTokens: 32768
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Rápido e eficiente (padrão)',
    maxTokens: 8192
  }
];

/**
 * Obtém o modelo selecionado do localStorage ou retorna o padrão
 * @returns {string} ID do modelo selecionado
 */
export function getSelectedModel() {
  return localStorage.getItem('selectedAiModel') || DEFAULT_AI_MODEL;
}

/**
 * Salva o modelo selecionado no localStorage
 * @param {string} modelId - ID do modelo
 */
export function setSelectedModel(modelId) {
  localStorage.setItem('selectedAiModel', modelId);
}

/**
 * Obtém informações completas do modelo selecionado
 * @returns {Object} Objeto com informações do modelo
 */
export function getSelectedModelInfo() {
  const selectedId = getSelectedModel();
  return AVAILABLE_MODELS.find(m => m.id === selectedId) || AVAILABLE_MODELS[0];
}
