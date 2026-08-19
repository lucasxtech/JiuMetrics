/**
 * Testes unitários para o errorHandler centralizado
 */

const { handleError, asyncHandler, errorDetails } = require('../utils/errorHandler');
const { NotFoundError, ValidationError } = require('../utils/errors');

describe('handleError', () => {
  let mockRes;
  let consoleSpy;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    consoleSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('deve retornar erro com statusCode padrão 500', () => {
    const error = new Error('Erro interno');
    
    handleError(mockRes, 'Operação de teste', error);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  it('deve usar statusCode fornecido', () => {
    const error = new Error('Não encontrado');
    
    handleError(mockRes, 'Busca', error, 404);

    expect(mockRes.status).toHaveBeenCalledWith(404);
  });

  it('deve usar statusCode do AppError quando não fornecido explícito', () => {
    const error = new NotFoundError('Atleta');
    
    handleError(mockRes, 'Buscar atleta', error);

    expect(mockRes.status).toHaveBeenCalledWith(404);
  });

  it('deve usar statusCode do ValidationError', () => {
    const error = new ValidationError('Campo inválido');
    
    handleError(mockRes, 'Validação', error);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('deve logar erro no console', () => {
    const error = new Error('Teste de log');
    
    handleError(mockRes, 'Log teste', error);

    expect(consoleSpy).toHaveBeenCalled();
  });

  it('deve incluir success: false na resposta', () => {
    const error = new Error('Mensagem específica');
    
    handleError(mockRes, 'Operação', error);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  it('deve incluir campo error na resposta', () => {
    const error = new Error('Teste');
    
    handleError(mockRes, 'Operação', error);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
  });
});

describe('errorDetails — R9 da spec 007: nada de error.message em produção', () => {
  const original = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = original;
  });

  it('OMITE details quando NODE_ENV=production', () => {
    process.env.NODE_ENV = 'production';

    expect(errorDetails(new Error('coluna "user_id" viola not-null'))).toEqual({});
  });

  it('inclui details fora de produção, para diagnóstico local', () => {
    process.env.NODE_ENV = 'development';

    expect(errorDetails(new Error('detalhe do PostgREST'))).toEqual({
      details: 'detalhe do PostgREST'
    });
  });

  it('handleError não devolve a mensagem interna em produção', () => {
    process.env.NODE_ENV = 'production';
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    const spy = jest.spyOn(console, 'error').mockImplementation();

    handleError(res, 'buscar atleta', new Error('relation "athletes" does not exist'));

    const payload = res.json.mock.calls[0][0];
    expect(payload).toEqual({ success: false, error: 'Erro ao buscar atleta' });
    expect(JSON.stringify(payload)).not.toContain('relation');
    // o detalhe continua no log do servidor, onde a equipe alcança
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('asyncHandler', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  it('deve executar função assíncrona com sucesso', async () => {
    const mockFn = jest.fn().mockResolvedValue('success');
    const wrapped = asyncHandler(mockFn);

    await wrapped(mockReq, mockRes, mockNext);

    expect(mockFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('deve passar erro para next() em caso de rejeição', async () => {
    const error = new Error('Async error');
    const mockFn = jest.fn().mockRejectedValue(error);
    const wrapped = asyncHandler(mockFn);

    await wrapped(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(error);
  });
});
