/**
 * Configuração centralizada de IA para o frontend
 */

export const DEFAULT_AI_MODEL = 'gemini-2.0-flash';

export const AVAILABLE_MODELS = [
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Mais rápido, ideal para análises frequentes',
    maxTokens: 8192
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: 'Mais preciso, ideal para análises complexas',
    maxTokens: 32768
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    description: 'Equilíbrio entre velocidade e precisão',
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
