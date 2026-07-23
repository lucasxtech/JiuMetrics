// Mock Supabase antes de importar qualquer módulo (aiController importa modelos que
// inicializam o client do Supabase no require).
jest.mock('../../config/supabase', () => ({
  __esModule: true,
  default: {
    from: jest.fn(() => ({
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }))
  }
}));

const aiController = require('../aiController');

describe('aiController.analyzeVideo (stub descontinuado)', () => {
  it('não aponta para a rota /api/video/upload deletada na Fase 0', async () => {
    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await aiController.analyzeVideo(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const payload = res.json.mock.calls[0][0];
    expect(payload.error).not.toMatch(/\/video\/upload/);
    expect(payload.error).toMatch(/analyze-link/);
  });
});
