/**
 * Camada única de acesso ao SDK de IA (@google/genai).
 *
 * Todo o resto do código conversa com este módulo, nunca com o SDK
 * diretamente — trocar de SDK/modelo/provedor acontece só aqui, e os
 * testes mockam este módulo em vez de mockar o SDK.
 *
 * Princípios (Fase 1 da SPEC-ANALISE-IA.md):
 * - Saída estruturada SEMPRE via responseSchema (nada de regex sobre texto
 *   livre — a causa raiz dos bugs de parse da Fase 0).
 * - Temperatura explícita em toda chamada (o default do SDK é alto demais
 *   para tarefa analítica).
 * - Usage (tokens + modelo real) retornado em toda chamada, para o
 *   ApiUsage registrar custo com o modelo verdadeiro.
 */

const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');
const {
  GeminiApiKeyMissingError,
  GeminiParseError,
  GeminiApiError,
  parseGeminiError,
  isTransientError
} = require('../utils/errors');
const { AI_POLICIES } = require('../config/ai');

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('⚠️ GEMINI_API_KEY não configurada. As chamadas de IA retornarão erro até que a variável esteja definida.');
}

const client = apiKey ? new GoogleGenAI({ apiKey }) : null;

function assertAvailable() {
  if (!client) {
    throw new GeminiApiKeyMissingError();
  }
}

const DEFAULT_POLICY = { maxAttempts: 1, baseDelayMs: 0, timeoutMs: 60000 };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Aborta a espera de uma promessa que passou do tempo (spec 009, R6).
 *
 * ⚠️ Limite honesto: isto interrompe **a nossa espera**, não a inferência do
 * outro lado. O SDK não expõe cancelamento aqui, então o provedor pode
 * continuar processando e o custo já ter sido incorrido. O valor real é não
 * pendurar a função serverless até o `maxDuration` e devolver um erro
 * classificável.
 */
async function withTimeout(promise, timeoutMs, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new GeminiApiError(`Timeout de ${timeoutMs}ms em ${label} — a espera foi interrompida`)),
      timeoutMs
    );
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Executa uma chamada de IA com timeout e retry conforme a política do fluxo
 * (spec 009, R5–R7).
 *
 * Só repete o que `isTransientError` classifica como transitório: retry custa
 * outra inferência completa, e repetir quota estourada ou conteúdo bloqueado
 * é queimar o dobro por nada.
 *
 * @param {string} task - chave de AI_POLICIES ('VIDEO_ANALYSIS'|'STRATEGY'|'TEXT'|'CHAT')
 * @param {string} label - identificação para log
 * @param {() => Promise<any>} call - a chamada ao SDK
 */
async function withRetry(task, label, call) {
  const policy = AI_POLICIES[task] || DEFAULT_POLICY;
  let lastError;

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    try {
      return await withTimeout(call(), policy.timeoutMs, label);
    } catch (rawError) {
      const error = parseGeminiError(rawError);
      lastError = error;

      const podeRepetir = attempt < policy.maxAttempts && isTransientError(error);
      if (!podeRepetir) {
        if (attempt > 1) {
          console.error(`❌ ${label}: falhou após ${attempt} tentativa(s) — ${error.message}`);
        }
        throw error;
      }

      // Backoff exponencial simples. Sem jitter: o volume aqui é de uma
      // requisição de usuário por vez, não de um enxame de workers.
      const delay = policy.baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(
        `⚠️ ${label}: falha transitória na tentativa ${attempt}/${policy.maxAttempts} (${error.message}). Repetindo em ${delay}ms.`
      );
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Extrai o usage padronizado de uma resposta do SDK.
 * @param {Object} response - Resposta de generateContent/sendMessage
 * @param {string} modelName - Modelo efetivamente usado
 */
function extractUsage(response, modelName) {
  const meta = response.usageMetadata || {};
  return {
    modelName,
    promptTokens: meta.promptTokenCount || 0,
    completionTokens: meta.candidatesTokenCount || 0,
    totalTokens: meta.totalTokenCount || 0,
  };
}

/**
 * Gera conteúdo com saída JSON estruturada (responseSchema).
 *
 * @param {Object} params
 * @param {string} params.model - Nome do modelo (obrigatório — resolvido pelo chamador via config)
 * @param {string|Array} params.contents - Prompt (string) ou array de parts ({text}, {fileData}, {inlineData})
 * @param {Object} params.schema - responseSchema (formato OpenAPI do Gemini)
 * @param {number} [params.temperature=0.2]
 * @param {string} [params.systemInstruction]
 * @returns {Promise<{data: Object, usage: Object}>}
 * @throws {GeminiParseError} Se a resposta não for JSON válido (raro com schema, mas possível)
 */
async function generateJson({ model, contents, schema, temperature = 0.2, systemInstruction, task }) {
  assertAvailable();

  try {
    const response = await withRetry(task, `generateJson(${model})`, () =>
      client.models.generateContent({
        model,
        contents,
        config: {
          temperature,
          responseMimeType: 'application/json',
          responseSchema: schema,
          ...(systemInstruction ? { systemInstruction } : {}),
        },
      })
    );

    const text = response.text;
    if (!text) {
      throw new GeminiParseError('Resposta vazia da IA (sem candidato de texto)');
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      throw new GeminiParseError(`JSON malformado na resposta da IA: ${parseError.message}`);
    }

    return { data, usage: extractUsage(response, model) };
  } catch (error) {
    if (error instanceof GeminiParseError) throw error;
    throw parseGeminiError(error);
  }
}

/**
 * Gera texto livre (resumos, consolidações).
 * @param {Object} params
 * @param {string} params.model
 * @param {string|Array} params.contents
 * @param {number} [params.temperature=0.4]
 * @param {string} [params.systemInstruction]
 * @returns {Promise<{text: string, usage: Object}>}
 */
async function generateText({ model, contents, temperature = 0.4, systemInstruction, task }) {
  assertAvailable();

  try {
    const response = await withRetry(task, `generateText(${model})`, () =>
      client.models.generateContent({
        model,
        contents,
        config: {
          temperature,
          ...(systemInstruction ? { systemInstruction } : {}),
        },
      })
    );

    return { text: (response.text || '').trim(), usage: extractUsage(response, model) };
  } catch (error) {
    throw parseGeminiError(error);
  }
}

/**
 * Envia uma mensagem em uma conversa multi-turno.
 * @param {Object} params
 * @param {string} params.model
 * @param {string} params.systemInstruction - Instrução de sistema nativa (não mais mensagem 'user' forjada)
 * @param {Array} params.history - [{role: 'user'|'model', parts: [{text}]}]
 * @param {string} params.message - Nova mensagem do usuário
 * @param {number} [params.temperature=0.7]
 * @returns {Promise<{text: string, usage: Object}>}
 */
async function sendChatMessage({ model, systemInstruction, history = [], message, temperature = 0.7, task }) {
  assertAvailable();

  try {
    const response = await withRetry(task, `sendChatMessage(${model})`, () => {
      // A sessão é recriada a cada tentativa de propósito: reusar uma sessão
      // que acabou de falhar arriscaria enviar a mensagem duas vezes no mesmo
      // histórico.
      const chatSession = client.chats.create({
        model,
        history,
        config: {
          temperature,
          ...(systemInstruction ? { systemInstruction } : {}),
        },
      });
      return chatSession.sendMessage({ message });
    });

    return { text: response.text || '', usage: extractUsage(response, model) };
  } catch (error) {
    throw parseGeminiError(error);
  }
}

// ====================================
// FILE API (upload de vídeo)
// ====================================

const FILE_PROCESSING_TIMEOUT_MS = 120000;

/**
 * Aguarda até que o arquivo esteja ACTIVE na File API.
 */
async function waitForFileProcessing(fileName, maxWaitMs = FILE_PROCESSING_TIMEOUT_MS) {
  const startTime = Date.now();
  let pollInterval = 2000;

  console.log('⏳ Aguardando processamento do vídeo na File API...');

  while (Date.now() - startTime < maxWaitMs) {
    const file = await client.files.get({ name: fileName });

    if (file.state === 'ACTIVE') {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ Vídeo pronto para análise (${elapsed}s)`);
      return file;
    }

    if (file.state === 'FAILED') {
      throw new Error(`Processamento do vídeo falhou na File API (${fileName})`);
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
    pollInterval = Math.min(pollInterval + 1000, 5000);
  }

  throw new Error(`Timeout: vídeo não ficou pronto em ${maxWaitMs / 1000}s`);
}

/**
 * Faz upload de um vídeo local para a File API do Gemini.
 * @param {string} filePath - Caminho do arquivo local
 * @param {string} [mimeType='video/mp4']
 * @returns {Promise<{uri: string, name: string, mimeType: string}>}
 */
async function uploadVideo(filePath, mimeType = 'video/mp4') {
  assertAvailable();

  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado para upload: ${filePath}`);
  }

  console.log(`📤 Enviando vídeo para a File API: ${filePath}`);
  const uploaded = await client.files.upload({
    file: filePath,
    config: { mimeType, displayName: 'fight-video' },
  });

  const ready = uploaded.state === 'ACTIVE'
    ? uploaded
    : await waitForFileProcessing(uploaded.name);

  return { uri: ready.uri, name: ready.name, mimeType: ready.mimeType };
}

/**
 * Remove um arquivo da File API (best-effort — nunca lança).
 * @param {string} fileName
 */
async function deleteFile(fileName) {
  if (!client || !fileName) return;
  try {
    await client.files.delete({ name: fileName });
    console.log(`🗑️  Arquivo removido da File API: ${fileName}`);
  } catch (err) {
    console.warn(`⚠️  Não foi possível remover da File API: ${err.message}`);
  }
}

module.exports = {
  generateJson,
  generateText,
  sendChatMessage,
  uploadVideo,
  deleteFile,
};
