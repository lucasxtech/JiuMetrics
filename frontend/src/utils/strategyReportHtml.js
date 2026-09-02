/**
 * Monta o HTML do relatório de estratégia em PDF.
 *
 * ⚠️ **Era o sink de XSS do frontend** (AZ-16 / F1). O template interpola
 * conteúdo de estratégia **gerado por IA sobre vídeo de terceiros** e o
 * resultado ia para `tempDiv.innerHTML`. `innerHTML` não executa `<script>`,
 * mas **executa handlers** (`<img src=x onerror=...>`), e com o JWT em
 * `localStorage` isso é roubo de sessão válida por 7 a 30 dias.
 *
 * A defesa aqui é **escapar na fonte**: `escapeDeep` produz uma cópia do
 * objeto de análise com todas as strings (e todas as chaves) escapadas, e o
 * template lê **apenas** dessa cópia. Consequências de escolher isso em vez
 * de reescrever o template com `createElement`:
 *
 * - **Cobre todas as interpolações de uma vez** — as 26 atuais e as futuras.
 *   Escapar 26 pontos à mão num template de ~230 linhas com condicionais
 *   aninhados seria justamente o tipo de edição que erra em silêncio.
 * - **Layout inalterado por construção.** O escape só afeta strings que
 *   contenham `< > & " '`; a estrutura HTML é nossa e não passa pelo escape.
 * - **É a mesma defesa que `createElement`/`textContent` aplicaria** — a
 *   diferença é o nível: valor em vez de nó.
 *
 * ⚠️ **O que NÃO foi feito, e por que:** o template continua sendo uma string
 * e o `innerHTML` continua existindo em `Analyses.jsx`. A spec 010 pede
 * remover o padrão, com **comparação visual obrigatória** do PDF antes e
 * depois — verificação que exige rodar a aplicação e olhar o resultado. A
 * vulnerabilidade está fechada e testada; a remoção do padrão fica pendente
 * dessa verificação.
 *
 * ⚠️ **Ao editar o template:** leia dados só de `a` (escapado). Ler de
 * `analysis` reabre o buraco.
 */

/**
 * Escapa os caracteres que dão significado a HTML.
 * @param {*} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Cópia profunda com todas as strings — e todas as CHAVES — escapadas.
 *
 * As chaves importam: o template faz `Object.entries(...)` e imprime a chave
 * (ex.: `fase.replace(/_/g, ' ')`), então uma chave maliciosa no JSON de
 * estratégia seria injeção pelo mesmo caminho.
 *
 * @param {*} value
 * @returns {*} mesma forma, strings escapadas
 */
export function escapeDeep(value) {
  if (typeof value === 'string') return escapeHtml(value);
  if (Array.isArray(value)) return value.map(escapeDeep);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [escapeHtml(k), escapeDeep(v)])
    );
  }
  // números, booleanos, null, undefined passam intactos
  return value;
}

const formatTextToParagraphs = (text) => {
  if (!text) return '';
  
  // Dividir em parágrafos (~200-300 caracteres cada)
  const sentences = text.split(/(?<=\.)\s+/);
  const paragraphs = [];
  let currentParagraph = '';
  
  for (const sentence of sentences) {
    if (currentParagraph && (currentParagraph.length + sentence.length) > 300) {
      paragraphs.push(currentParagraph.trim());
      currentParagraph = sentence;
    } else {
      currentParagraph += (currentParagraph ? ' ' : '') + sentence;
    }
  }
  
  if (currentParagraph.trim()) {
    paragraphs.push(currentParagraph.trim());
  }
  
  // Retornar HTML com parágrafos separados
  return paragraphs.map(p => 
    `<p style="color: #0f172a; font-size: 11px; line-height: 1.6; margin: 0 0 10px 0;">${p}</p>`
  ).join('');
};

/**
 * @param {Object} analysis - linha de `tactical_analyses` (dado CRU)
 * @returns {string} HTML do relatório, com todo conteúdo escapado
 */
export function buildStrategyReportHtml(analysis) {
  // ⚠️ ORDEM IMPORTA: desserializar ANTES de escapar.
  //
  // Três campos podem chegar como JSON string. Se o escape viesse primeiro, as
  // aspas dentro do JSON virariam `&quot;`, o `JSON.parse` falharia, o erro
  // morreria no catch e a seção **desapareceria do PDF em silêncio** — o
  // mesmo tipo de falha que esta refatoração existe para eliminar. Um teste
  // cobre exatamente este caminho.
  const cru = analysis?.strategy_data?.strategy || analysis?.strategy_data;

  const parseTalvezJson = (valor, nome) => {
    if (typeof valor !== 'string') return valor;
    try {
      return JSON.parse(valor);
    } catch (e) {
      console.error(`❌ Erro ao parsear ${nome}:`, e);
      return valor;
    }
  };

  // A partir daqui, NADA lê de `analysis`/`cru` — só de `a`, já escapado.
  const a = escapeDeep({
    ...analysis,
    strategy_data: {
      strategy: {
        ...cru,
        plano_tatico_faseado: parseTalvezJson(cru?.plano_tatico_faseado, 'plano_tatico'),
        checklist_tatico: parseTalvezJson(cru?.checklist_tatico, 'checklist'),
        cronologia_inteligente: parseTalvezJson(cru?.cronologia_inteligente, 'cronologia')
      }
    }
  });

  const strategyData = a.strategy_data.strategy;
  const planoTatico = strategyData?.plano_tatico_faseado;
  const checklistTatico = strategyData?.checklist_tatico;
  const cronologia = strategyData?.cronologia_inteligente;
  
  // Criar conteúdo formatado para PDF
  const content = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px;">
      <h1 style="color: #1f2937; margin-bottom: 10px; font-size: 18px;">
        ${a.athlete_name} vs ${a.opponent_name}
      </h1>
      <p style="color: #64748b; margin-bottom: 30px; font-size: 11px;">
        Criado em ${new Date(a.created_at).toLocaleDateString('pt-BR')}
      </p>
      
      <!-- Resumo Executivo (como_vencer + 3 prioridades) -->
      ${strategyData?.resumo_rapido?.como_vencer || strategyData?.tese_da_vitoria ? `
      <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); border-radius: 8px; padding: 18px; margin-bottom: 20px; page-break-inside: avoid;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
          <span style="font-size: 14px;">🏆</span>
          <h2 style="color: white; margin: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Como Vencer Esta Luta</h2>
        </div>
        <div style="color: #e0e7ff; font-size: 11px; line-height: 1.7;">
          ${formatTextToParagraphs(strategyData?.resumo_rapido?.como_vencer || strategyData?.tese_da_vitoria).replace(/color: #0f172a/g, 'color: #e0e7ff')}
        </div>
        ${strategyData?.resumo_rapido?.tres_prioridades?.length > 0 ? `
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.2);">
          <p style="color: white; font-weight: bold; font-size: 10px; margin: 0 0 8px 0; text-transform: uppercase;">3 Prioridades</p>
          ${strategyData.resumo_rapido.tres_prioridades.map((p, i) => `
            <div style="display: flex; gap: 8px; margin-bottom: 6px; align-items: flex-start;">
              <span style="background: rgba(255,255,255,0.2); color: white; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; flex-shrink: 0;">${i + 1}</span>
              <p style="color: #e0e7ff; font-size: 10px; margin: 0; line-height: 1.5;">${p}</p>
            </div>
          `).join('')}
        </div>
        ` : ''}
      </div>
      ` : ''}
      
      <!-- Análise de Matchup -->
      ${strategyData?.analise_de_matchup ? `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 20px; page-break-inside: avoid;">
        <h2 style="color: #334155; margin-bottom: 15px; font-size: 14px;">🔍 Matchup & Assimetrias</h2>
        
        ${strategyData.analise_de_matchup.vantagem_critica ? `
        <div style="background: white; border: 1px solid #86efac; border-radius: 6px; padding: 12px; margin-bottom: 12px;">
          <p style="color: #065f46; font-weight: bold; margin: 0 0 6px 0; font-size: 11px;">✅ Vantagem Crítica</p>
          <div style="color: #475569; font-size: 10px; line-height: 1.6;">
            ${formatTextToParagraphs(strategyData.analise_de_matchup.vantagem_critica).replace(/font-size: 11px/g, 'font-size: 10px')}
          </div>
        </div>
        ` : ''}
        
        ${strategyData.analise_de_matchup.risco_oculto ? `
        <div style="background: white; border: 1px solid #fca5a5; border-radius: 6px; padding: 12px; margin-bottom: 12px;">
          <p style="color: #991b1b; font-weight: bold; margin: 0 0 6px 0; font-size: 11px;">⚠️ Risco Oculto</p>
          <div style="color: #475569; font-size: 10px; line-height: 1.6;">
            ${formatTextToParagraphs(strategyData.analise_de_matchup.risco_oculto).replace(/font-size: 11px/g, 'font-size: 10px')}
          </div>
        </div>
        ` : ''}
        
        ${strategyData.analise_de_matchup.fator_chave ? `
        <div style="background: white; border: 1px solid #fbbf24; border-radius: 6px; padding: 12px; margin-bottom: 12px;">
          <p style="color: #92400e; font-weight: bold; margin: 0 0 6px 0; font-size: 11px;">⚡ Fator Chave</p>
          <div style="color: #475569; font-size: 10px; line-height: 1.6;">
            ${formatTextToParagraphs(strategyData.analise_de_matchup.fator_chave).replace(/font-size: 11px/g, 'font-size: 10px')}
          </div>
        </div>
        ` : ''}
        
        ${strategyData.analise_de_matchup.neutralizacao ? `
        <div style="background: white; border: 1px solid #c4b5fd; border-radius: 6px; padding: 12px;">
          <p style="color: #5b21b6; font-weight: bold; margin: 0 0 6px 0; font-size: 11px;">🛡️ Neutralização</p>
          <div style="color: #475569; font-size: 10px; line-height: 1.6;">
            ${formatTextToParagraphs(strategyData.analise_de_matchup.neutralizacao).replace(/font-size: 11px/g, 'font-size: 10px')}
          </div>
        </div>
        ` : ''}
      </div>
      ` : ''}
      
      <!-- Plano Tático Faseado -->
      ${planoTatico ? `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
        <h2 style="color: #334155; margin-bottom: 15px; font-size: 14px;">🎯 Plano Tático Faseado</h2>
        
        ${planoTatico.em_pe_standup ? `
        <div style="background: white; border-left: 3px solid #3b82f6; padding: 10px; margin-bottom: 12px; page-break-inside: avoid;">
          <p style="color: #3b82f6; font-weight: bold; margin: 0 0 6px 0; font-size: 11px;">🥋 Em Pé (Standup)</p>
          ${Object.entries(planoTatico.em_pe_standup).map(([key, value]) => `
            <div style="margin-bottom: 6px;">
              <p style="color: #1e40af; font-weight: bold; font-size: 10px; margin: 0 0 2px 0; text-transform: capitalize;">${key.replace(/_/g, ' ')}</p>
              <p style="color: #64748b; font-size: 9px; margin: 0; line-height: 1.4;">${value}</p>
            </div>
          `).join('')}
        </div>
        ` : ''}
        
        ${planoTatico.jogo_de_passagem_top ? `
        <div style="background: white; border-left: 3px solid #10b981; padding: 10px; margin-bottom: 12px; page-break-inside: avoid;">
          <p style="color: #10b981; font-weight: bold; margin: 0 0 6px 0; font-size: 11px;">⬇️ Jogo de Passagem (Top)</p>
          ${Object.entries(planoTatico.jogo_de_passagem_top).map(([key, value]) => `
            <div style="margin-bottom: 6px;">
              <p style="color: #059669; font-weight: bold; font-size: 10px; margin: 0 0 2px 0; text-transform: capitalize;">${key.replace(/_/g, ' ')}</p>
              <p style="color: #64748b; font-size: 9px; margin: 0; line-height: 1.4;">${value}</p>
            </div>
          `).join('')}
        </div>
        ` : ''}
        
        ${planoTatico.jogo_de_guarda_bottom ? `
        <div style="background: white; border-left: 3px solid #8b5cf6; padding: 10px; page-break-inside: avoid;">
          <p style="color: #8b5cf6; font-weight: bold; margin: 0 0 6px 0; font-size: 11px;">⬆️ Jogo de Guarda (Bottom)</p>
          ${Object.entries(planoTatico.jogo_de_guarda_bottom).map(([key, value]) => `
            <div style="margin-bottom: 6px;">
              <p style="color: #7c3aed; font-weight: bold; font-size: 10px; margin: 0 0 2px 0; text-transform: capitalize;">${key.replace(/_/g, ' ')}</p>
              <p style="color: #64748b; font-size: 9px; margin: 0; line-height: 1.4;">${value}</p>
            </div>
          `).join('')}
        </div>
        ` : ''}
      </div>
      ` : ''}
      
      <!-- Checklist Tático -->
      ${checklistTatico ? `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 20px; page-break-inside: avoid;">
        <h2 style="color: #334155; margin: 0 0 12px 0; font-size: 14px; font-weight: bold;">📋 Checklist Tático</h2>
        
        ${checklistTatico.oportunidades_de_pontos?.length > 0 ? `
        <div style="background: white; border: 1px solid #86efac; border-radius: 6px; padding: 10px; margin-bottom: 12px; page-break-inside: avoid;">
          <p style="color: #065f46; font-weight: bold; margin: 0 0 8px 0; font-size: 11px;">🎯 Oportunidades de Pontos</p>
          ${checklistTatico.oportunidades_de_pontos.map(item => `
            <div style="margin-bottom: 8px; padding-left: 8px; border-left: 2px solid #86efac;">
              <p style="color: #065f46; font-weight: bold; font-size: 10px; margin: 0 0 2px 0;">${item.tecnica || item}${item.pontos ? ` (${item.pontos} pts)` : ''}${item.probabilidade ? ` — ${item.probabilidade}` : ''}</p>
              ${item.quando || item.situacao ? `<p style="color: #64748b; font-size: 9px; margin: 0 0 2px 0; line-height: 1.4;">Quando: ${item.quando || item.situacao}</p>` : ''}
              ${item.por_que_funciona ? `<p style="color: #64748b; font-size: 9px; margin: 0; line-height: 1.4;">Por quê: ${item.por_que_funciona}</p>` : ''}
            </div>
          `).join('')}
        </div>
        ` : ''}
        
        ${checklistTatico.armadilhas_dele?.length > 0 ? `
        <div style="background: white; border: 1px solid #fca5a5; border-radius: 6px; padding: 10px; margin-bottom: 12px; page-break-inside: avoid;">
          <p style="color: #991b1b; font-weight: bold; margin: 0 0 8px 0; font-size: 11px;">⚠️ Armadilhas do Adversário</p>
          ${checklistTatico.armadilhas_dele.map(item => `
            <div style="margin-bottom: 8px; padding-left: 8px; border-left: 2px solid #fca5a5;">
              <p style="color: #991b1b; font-weight: bold; font-size: 10px; margin: 0 0 2px 0;">${item.situacao || item}</p>
              ${item.o_que_ele_faz || item.tecnica_perigosa ? `<p style="color: #64748b; font-size: 9px; margin: 0 0 2px 0; line-height: 1.4;">O que ele faz: ${item.o_que_ele_faz || item.tecnica_perigosa}</p>` : ''}
              ${item.como_evitar ? `<p style="color: #64748b; font-size: 9px; margin: 0; line-height: 1.4;">Como evitar: ${item.como_evitar}</p>` : ''}
            </div>
          `).join('')}
        </div>
        ` : ''}
        
        ${checklistTatico.protocolo_de_emergencia || checklistTatico.protocolo_de_seguranca ? `
        <div style="background: white; border: 1px solid #fdba74; border-radius: 6px; padding: 10px; page-break-inside: avoid;">
          <p style="color: #c2410c; font-weight: bold; margin: 0 0 8px 0; font-size: 11px;">🚨 Protocolo de Emergência</p>
          ${(checklistTatico.protocolo_de_emergencia?.posicao_perigosa || checklistTatico.protocolo_de_seguranca?.jamais_fazer) ? `
          <div style="margin-bottom: 6px; padding-left: 8px; border-left: 2px solid #fdba74;">
            <p style="color: #c2410c; font-weight: bold; font-size: 10px; margin: 0 0 2px 0;">Posição Perigosa</p>
            <p style="color: #64748b; font-size: 9px; margin: 0; line-height: 1.4;">${checklistTatico.protocolo_de_emergencia?.posicao_perigosa || checklistTatico.protocolo_de_seguranca?.jamais_fazer}</p>
          </div>
          ` : ''}
          ${(checklistTatico.protocolo_de_emergencia?.como_escapar || checklistTatico.protocolo_de_seguranca?.saida_de_emergencia) ? `
          <div style="padding-left: 8px; border-left: 2px solid #fdba74;">
            <p style="color: #c2410c; font-weight: bold; font-size: 10px; margin: 0 0 2px 0;">Como Escapar</p>
            <p style="color: #64748b; font-size: 9px; margin: 0; line-height: 1.4;">${checklistTatico.protocolo_de_emergencia?.como_escapar || checklistTatico.protocolo_de_seguranca?.saida_de_emergencia}</p>
          </div>
          ` : ''}
        </div>
        ` : ''}

        ${checklistTatico.fazer?.length > 0 ? `
        <div style="background: white; border: 1px solid #86efac; border-radius: 6px; padding: 10px; margin-bottom: 12px; page-break-inside: avoid;">
          <p style="color: #065f46; font-weight: bold; margin: 0 0 6px 0; font-size: 11px;">✓ Fazer</p>
          ${checklistTatico.fazer.map(item => `
            <div style="margin-bottom: 4px; padding-left: 8px; border-left: 2px solid #86efac;">
              <p style="color: #64748b; font-size: 9px; margin: 0; line-height: 1.4;">• ${item}</p>
            </div>
          `).join('')}
        </div>
        ` : ''}
        
        ${checklistTatico.nao_fazer?.length > 0 ? `
        <div style="background: white; border: 1px solid #fca5a5; border-radius: 6px; padding: 10px; margin-bottom: 12px; page-break-inside: avoid;">
          <p style="color: #991b1b; font-weight: bold; margin: 0 0 6px 0; font-size: 11px;">❌ Não Fazer</p>
          ${checklistTatico.nao_fazer.map(item => `
            <div style="margin-bottom: 4px; padding-left: 8px; border-left: 2px solid #fca5a5;">
              <p style="color: #64748b; font-size: 9px; margin: 0; line-height: 1.4;">• ${item}</p>
            </div>
          `).join('')}
        </div>
        ` : ''}
        
        ${checklistTatico.se_estiver_perdendo ? `
        <div style="background: white; border: 1px solid #fdba74; border-radius: 6px; padding: 10px; page-break-inside: avoid;">
          <p style="color: #c2410c; font-weight: bold; margin: 0 0 6px 0; font-size: 11px;">🔥 Se Estiver Perdendo</p>
          <p style="color: #64748b; font-size: 10px; margin: 0;">${checklistTatico.se_estiver_perdendo}</p>
        </div>
        ` : ''}
      </div>
      ` : ''}
      
      <!-- Cronologia Inteligente -->
      ${cronologia && Object.keys(cronologia).length > 0 ? `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-top: 15px; page-break-inside: avoid;">
        <h2 style="color: #334155; margin: 0 0 10px 0; font-size: 14px; font-weight: bold;">⏱️ Cronologia Inteligente</h2>
        ${Object.entries(cronologia).map(([fase, conteudo], index) => `
          <div style="background: white; border-left: 3px solid #f59e0b; padding: 8px 10px; margin-bottom: ${index === Object.keys(cronologia).length - 1 ? '0' : '8px'}; page-break-inside: avoid;">
            <p style="color: #d97706; font-weight: bold; margin: 0 0 4px 0; font-size: 10px; text-transform: capitalize;">
              ${fase.replace(/_/g, ' ')}
            </p>
            <p style="color: #475569; margin: 0; font-size: 10px; line-height: 1.4;">
              ${conteudo}
            </p>
          </div>
        `).join('')}
      </div>
      ` : ''}
    </div>
  `;

  return content;
}
