jest.mock('../config/supabase', () => require('./authorization/support/supabaseMock'));

const {
  createUserSchema, changeProfileSchema, linkAthleteSchema, changePasswordSchema, deleteUserSchema, changeRoleSchema,
} = require('../schemas/requests/users');

describe('Spec 014 — schemas de usuário (R12)', () => {
  test('payload atual do AdminUsers (name, email, password) continua válido e vira atleta/usuário', () => {
    const r = createUserSchema.safeParse({ name: 'Ana', email: 'ana@x.com', password: 'abcdef' });
    expect(r.success).toBe(true);
    expect(r.data).toMatchObject({ profile: 'atleta', isAdmin: false, createAthlete: false });
  });
  test('createAthlete exige athlete.belt', () => {
    expect(createUserSchema.safeParse({ name: 'A', email: 'a@x.com', password: 'abcdef', profile: 'atleta', createAthlete: true }).success).toBe(false);
    expect(createUserSchema.safeParse({ name: 'A', email: 'a@x.com', password: 'abcdef', profile: 'atleta', createAthlete: true, athlete: { belt: 'Azul' } }).success).toBe(true);
  });
  test('profile fora do enum é rejeitado', () => {
    expect(createUserSchema.safeParse({ name: 'A', email: 'a@x.com', password: 'abcdef', profile: 'medico' }).success).toBe(false);
    expect(changeProfileSchema.safeParse({ profile: 'preparador_fisico' }).success).toBe(true);
  });
  test('linkAthlete aceita uuid ou null', () => {
    expect(linkAthleteSchema.safeParse({ athleteId: null }).success).toBe(true);
    expect(linkAthleteSchema.safeParse({ athleteId: '123' }).success).toBe(false);
    expect(linkAthleteSchema.safeParse({ athleteId: '9f1b2f7e-9d2a-4c7f-8b1e-0a1b2c3d4e5f' }).success).toBe(true);
  });
  test('changePassword exige as duas senhas, nova com 6+', () => {
    expect(changePasswordSchema.safeParse({ currentPassword: 'x', newPassword: '12345' }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ currentPassword: 'x', newPassword: '123456' }).success).toBe(true);
  });
  test('deleteUser rejeita transferToUserId', () => {
    expect(deleteUserSchema.safeParse({}).success).toBe(true);
    expect(deleteUserSchema.safeParse({ transferToUserId: 'abc' }).success).toBe(false);
  });
  test('changeRole aceita só admin|user (payload atual do front)', () => {
    expect(changeRoleSchema.safeParse({ role: 'admin' }).success).toBe(true);
    expect(changeRoleSchema.safeParse({ role: 'root' }).success).toBe(false);
  });
});
