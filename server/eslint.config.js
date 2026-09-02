const globals = require('globals');

/**
 * ESLint do backend — introduzido pela spec 003.
 *
 * PRINCÍPIO: o conjunto de regras é deliberadamente MÍNIMO e cobre apenas
 * erro real, não estilo. São 69 arquivos que nunca passaram por análise
 * estática; um preset completo produziria centenas de apontamentos de
 * formatação e o portão nasceria ignorado.
 *
 * Regras de estilo (indentação, aspas, ponto-e-vírgula, ordem de import)
 * estão FORA DE ESCOPO — ver specs/003-quality-gates/spec.md.
 *
 * Ampliar este conjunto é trabalho de uma spec futura, não desta.
 */
module.exports = [
  {
    ignores: [
      'node_modules/**',
      'uploads/**',
      'coverage/**',

      // Scripts de debug soltos na raiz do server, sem nenhum consumidor
      // (nem código, nem npm script, nem Makefile). Documentados para remoção
      // em AUDIT.md §13 TD-37. Linter aplicado a código morto é desperdício;
      // remover os arquivos está FORA do escopo da spec 003.
      //
      // Quando uma spec de limpeza removê-los, remova estas linhas também.
      'check-analysis.js',
      'debug-analyses.js',
      'test-connection.js',
    ],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // --- Erros que quebram em runtime ---
      'no-undef': 'error',           // variável inexistente
      'no-const-assign': 'error',    // reatribuição de const
      'no-dupe-keys': 'error',       // chave duplicada em objeto
      'no-dupe-args': 'error',       // parâmetro duplicado
      'no-func-assign': 'error',     // reatribuição de função declarada
      'no-obj-calls': 'error',       // chamar objeto global como função
      'no-unsafe-negation': 'error',

      // --- Código que nunca executa ou nunca tem efeito ---
      'no-unreachable': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-self-assign': 'error',
      'no-self-compare': 'error',

      // --- Erros de controle de fluxo que já morderam este repo ---
      // (padrão de catch que engole erro — ver AUDIT.md §11)
      'no-ex-assign': 'error',
      'no-unsafe-finally': 'error',

      // --- Sinal de código morto ---
      // Argumentos não usados são comuns em handler do Express (req, res, next)
      // e em catch — por isso 'after-used' e caughtErrors: 'none'.
      'no-unused-vars': ['error', {
        args: 'after-used',
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none',
      }],
    },
  },
  {
    // Arquivos de teste: globais do Jest
    files: ['**/__tests__/**/*.js', '**/*.test.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },
];
