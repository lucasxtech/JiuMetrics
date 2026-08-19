/**
 * SPEC-006 — escopo de posse obrigatório na ASSINATURA dos models.
 *
 * O que estes testes provam é diferente dos de `leaks.test.js`: lá, que os 6
 * endpoints conhecidos pararam de vazar; aqui, que a **classe** de bug foi
 * fechada — um 7º call site que esqueça o escopo recebe um erro em vez de
 * ler/escrever dado alheio.
 *
 * Cada caso cobre também `[undefined]`, que é o valor que realmente chega
 * quando alguém passa uma variável inexistente. Sem o guard, uma query
 * `.in('user_id', [undefined])` não casaria linha nenhuma e pareceria
 * "não encontrado" — falha silenciosa, o padrão de bug dominante deste repo.
 */
jest.mock('../../config/supabase', () => require('./support/supabaseMock'));

const supabaseMock = require('./support/supabaseMock');
const { createFakeSupabase } = require('./support/fakeSupabase');
const { buildFixtures } = require('./support/fixtures');
const FightAnalysis = require('../../models/FightAnalysis');
const ChatSession = require('../../models/ChatSession');
const AnalysisVersion = require('../../models/AnalysisVersion');
const { MissingScopeError, AuthorizationError, ValidationError } = require('../../utils/errors');

describe('SPEC-006 — models exigem escopo de posse', () => {
  let fx;

  beforeEach(() => {
    fx = buildFixtures();
    supabaseMock.__setFake(createFakeSupabase(fx.seedRows));
  });

  describe('FightAnalysis', () => {
    const semEscopo = [undefined, null, [], [undefined], ''];

    it.each(semEscopo)('getAll lança MissingScopeError com escopo %p', async (scope) => {
      await expect(FightAnalysis.getAll(scope)).rejects.toThrow(MissingScopeError);
    });

    it.each(semEscopo)('getByPersonId lança MissingScopeError com escopo %p', async (scope) => {
      await expect(FightAnalysis.getByPersonId(fx.tenantA.athlete.id, scope)).rejects.toThrow(MissingScopeError);
    });

    it.each(semEscopo)('getByIdAndUser lança MissingScopeError com escopo %p', async (scope) => {
      await expect(FightAnalysis.getByIdAndUser(fx.tenantA.fightAnalysis.id, scope)).rejects.toThrow(MissingScopeError);
    });

    it.each(semEscopo)('update lança MissingScopeError com escopo %p', async (scope) => {
      await expect(
        FightAnalysis.update(fx.tenantA.fightAnalysis.id, { summary: 'x' }, scope)
      ).rejects.toThrow(MissingScopeError);
    });

    it.each(semEscopo)('delete lança MissingScopeError com escopo %p', async (scope) => {
      await expect(FightAnalysis.delete(fx.tenantA.fightAnalysis.id, scope)).rejects.toThrow(MissingScopeError);
    });

    it('update com escopo alheio não altera a linha e devolve null', async () => {
      const result = await FightAnalysis.update(
        fx.tenantB.fightAnalysis.id,
        { summary: 'invadido' },
        [fx.tenantA.user.id]
      );

      expect(result).toBeNull();
      const stored = supabaseMock.__getFake().store.get('fight_analyses')
        .find(a => a.id === fx.tenantB.fightAnalysis.id);
      expect(stored.summary).toBe(fx.tenantB.fightAnalysis.summary);
    });

    it('delete com escopo alheio não remove a linha', async () => {
      const result = await FightAnalysis.delete(fx.tenantB.fightAnalysis.id, [fx.tenantA.user.id]);

      expect(result).toBeNull();
      const stored = supabaseMock.__getFake().store.get('fight_analyses')
        .find(a => a.id === fx.tenantB.fightAnalysis.id);
      expect(stored).toBeDefined();
    });

    it('não expõe mais um getById sem escopo', () => {
      expect(FightAnalysis.getById).toBeUndefined();
    });
  });

  describe('ChatSession', () => {
    const semEscopo = [undefined, null, ''];

    it.each(semEscopo)('addMessage lança MissingScopeError com userId %p', async (userId) => {
      await expect(
        ChatSession.addMessage(fx.tenantA.chatSession.id, { role: 'user', content: 'oi' }, userId)
      ).rejects.toThrow(MissingScopeError);
    });

    it.each(semEscopo)('addMessages lança MissingScopeError com userId %p', async (userId) => {
      await expect(
        ChatSession.addMessages(fx.tenantA.chatSession.id, [{ role: 'user', content: 'oi' }], userId)
      ).rejects.toThrow(MissingScopeError);
    });

    it.each(semEscopo)('updateContextSnapshot lança MissingScopeError com userId %p', async (userId) => {
      await expect(
        ChatSession.updateContextSnapshot(fx.tenantA.chatSession.id, { summary: 'x' }, userId)
      ).rejects.toThrow(MissingScopeError);
    });

    it('updateContextSnapshot em sessão de outro usuário devolve null e não altera nada', async () => {
      const result = await ChatSession.updateContextSnapshot(
        fx.tenantB.chatSession.id,
        { summary: 'envenenado' },
        fx.tenantA.user.id
      );

      expect(result).toBeNull();
      const stored = supabaseMock.__getFake().store.get('ai_chat_sessions')
        .find(s => s.id === fx.tenantB.chatSession.id);
      expect(stored.context_snapshot).toEqual(fx.tenantB.chatSession.context_snapshot);
    });

    it('addMessage em sessão de outro usuário lança e não grava a mensagem', async () => {
      await expect(
        ChatSession.addMessage(fx.tenantB.chatSession.id, { role: 'user', content: 'invasão' }, fx.tenantA.user.id)
      ).rejects.toThrow();

      const stored = supabaseMock.__getFake().store.get('ai_chat_sessions')
        .find(s => s.id === fx.tenantB.chatSession.id);
      expect(stored.messages).toEqual([]);
    });
  });

  describe('AnalysisVersion — autorização derivada da análise pai (decisão P4)', () => {
    const semEscopo = [undefined, null, [], [undefined]];

    it.each(semEscopo)('getByAnalysisId lança MissingScopeError com escopo %p', async (scope) => {
      await expect(
        AnalysisVersion.getByAnalysisId(fx.tenantA.fightAnalysis.id, 'fight', scope)
      ).rejects.toThrow(MissingScopeError);
    });

    it.each(semEscopo)('getByVersionNumber lança MissingScopeError com escopo %p', async (scope) => {
      await expect(
        AnalysisVersion.getByVersionNumber(fx.tenantA.fightAnalysis.id, 'fight', 1, scope)
      ).rejects.toThrow(MissingScopeError);
    });

    it.each(semEscopo)('setAsCurrent lança MissingScopeError com escopo %p', async (scope) => {
      await expect(
        AnalysisVersion.setAsCurrent(fx.tenantA.version.id, fx.tenantA.fightAnalysis.id, 'fight', scope)
      ).rejects.toThrow(MissingScopeError);
    });

    it.each(semEscopo)('create lança MissingScopeError com escopo %p', async (scope) => {
      await expect(
        AnalysisVersion.create({
          analysisId: fx.tenantA.fightAnalysis.id,
          analysisType: 'fight',
          versionNumber: 2,
          content: {},
          editedBy: 'user',
          allowedUserIds: scope,
        })
      ).rejects.toThrow(MissingScopeError);
    });

    it('devolve as versões quando a análise pai está no escopo', async () => {
      const versions = await AnalysisVersion.getByAnalysisId(
        fx.tenantA.fightAnalysis.id, 'fight', [fx.tenantA.user.id]
      );

      expect(versions).toHaveLength(1);
      expect(versions[0].id).toBe(fx.tenantA.version.id);
    });

    it('devolve lista vazia quando a análise pai é de outro tenant', async () => {
      const versions = await AnalysisVersion.getByAnalysisId(
        fx.tenantB.fightAnalysis.id, 'fight', [fx.tenantA.user.id]
      );

      expect(versions).toEqual([]);
    });

    it('getByVersionNumber devolve null quando a análise pai é de outro tenant', async () => {
      const version = await AnalysisVersion.getByVersionNumber(
        fx.tenantB.fightAnalysis.id, 'fight', 1, [fx.tenantA.user.id]
      );

      expect(version).toBeNull();
    });

    it('admin alcança as versões de uma análise de membro do próprio grupo', async () => {
      const escopoDoAdmin = [fx.tenantA.admin.id, fx.tenantA.user.id];
      const versions = await AnalysisVersion.getByAnalysisId(
        fx.tenantA.fightAnalysis.id, 'fight', escopoDoAdmin
      );

      expect(versions).toHaveLength(1);
    });

    it('setAsCurrent em análise de outro tenant lança AuthorizationError', async () => {
      await expect(
        AnalysisVersion.setAsCurrent(
          fx.tenantB.version.id, fx.tenantB.fightAnalysis.id, 'fight', [fx.tenantA.user.id]
        )
      ).rejects.toThrow(AuthorizationError);
    });

    it('create em análise de outro tenant lança AuthorizationError e não insere', async () => {
      await expect(
        AnalysisVersion.create({
          analysisId: fx.tenantB.fightAnalysis.id,
          analysisType: 'fight',
          versionNumber: 99,
          content: { summary: 'invadido' },
          editedBy: 'user',
          allowedUserIds: [fx.tenantA.user.id],
        })
      ).rejects.toThrow(AuthorizationError);

      const rows = supabaseMock.__getFake().store.get('analysis_versions')
        .filter(v => v.analysis_id === fx.tenantB.fightAnalysis.id);
      expect(rows).toHaveLength(1); // só a versão original da fixture
    });

    it('analysis_type fora do CHECK da migration 010 lança ValidationError', async () => {
      await expect(
        AnalysisVersion.getByAnalysisId(fx.tenantA.fightAnalysis.id, 'inventado', [fx.tenantA.user.id])
      ).rejects.toThrow(ValidationError);
    });

    it('autoriza versão de estratégia pela tactical_analyses pai', async () => {
      const dentro = await AnalysisVersion.isAnalysisInScope(
        fx.tenantA.tacticalAnalysis.id, 'tactical', [fx.tenantA.user.id]
      );
      const fora = await AnalysisVersion.isAnalysisInScope(
        fx.tenantB.tacticalAnalysis.id, 'tactical', [fx.tenantA.user.id]
      );

      expect(dentro).toBe(true);
      expect(fora).toBe(false);
    });
  });
});
