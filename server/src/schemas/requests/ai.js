const { z } = require('zod');

/**
 * Schemas de ENTRADA HTTP dos endpoints de IA (spec 007, item 4).
 *
 * ⚠️ Não confundir com os outros arquivos de `schemas/`: `videoAnalysis.js` e
 * `strategy.js` são `responseSchema` do Gemini — contrato de **saída** da IA.
 * Estes são contrato de **entrada** da API.
 *
 * Por que começar pelos endpoints de IA: são os únicos onde um corpo não
 * validado custa **dinheiro**. Os demais endpoints que recebem corpo seguem
 * sem schema — pendência declarada na spec, não esquecida.
 *
 * Os schemas são deliberadamente **permissivos** nos campos opcionais. O
 * payload real do frontend foi mapeado antes de escrevê-los
 * (`components/video/VideoAnalysis.jsx` + `services/videoAnalysisService.js`):
 * a UI garante `personId` não vazio e envia `matchResult`/`belt` como
 * `undefined` quando ausentes. Um schema estrito demais quebraria a tela, que
 * é o risco que a própria spec aponta.
 */

/**
 * Teto de vídeos por análise (R8 da spec 007).
 *
 * Cada vídeo é UMA chamada de IA paga, num laço sem limite: `analyzeLink`
 * iterava `videos[]` inteiro, então um corpo com 500 URLs eram 500 chamadas.
 * 5 é folgado em relação ao que a UI consegue produzir hoje — ela envia 1,
 * porque o botão "adicionar vídeo" não está ligado (dívida da spec 010).
 * Quota por usuário/tenant é escopo da spec 009; isto aqui é só o teto por
 * requisição.
 */
const MAX_VIDEOS_POR_ANALISE = 5;

const textoOpcional = (max) =>
  z.string().max(max, `deve ter no máximo ${max} caracteres`).optional().nullable();

const personTypeSchema = z.enum(['athlete', 'opponent'], {
  message: 'personType deve ser "athlete" ou "opponent"'
});

/** POST /api/ai/analyze-link */
const analyzeLinkSchema = z.object({
  videos: z
    .array(
      z.object({
        url: z.string().min(1, 'URL do vídeo é obrigatória').max(2000),
        giColor: textoOpcional(50)
      })
    )
    .min(1, 'Envie ao menos 1 vídeo')
    .max(
      MAX_VIDEOS_POR_ANALISE,
      `Máximo de ${MAX_VIDEOS_POR_ANALISE} vídeos por análise — cada vídeo é uma chamada de IA paga`
    ),
  athleteName: textoOpcional(200),
  personId: textoOpcional(100),
  personType: personTypeSchema.optional().nullable(),
  model: textoOpcional(100),
  matchResult: textoOpcional(500),
  belt: textoOpcional(50)
});

/**
 * POST /api/ai/athlete-summary
 *
 * O contrato mudou na spec 006 (AZ-7): recebia `athleteData` inteiro, que ia
 * direto ao prompt. O schema torna a rejeição do formato antigo estrutural —
 * `athleteData` é campo não declarado, então é removido antes do controller.
 */
const athleteSummarySchema = z.object({
  athleteId: z.string().min(1, 'athleteId é obrigatório').max(100),
  model: textoOpcional(100)
});

/** POST /api/ai/consolidate-profile */
const consolidateProfileSchema = z.object({
  personId: z.string().min(1, 'personId é obrigatório').max(100),
  personType: personTypeSchema,
  model: textoOpcional(100)
});

module.exports = {
  MAX_VIDEOS_POR_ANALISE,
  analyzeLinkSchema,
  athleteSummarySchema,
  consolidateProfileSchema
};
