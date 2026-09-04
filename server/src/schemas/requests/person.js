const { z } = require('zod');

/**
 * Schemas de ENTRADA HTTP dos endpoints de atletas e adversários (spec 012).
 *
 * Antes desta spec os quatro endpoints de escrita não tinham schema: o
 * controller fazia `Number(age)` (que vira `NaN` e estoura 500 no Postgres),
 * `Number(cardio) || 50` (que transforma 0 em 50) e fabricava `age: 25`,
 * `weight: 75`, `belt: 'Branca'`, `style: 'Guarda'` quando o campo era
 * omitido — valores que ninguém informou e que a tela de estratégia exibia
 * como fato.
 *
 * Duas decisões deste schema:
 *
 * 1. **Campo omitido é `null`, não default inventado.** A UI mostra
 *    "não informado". A única exceção é `belt` no POST, que é **obrigatória**:
 *    ela alimenta as regras IBJJF (`config/ai.js`), e uma faixa ausente ou
 *    desconhecida DESLIGA a restrição de técnica na geração de estratégia
 *    (`getBeltLevel` devolve 5, o nível de preta). Exigir o enum aqui fecha
 *    essa porta na entrada, em vez de tentar consertá-la na saída.
 *
 * 2. **`technicalSummary` e `technicalProfile` não entram por aqui.** O
 *    `Model.update` os aceita porque os módulos de análise e de chat os gravam
 *    pelo model, mas o cliente HTTP não deve poder escrevê-los: a tela de
 *    detalhe enviava o objeto inteiro de volta ao trocar a faixa, e se a
 *    regeneração em background tivesse terminado nesse meio-tempo, o PUT
 *    gravava o resumo velho por cima do novo. O zod remove os campos não
 *    declarados (`strip`), então a corrida deixa de existir por construção.
 *
 * Payload real do frontend, mapeado antes de escrever isto:
 * `PersonForm` envia `{ name, belt }`; o cadastro rápido em `VideoAnalysis`
 * envia o mesmo. Nenhuma tela coleta os demais campos hoje.
 */

const BELTS = ['Branca', 'Azul', 'Roxa', 'Marrom', 'Preta'];

const beltSchema = z.enum(BELTS, {
  message: `belt deve ser uma de: ${BELTS.join(', ')}`
});

/** `''`, `null` e `undefined` viram `null`; o resto vai para `Number`. */
const numeroOpcional = (schema) =>
  z.preprocess((v) => {
    if (v === '' || v === null || v === undefined) return null;
    if (typeof v === 'string' && v.trim() === '') return null;
    return typeof v === 'number' ? v : Number(v);
  }, schema.nullable());

const textoOpcional = (max) =>
  z.preprocess(
    (v) => (v === undefined || v === null ? null : String(v)),
    z.string().max(max, `deve ter no máximo ${max} caracteres`).nullable()
  );

const camposOpcionais = {
  age: numeroOpcional(z.number().int('age deve ser inteiro').min(4).max(100)),
  weight: numeroOpcional(z.number().min(20).max(250)),
  height: numeroOpcional(z.number().min(100).max(250)),
  cardio: numeroOpcional(z.number().int('cardio deve ser inteiro').min(0).max(100)),
  style: textoOpcional(100),
  strongAttacks: textoOpcional(2000),
  weaknesses: textoOpcional(2000),
  videoUrl: textoOpcional(2000)
};

const nameSchema = z
  .string({ message: 'Nome é obrigatório' })
  .trim()
  .min(1, 'Nome é obrigatório')
  .max(255, 'Nome deve ter no máximo 255 caracteres');

/** POST /api/athletes · POST /api/opponents */
const createPersonSchema = z.object({
  name: nameSchema,
  belt: beltSchema,
  ...camposOpcionais
});

/**
 * PUT /api/athletes/:id · PUT /api/opponents/:id — qualquer subconjunto.
 * Campo ausente não é tocado (o model só escreve o que não é `undefined`).
 */
const updatePersonSchema = z
  .object({
    name: nameSchema,
    belt: beltSchema,
    ...camposOpcionais
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Envie ao menos um campo para atualizar'
  });

module.exports = {
  BELTS,
  createPersonSchema,
  updatePersonSchema
};
