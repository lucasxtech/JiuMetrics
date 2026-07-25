/**
 * Configuração centralizada de IA para o frontend.
 *
 * "Automático" (valor vazio) é o padrão: o backend escolhe o melhor
 * modelo por tarefa (vídeo/estratégia usam o modelo forte, texto/chat o
 * rápido — ver TASK_MODELS em server/src/config/ai.js). Escolher um
 * modelo aqui força TODAS as tarefas a usá-lo.
 */

export const DEFAULT_AI_MODEL = ''; // '' = automático (backend decide por tarefa)

export const AVAILABLE_MODELS = [
  {
    id: '',
    name: 'Automático (recomendado)',
    description: 'O backend escolhe o melhor modelo para cada tarefa'
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro (Preview)',
    description: 'Máxima precisão para análises avançadas'
  },
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro (Preview)',
    description: 'Versão anterior do 3 Pro'
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Forte em vídeo e raciocínio'
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Rápido e econômico'
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash (legado)',
    description: 'Modelo antigo — mantido para comparação'
  }
];

/**
 * Obtém o modelo selecionado do localStorage.
 * Retorna '' (automático) quando o usuário nunca escolheu.
 * @returns {string} ID do modelo selecionado ('' = automático)
 */
export function getSelectedModel() {
  return localStorage.getItem('ai_model') ?? DEFAULT_AI_MODEL;
}

/**
 * Salva o modelo selecionado no localStorage
 * @param {string} modelId - ID do modelo ('' = automático)
 */
export function setSelectedModel(modelId) {
  localStorage.setItem('ai_model', modelId);
}

/**
 * Obtém informações completas do modelo selecionado
 * @returns {Object} Objeto com informações do modelo
 */
export function getSelectedModelInfo() {
  const selectedId = getSelectedModel();
  return AVAILABLE_MODELS.find(m => m.id === selectedId) || AVAILABLE_MODELS[0];
}
