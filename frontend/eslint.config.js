import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // `coverage` entrou junto com o relatório de coverage passar a funcionar
  // (CI): o reporter do v8 gera JS próprio ali, e sem isto ele vira ruído no
  // lint de quem rodar as duas coisas na mesma árvore.
  globalIgnores(['dist', 'coverage']),
  {
    // Arquivos de configuração rodam em Node, não no browser.
    // Sem isto, `process` em vite.config.js é reportado como no-undef —
    // erro da config, não do código. (spec 003)
    files: ['*.config.js', 'vitest.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],

      // Rebaixado de error para warn pela spec 003, ao tornar este lint
      // BLOQUEANTE.
      //
      // MOTIVO: a regra dispara nos 3 contexts do projeto (Auth, Strategy,
      // AnalysisProgress) porque cada um exporta `XProvider` + `useX` no mesmo
      // arquivo — que é o padrão IDIOMÁTICO e recomendado de React Context.
      // A regra quer os dois em arquivos separados, o que é preferência de DX
      // de Fast Refresh, não correção.
      //
      // Rebaixar (e não suprimir caso a caso) é a escolha certa: quando uma
      // regra dispara em 3 de 3 usos de um padrão correto, o problema é a
      // configuração da regra, não o código. O aviso continua visível.
      //
      // Reavaliar se o projeto decidir separar hooks de providers.
      'react-refresh/only-export-components': 'warn',
    },
  },
])
