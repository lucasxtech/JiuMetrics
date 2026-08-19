/**
 * SPEC-007 — as funcionalidades que falhavam em silêncio.
 *
 * ⚠️ **Estes testes verificam a LINHA NO BANCO, não o status HTTP.** É a
 * exigência central da spec: as três funcionalidades quebradas devolviam
 * **200** com o dado não gravado, então um teste de status passaria com o bug
 * presente. Foi exatamente assim que elas sobreviveram meses.
 *
 * Reaproveita o harness da spec 004 (`authorization/support/`) — fixtures de
 * 2 tenants e fake de PostgREST em memória. O diretório se chama
 * `authorization` por ter nascido lá; os helpers são de propósito geral.
 *
 * ⚠️ **O fake NÃO impõe `NOT NULL`.** Em produção, o contrato quebrado fazia o
 * insert violar as constraints da migration 013; no fake, o insert passaria com
 * os campos `undefined`. Por isso estes testes afirmam os **valores** de cada
 * campo, não apenas a existência da linha — é o que os torna capazes de
 * detectar o defeito sem depender da constraint. Foram verificados falhando
 * com o contrato antigo reintroduzido.
 */
jest.mock('../config/supabase', () => require('./authorization/support/supabaseMock'));
jest.mock('../services/geminiService');
jest.mock('../services/strategyService');
jest.mock('../utils/apiUsageLogger');

const request = require('supertest');
const supabaseMock = require('./authorization/support/supabaseMock');
const { createFakeSupabase } = require('./authorization/support/fakeSupabase');
const { buildFixtures, authHeader } = require('./authorization/support/fixtures');
const { loadApp } = require('./authorization/support/loadApp');
const geminiService = require('../services/geminiService');
const StrategyService = require('../services/strategyService');

const app = loadApp();

const rows = (table) => supabaseMock.__getFake().store.get(table) || [];

describe('SPEC-007 — persistência que falhava em silêncio', () => {
  let fx;

  beforeEach(() => {
    fx = buildFixtures();
    StrategyService.consolidateAnalyses.mockResolvedValue({ resumo: 'consolidado', analysesCount: 1 });
    geminiService.chat.mockResolvedValue({
      message: 'ok',
      editSuggestion: null,
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2, modelName: 'gemini-test' },
    });
  });

  describe('R1 — versionamento de perfil técnico (quebrado desde 2026-01-16)', () => {
    it('salvar resumo CRIA linha em profile_versions com o conteúdo anterior', async () => {
      fx.tenantA.athlete.technical_summary = 'resumo ANTERIOR do atleta';
      supabaseMock.__setFake(createFakeSupabase(fx.seedRows));

      const res = await request(app)
        .post('/api/chat/profile-save')
        .set('Authorization', authHeader(fx.tenantA.user))
        .send({
          personId: fx.tenantA.athlete.id,
          personType: 'athlete',
          newSummary: 'resumo NOVO',
        });

      expect(res.status).toBe(200);

      // A prova: a linha existe e tem os campos NOT NULL preenchidos.
      // Com o contrato quebrado, todos vinham `undefined`.
      const versions = rows('profile_versions');
      expect(versions).toHaveLength(1);
      expect(versions[0].content).toBe('resumo ANTERIOR do atleta');
      expect(versions[0].person_id).toBe(fx.tenantA.athlete.id);
      expect(versions[0].person_type).toBe('athlete');
      expect(versions[0].user_id).toBe(fx.tenantA.user.id);
      expect(versions[0].edited_by).toBe('user');
      expect(versions[0].version_number).toBe(1);
    });

    it('o resumo NOVO fica no atleta, não na tabela de versões', async () => {
      fx.tenantA.athlete.technical_summary = 'resumo ANTERIOR';
      supabaseMock.__setFake(createFakeSupabase(fx.seedRows));

      await request(app)
        .post('/api/chat/profile-save')
        .set('Authorization', authHeader(fx.tenantA.user))
        .send({ personId: fx.tenantA.athlete.id, personType: 'athlete', newSummary: 'resumo NOVO' });

      const athlete = rows('athletes').find((a) => a.id === fx.tenantA.athlete.id);
      expect(athlete.technical_summary).toBe('resumo NOVO');
    });

    it('segunda edição empilha a versão 2, com o motivo informado', async () => {
      fx.tenantA.athlete.technical_summary = 'v1';
      supabaseMock.__setFake(createFakeSupabase(fx.seedRows));

      await request(app)
        .post('/api/chat/profile-save')
        .set('Authorization', authHeader(fx.tenantA.user))
        .send({ personId: fx.tenantA.athlete.id, personType: 'athlete', newSummary: 'v2' });

      await request(app)
        .post('/api/chat/profile-save')
        .set('Authorization', authHeader(fx.tenantA.user))
        .send({
          personId: fx.tenantA.athlete.id,
          personType: 'athlete',
          newSummary: 'v3',
          editReason: 'ajuste manual',
        });

      const versions = rows('profile_versions').sort((a, b) => a.version_number - b.version_number);
      expect(versions).toHaveLength(2);
      expect(versions[0].content).toBe('v1');
      expect(versions[0].edit_reason).toBe('Versão original');
      expect(versions[1].content).toBe('v2');
      expect(versions[1].edit_reason).toBe('ajuste manual');
    });

    it('pessoa SEM resumo anterior: não versiona e não falha', async () => {
      // `content` é NOT NULL (migration 013). Este é o caminho comum na
      // primeira edição de um perfil — se ele lançasse, propagar o erro
      // transformaria toda primeira edição num 500.
      expect(fx.tenantA.athlete.technical_summary).toBeNull();
      supabaseMock.__setFake(createFakeSupabase(fx.seedRows));

      const res = await request(app)
        .post('/api/chat/profile-save')
        .set('Authorization', authHeader(fx.tenantA.user))
        .send({ personId: fx.tenantA.athlete.id, personType: 'athlete', newSummary: 'primeiro resumo' });

      expect(res.status).toBe(200);
      expect(rows('profile_versions')).toHaveLength(0);
      const athlete = rows('athletes').find((a) => a.id === fx.tenantA.athlete.id);
      expect(athlete.technical_summary).toBe('primeiro resumo');
    });
  });

  describe('R2 — technical_profile do atleta (0 de 37 preenchidos antes desta spec)', () => {
    it('criar análise ALTERA athletes.technical_profile', async () => {
      supabaseMock.__setFake(createFakeSupabase(fx.seedRows));
      const antes = rows('athletes').find((a) => a.id === fx.tenantA.athlete.id);
      expect(antes.technical_profile).toEqual({});

      const res = await request(app)
        .post('/api/fight-analysis')
        .set('Authorization', authHeader(fx.tenantA.user))
        .send({
          personId: fx.tenantA.athlete.id,
          personType: 'athlete',
          videoUrl: 'https://youtube.com/watch?v=abc',
          summary: 'resumo',
          charts: [
            { title: 'Personalidade Geral', data: [{ label: 'Agressivo/Ofensivo', value: 70 }] },
            { title: 'Jogo de Guarda', data: [{ label: 'Guarda Fechada', value: 60 }] },
          ],
        });

      expect(res.status).toBe(201);

      const depois = rows('athletes').find((a) => a.id === fx.tenantA.athlete.id);
      expect(depois.technical_profile).not.toEqual({});
      expect(depois.technical_profile.personality).toEqual({ 'Agressivo/Ofensivo': 70 });
      expect(depois.technical_profile.guardGame).toEqual({ 'Guarda Fechada': 60 });
      // A posse não migra para quem editou
      expect(depois.user_id).toBe(fx.tenantA.user.id);
    });

    it('o merge PRESERVA o perfil existente em vez de descartá-lo', async () => {
      fx.tenantA.athlete.technical_profile = { guardGame: { 'Guarda Aberta': 40 } };
      supabaseMock.__setFake(createFakeSupabase(fx.seedRows));

      await request(app)
        .post('/api/fight-analysis')
        .set('Authorization', authHeader(fx.tenantA.user))
        .send({
          personId: fx.tenantA.athlete.id,
          personType: 'athlete',
          videoUrl: 'https://youtube.com/watch?v=abc',
          summary: 'resumo',
          charts: [{ title: 'Personalidade Geral', data: [{ label: 'Calmo/Controlador', value: 80 }] }],
        });

      const depois = rows('athletes').find((a) => a.id === fx.tenantA.athlete.id);
      // chave nova entrou...
      expect(depois.technical_profile.personality).toEqual({ 'Calmo/Controlador': 80 });
      // ...e a antiga sobreviveu. `Athlete` lia `technical_profile` de um
      // objeto camelCase, então o spread era de `undefined` e o perfil
      // anterior era descartado a cada análise.
      expect(depois.technical_profile.guardGame).toEqual({ 'Guarda Aberta': 40 });
    });

    it('updateTechnicalProfile LANÇA quando a pessoa está fora do escopo', async () => {
      supabaseMock.__setFake(createFakeSupabase(fx.seedRows));
      const Athlete = require('../models/Athlete');

      await expect(
        Athlete.updateTechnicalProfile(fx.tenantB.athlete.id, { x: 1 }, [fx.tenantA.user.id])
      ).rejects.toThrow(/não encontrado/i);
    });
  });

  describe('R4 — versões de análise preservam as estatísticas técnicas', () => {
    it('a versão salva contém technicalStats, não undefined', async () => {
      const stats = { sweeps: { quantidade: 3, efetividade_percentual: 66 } };
      fx.tenantA.fightAnalysis.technical_stats = stats;
      // sem versões pré-existentes, para exercitar ensureOriginalVersion
      fx.seedRows.analysis_versions = [];
      supabaseMock.__setFake(createFakeSupabase(fx.seedRows));

      const res = await request(app)
        .post('/api/chat/manual-edit')
        .set('Authorization', authHeader(fx.tenantA.user))
        .send({
          analysisId: fx.tenantA.fightAnalysis.id,
          field: 'summary',
          newValue: 'resumo editado à mão',
        });

      expect(res.status).toBe(200);

      const versions = rows('analysis_versions').sort((a, b) => a.version_number - b.version_number);
      // v1 = original (antes da edição), v2 = estado após a edição
      expect(versions).toHaveLength(2);
      expect(versions[0].content.technicalStats).toEqual(stats);
      expect(versions[1].content.technicalStats).toEqual(stats);
    });
  });
});
