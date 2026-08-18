/**
 * Requer o app Express real para os testes de supertest.
 *
 * Dois cuidados, ambos confinados à janela síncrona do `require`:
 *
 * 1. `JWT_SECRET` — `middleware/auth.js` lança na importação se ausente. O
 *    CI (`ci.yml`) não define a variável para o job de testes (nunca
 *    precisou, porque nenhuma suíte existente requeria esse middleware
 *    diretamente). Setamos aqui em vez de depender do `.env` local ou do
 *    CI, para o teste ser determinístico nos dois ambientes.
 * 2. `NODE_ENV` — `server/index.js` chama `app.listen(PORT)` de verdade
 *    quando `NODE_ENV !== 'production'` (linha só usada em dev local). Sem
 *    isso, rodar esta suíte abriria uma porta real. Restauramos o valor
 *    original logo depois do `require`, para não vazar para outros
 *    arquivos de teste no mesmo worker do Jest.
 */
function loadApp() {
  process.env.JWT_SECRET = 'test-jwt-secret-spec-004-authorization-safety-net';

  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const app = require('../../../../index');
  process.env.NODE_ENV = originalNodeEnv;

  return app;
}

module.exports = { loadApp };
