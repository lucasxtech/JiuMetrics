#!/usr/bin/env node
/**
 * Auditoria de qualidade das análises persistidas.
 *
 * Aplica as regras determinísticas de `utils/analysisQuality.js` a todas as
 * análises do banco e imprime um relatório. NÃO chama IA, NÃO escreve nada,
 * NÃO custa dinheiro — é só leitura.
 *
 * Para que serve: dar uma linha de base numérica contra a qual comparar
 * qualquer mudança futura de prompt, de schema ou de modelo. Antes disso, a
 * única forma de avaliar uma mudança na análise era abrir uma e olhar.
 *
 *   node scripts/audit-analysis-quality.js              # todas
 *   node scripts/audit-analysis-quality.js --desde 2026-08-01
 *   node scripts/audit-analysis-quality.js --por-mes    # série temporal
 *   node scripts/audit-analysis-quality.js --exemplos 5 # amostra por regra
 *
 * Precisa de SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente (as mesmas
 * que a API usa). Rode a partir de `server/`.
 */

require('dotenv').config();

const { supabase } = require('../src/config/supabase');
const { inspectAnalysis, summarizeQuality, REGRAS } = require('../src/utils/analysisQuality');

const args = process.argv.slice(2);
const flag = (nome, padrao = null) => {
  const i = args.indexOf(nome);
  return i === -1 ? padrao : (args[i + 1] ?? true);
};
const DESDE = flag('--desde');
const POR_MES = args.includes('--por-mes');
const EXEMPLOS = Number(flag('--exemplos', 0)) || 0;
const PAGINA = 1000;

async function carregarAnalises() {
  const todas = [];
  for (let inicio = 0; ; inicio += PAGINA) {
    let q = supabase
      .from('fight_analyses')
      .select('id,created_at,video_url,charts,technical_stats,summary,is_edited')
      .order('created_at', { ascending: false })
      .range(inicio, inicio + PAGINA - 1);
    if (DESDE) q = q.gte('created_at', DESDE);

    const { data, error } = await q;
    if (error) throw new Error(`Falha ao ler fight_analyses: ${error.message}`);
    todas.push(...data);
    if (data.length < PAGINA) return todas;
  }
}

const pct = (n, total) => (total === 0 ? '  0,0' : ((n / total) * 100).toFixed(1).replace('.', ',')).padStart(5);

function imprimirResumo(titulo, analises) {
  const resumo = summarizeQuality(analises);
  console.log(`\n${titulo} — ${resumo.total} análise(s)`);
  console.log(`  com contradição interna (erro): ${resumo.comErro} (${pct(resumo.comErro, resumo.total)}%)`);
  console.log(`  com defeito de método (aviso):  ${resumo.comAviso} (${pct(resumo.comAviso, resumo.total)}%)\n`);

  console.log('  REGRA                                       SEV      N       %');
  for (const { regra, severidade } of REGRAS) {
    const n = resumo.porRegra[regra] || 0;
    console.log(`  ${regra.padEnd(42)} ${severidade.padEnd(6)} ${String(n).padStart(4)}  ${pct(n, resumo.total)}%`);
  }
}

(async () => {
  // Análises editadas pelo usuário saem da contagem: o que se quer medir é a
  // saída da IA, não o que uma pessoa escreveu por cima dela.
  const todas = await carregarAnalises();
  const daIA = todas.filter((a) => !a.is_edited);
  const editadas = todas.length - daIA.length;

  console.log('='.repeat(72));
  console.log('QUALIDADE DAS ANÁLISES DE LUTA — regras determinísticas, sem IA');
  console.log('='.repeat(72));
  if (DESDE) console.log(`Recorte: created_at >= ${DESDE}`);
  if (editadas > 0) console.log(`${editadas} análise(s) editada(s) por usuário excluída(s) da contagem.`);

  imprimirResumo('TOTAL', daIA);

  if (POR_MES) {
    const meses = {};
    for (const a of daIA) (meses[a.created_at.slice(0, 7)] ||= []).push(a);
    console.log(`\n${'='.repeat(72)}\nPOR MÊS\n${'='.repeat(72)}`);
    for (const mes of Object.keys(meses).sort()) imprimirResumo(mes, meses[mes]);
  }

  if (EXEMPLOS > 0) {
    console.log(`\n${'='.repeat(72)}\nEXEMPLOS (até ${EXEMPLOS} por regra)\n${'='.repeat(72)}`);
    for (const { regra } of REGRAS) {
      const casos = [];
      for (const a of daIA) {
        const achado = inspectAnalysis(a).find((f) => f.regra === regra);
        if (achado) casos.push({ a, achado });
        if (casos.length >= EXEMPLOS) break;
      }
      if (casos.length === 0) continue;
      console.log(`\n${regra}`);
      for (const { a, achado } of casos) {
        console.log(`  ${a.created_at.slice(0, 10)} ${a.id.slice(0, 8)}  ${achado.mensagem}`);
      }
    }
  }

  console.log('\nLembrete: estas regras medem COERÊNCIA e contrato, não acerto.');
  console.log('Se a análise descreve corretamente o que aconteceu no vídeo, nenhuma');
  console.log('regra aqui sabe dizer — isso exige gabarito ou segunda opinião paga.\n');
})().catch((err) => {
  console.error(`\n❌ ${err.message}\n`);
  process.exit(1);
});
