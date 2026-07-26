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
const { GeminiApiKeyMissingError, GeminiParseError, parseGeminiError } = require('../utils/errors');

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
async function generateJson({ model, contents, schema, temperature = 0.2, systemInstruction }) {
  assertAvailable();

  try {
    const response = await client.models.generateContent({
      model,
      contents,
      config: {
        temperature,
        responseMimeType: 'application/json',
        responseSchema: schema,
        ...(systemInstruction ? { systemInstruction } : {}),
      },
    });

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
async function generateText({ model, contents, temperature = 0.4, systemInstruction }) {
  assertAvailable();

  try {
    const response = await client.models.generateContent({
      model,
      contents,
      config: {
        temperature,
        ...(systemInstruction ? { systemInstruction } : {}),
      },
    });

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
async function sendChatMessage({ model, systemInstruction, history = [], message, temperature = 0.7 }) {
  assertAvailable();

  try {
    const chatSession = client.chats.create({
      model,
      history,
      config: {
        temperature,
        ...(systemInstruction ? { systemInstruction } : {}),
      },
    });

    const response = await chatSession.sendMessage({ message });
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
