#!/usr/bin/env node
/**
 * Vínculo conta ↔ ficha e perfil dos usuários atuais — Spec 014, R-09.
 *
 * POR QUE ISTO EXISTE
 *
 * Os ~25 usuários de produção são majoritariamente atletas que criaram a
 * própria ficha (`athletes`). A migration 025 acrescentou `users.profile`
 * (default `atleta`) e `athletes.account_user_id` — mas não popula nenhum
 * dos dois: são colunas aditivas, sem UPDATE, porque o CLAUDE.md proíbe
 * migration que altera dado de usuário existente sem revisão humana linha a
 * linha (ver a `018` que zerou todos os admins por faltar `WHERE`).
 *
 * Este script NÃO é uma migration e não roda em CI. Ele só PROPÕE o vínculo
 * (heurística por nome, dry-run, imprime uma tabela) e só APLICA o que o
 * dono do projeto revisar e escrever num arquivo de decisões — nunca decide
 * por conta própria qual ficha pertence a qual conta.
 *
 *   node scripts/link-accounts.js                              # dry-run
 *   node scripts/link-accounts.js --apply .ai/decisoes.json     # aplica
 *
 * Formato do arquivo de decisões:
 *   { "<userId>": { "athleteId": "<uuid>"|null, "profile": "atleta"|"professor"|... } }
 *
 * Precisa de SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente (as mesmas
 * que a API usa). Rode a partir de `server/`.
 */

require('dotenv').config();

const fs = require('fs');

// Declarado localmente, não importado de `services/authorization.js` — este
// script não pode arrastar o cliente Supabase (e o boot que ele exige) só
// para carregar uma constante. O literal precisa continuar IGUAL ao de
// `services/authorization.js#PROFILES`.
const PROFILES = ['atleta', 'professor', 'nutricionista', 'fisioterapeuta', 'preparador_fisico'];

// Normaliza para comparar nome da conta com nome da ficha ignorando acento e
// caixa ("Mica" === "mica", "José" === "jose").
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

/**
 * Propõe, para cada usuário, qual ficha de `athletes` é provavelmente a dele.
 * Pura — não toca rede nem banco, por isso é testável sem fake de PostgREST.
 *
 * @param {Array<{id: string, name: string, email: string}>} users
 * @param {Array<{id: string, user_id: string, name: string, account_user_id: string|null}>} athletes
 * @returns {Array<{userId: string, email: string, name: string, candidates: string[], proposal: string|null, reason: string}>}
 */
function proposeLinks(users, athletes) {
  return users.map((u) => {
    const mine = athletes.filter((a) => a.user_id === u.id);
    const sameName = mine.filter((a) => norm(a.name) === norm(u.name));
    let proposal = null;
    let reason = '';
    if (!mine.length) {
      reason = 'sem ficha';
    } else if (sameName.length === 1) {
      proposal = sameName[0].id;
      reason = 'única ficha com o mesmo nome';
    } else if (mine.length === 1) {
      proposal = mine[0].id;
      reason = 'única ficha da conta (nome diferente — confira)';
    } else {
      reason = `${mine.length} fichas, nenhuma/ambíguas pelo nome`;
    }
    return {
      userId: u.id,
      email: u.email,
      name: u.name,
      candidates: mine.map((a) => `${a.id}:${a.name}`),
      proposal,
      reason,
    };
  });
}

/**
 * Aplica só as decisões explicitamente listadas em `decisions`. Nunca toca
 * uma conta que não apareça no arquivo, e recusa (sem escrever nada) uma
 * ficha já vinculada a outra conta.
 *
 * @param {object} supabase - cliente PostgREST (produção ou fake de teste)
 * @param {Object<string, {athleteId?: string|null, profile?: string}>} decisions
 * @returns {Promise<{applied: number, skipped: Array<{userId: string, reason: string}>}>}
 */
async function applyDecisions(supabase, decisions) {
  let applied = 0;
  const skipped = [];
  for (const [userId, d] of Object.entries(decisions)) {
    if (d.profile && !PROFILES.includes(d.profile)) {
      skipped.push({ userId, reason: `perfil inválido ${d.profile}` });
      continue;
    }
    // Rastreia se a escrita de `athletes` já aconteceu — as duas escritas
    // deste laço (ficha, depois perfil) não são atômicas (não há transação
    // via PostgREST). Se a segunda falhar depois que a primeira já gravou,
    // isso precisa aparecer como aplicação PARCIAL, não como "nada mudou"
    // (revisão T11, achado 1).
    let athleteLinked = false;
    if (d.athleteId) {
      const { data, error } = await supabase.from('athletes').select('id, account_user_id').eq('id', d.athleteId).single();
      // H1: distingue "não encontrada" (`PGRST116`, ou nenhum erro mas sem
      // linha) de qualquer outro erro de leitura — um erro de rede/RLS não é
      // a mesma coisa que uma ficha inexistente, e reportar os dois com a
      // mesma frase escondia qual dos dois aconteceu.
      if (error && error.code !== 'PGRST116') {
        skipped.push({ userId, reason: `erro ao ler ficha ${d.athleteId}: ${error.message}` });
        continue;
      }
      if (!data) {
        skipped.push({ userId, reason: `ficha ${d.athleteId} não encontrada` });
        continue;
      }
      if (data.account_user_id && data.account_user_id !== userId) {
        skipped.push({ userId, reason: `ficha ${d.athleteId} já vinculada a ${data.account_user_id}` });
        continue;
      }
      const up = await supabase.from('athletes').update({ account_user_id: userId }).eq('id', d.athleteId);
      if (up.error) {
        skipped.push({ userId, reason: up.error.message });
        continue;
      }
      athleteLinked = true;
    }
    if (d.profile) {
      const up = await supabase.from('users').update({ profile: d.profile }).eq('id', userId);
      if (up.error) {
        skipped.push({
          userId,
          reason: athleteLinked
            ? `parcial: ficha vinculada, perfil não aplicado — ${up.error.message}`
            : up.error.message,
        });
        continue;
      }
    }
    applied += 1;
  }
  return { applied, skipped };
}

const USO = 'Uso: node scripts/link-accounts.js [--apply <arquivo.json>]';

async function main() {
  // `config/supabase` lança no `require` sem SUPABASE_SERVICE_ROLE_KEY (spec
  // 008) — mantido dentro de `main()` para que carregar este módulo em teste
  // (sem as variáveis de ambiente da API) nunca toque o banco.
  const { supabase } = require('../src/config/supabase');
  const applyIdx = process.argv.indexOf('--apply');

  if (applyIdx !== -1) {
    // H2: `--apply` sem nome de arquivo (ou com um arquivo que não existe)
    // dava `TypeError` de `fs.readFileSync(undefined, ...)` — mensagem de
    // uso e saída limpa em vez disso.
    const decisionsPath = process.argv[applyIdx + 1];
    if (!decisionsPath || !fs.existsSync(decisionsPath)) {
      console.error(USO);
      process.exitCode = 2;
      return;
    }
    // H3: quem aplica decisões já sabe a ficha e o perfil que quer — não
    // precisa reler `users`/`athletes` inteiros só para descartar o
    // resultado; isso é trabalho (e leitura de PII) que só o dry-run precisa.
    const decisions = JSON.parse(fs.readFileSync(decisionsPath, 'utf8'));
    const res = await applyDecisions(supabase, decisions);
    console.log(res);
    return;
  }

  const { data: users } = await supabase.from('users').select('id, name, email, profile').order('created_at', { ascending: true });
  const { data: athletes } = await supabase.from('athletes').select('id, user_id, name, account_user_id');
  // Dry-run: a tabela é o ponto do comando — não é log de PII proibido, é
  // exatamente o que o dono pediu para revisar antes de decidir.
  console.table(proposeLinks(users || [], athletes || []));
  console.log('\nDry-run. Para aplicar: edite um JSON de decisões e rode com --apply <arquivo>.');
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { proposeLinks, applyDecisions, PROFILES };
