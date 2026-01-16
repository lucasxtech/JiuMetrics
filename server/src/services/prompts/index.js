/**
 * Carregador de prompts a partir de arquivos externos
 */

const fs = require('fs');
const path = require('path');

const PROMPTS_DIR = __dirname;

/**
 * Cache para prompts já carregados
 */
const promptCache = new Map();

/**
 * Carrega um prompt a partir de um arquivo .txt
 * @param {string} name - Nome do arquivo (sem extensão)
 * @returns {string} Conteúdo do prompt
 */
function loadPrompt(name) {
  if (promptCache.has(name)) {
    return promptCache.get(name);
  }

  const filePath = path.join(PROMPTS_DIR, `${name}.txt`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Prompt "${name}" não encontrado em ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  promptCache.set(name, content);
  
  return content;
}

/**
 * Substitui placeholders no prompt por valores reais
 * @param {string} prompt - Template do prompt com {{PLACEHOLDER}}
 * @param {Object} variables - Objeto com chave=placeholder, valor=substituição
 * @returns {string} Prompt com substituições aplicadas
 */
function fillPrompt(prompt, variables = {}) {
  let result = prompt;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    const replacement = value !== undefined && value !== null ? String(value) : '';
    result = result.split(placeholder).join(replacement);
  }
  
  return result;
}

/**
 * Carrega e preenche um prompt em uma única operação
 * @param {string} name - Nome do arquivo do prompt
 * @param {Object} variables - Variáveis para substituição
 * @returns {string} Prompt preenchido
 */
function getPrompt(name, variables = {}) {
  const template = loadPrompt(name);
  return fillPrompt(template, variables);
}

/**
 * Limpa o cache de prompts (útil para desenvolvimento)
 */
function clearCache() {
  promptCache.clear();
}

/**
 * Lista todos os prompts disponíveis
 * @returns {string[]} Array com nomes dos prompts
 */
function listPrompts() {
  const files = fs.readdirSync(PROMPTS_DIR);
  return files
    .filter(f => f.endsWith('.txt'))
    .map(f => f.replace('.txt', ''));
}

module.exports = {
  loadPrompt,
  fillPrompt,
  getPrompt,
  clearCache,
  listPrompts
};
