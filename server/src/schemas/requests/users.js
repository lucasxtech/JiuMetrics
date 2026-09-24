const { z } = require('zod');
const { PROFILES } = require('../../services/authorization');
const { BELTS } = require('./person');

/**
 * Schemas de ENTRADA dos endpoints de conta (spec 014).
 * Payload real do front atual, mapeado antes de escrever isto:
 *  - AdminUsers.createUser → { name, email, password }
 *  - AdminUsers.changeRole → { role }
 *  - AdminUsers.updateUser → { name?, password? }
 *  - AdminUsers.deleteUser → {} ou { transferToUserId } — o segundo passa a ser 400 (R-13)
 */
const email = z.string().trim().toLowerCase().email('Email inválido').max(254);
const password = z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').max(200);
const name = z.string().trim().min(1, 'Nome é obrigatório').max(255);
const profile = z.enum(PROFILES, { message: `profile deve ser um de: ${PROFILES.join(', ')}` });

const createUserSchema = z
  .object({
    name, email, password,
    profile: profile.default('atleta'),
    isAdmin: z.boolean().default(false),
    createAthlete: z.boolean().default(false),
    athlete: z.object({ belt: z.enum(BELTS) }).optional(),
  })
  .refine((b) => !b.createAthlete || Boolean(b.athlete && b.athlete.belt), {
    message: 'Para criar a ficha de atleta, informe athlete.belt',
    path: ['athlete', 'belt'],
  });

const updateUserSchema = z
  .object({ name: name.optional(), password: password.optional() })
  .refine((b) => b.name !== undefined || b.password !== undefined, { message: 'Informe ao menos nome ou senha para atualizar.' });

const changeRoleSchema = z.object({ role: z.enum(['admin', 'user'], { message: 'Role inválido. Use "admin" ou "user".' }) });
const changeProfileSchema = z.object({ profile });
const linkAthleteSchema = z.object({ athleteId: z.string().uuid().nullable() });
const changePasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword: password });
const deleteUserSchema = z.object({}).strict();

module.exports = {
  PROFILES, createUserSchema, updateUserSchema, changeRoleSchema, changeProfileSchema,
  linkAthleteSchema, changePasswordSchema, deleteUserSchema,
};
