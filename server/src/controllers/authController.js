const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const JWT_EXPIRES_IN_REMEMBER = '30d';

// Registro público desabilitado — admin cria usuários via /api/admin/users
// Para habilitar registro público (ex.: setup inicial), defina ALLOW_PUBLIC_REGISTER=true no .env
const ALLOW_PUBLIC_REGISTER = process.env.ALLOW_PUBLIC_REGISTER === 'true';

const ERROR_MESSAGES = {
  REQUIRED_FIELDS: 'Todos os campos são obrigatórios',
  INVALID_EMAIL: 'Email inválido',
  SHORT_PASSWORD: 'Senha deve ter no mínimo 6 caracteres',
  EMAIL_EXISTS: 'Email já cadastrado',
  REGISTRATION_DISABLED: 'O registro público está desabilitado. Contate o administrador.',
  INVALID_CREDENTIALS: 'Email ou senha incorretos',
  INACTIVE_USER: 'Sua conta está desativada. Contate o administrador.',
};

const generateToken = (userId, role = 'user', rememberMe = false, tokenVersion = 1) => {
  return jwt.sign(
    { userId, role, tokenVersion },
    JWT_SECRET,
    { expiresIn: rememberMe ? JWT_EXPIRES_IN_REMEMBER : JWT_EXPIRES_IN }
  );
};

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: ERROR_MESSAGES.REQUIRED_FIELDS });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: ERROR_MESSAGES.SHORT_PASSWORD });
    }

    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
      return res.status(400).json({ error: ERROR_MESSAGES.INVALID_EMAIL });
    }

    if (!ALLOW_PUBLIC_REGISTER) {
      return res.status(403).json({ error: ERROR_MESSAGES.REGISTRATION_DISABLED });
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: ERROR_MESSAGES.EMAIL_EXISTS });
    }

    const user = await User.create({ name, email, password });
    const token = generateToken(user.id, user.role || 'user', false, user.token_version || 1);
    await User.updateLastLogin(user.id);

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'user'
      },
      token
    });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    console.log('🔐 Login attempt:', { email, hasPassword: !!password });

    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const user = await User.findByEmail(email);
    console.log('👤 User found:', !!user);
    
    if (!user) {
      console.log('❌ User not found in database');
      return res.status(401).json({ error: ERROR_MESSAGES.INVALID_CREDENTIALS });
    }

    if (user.is_active === false) {
      console.log('❌ Inactive user:', email);
      return res.status(403).json({ error: ERROR_MESSAGES.INACTIVE_USER });
    }

    console.log('🔑 Verifying password...');
    const isValidPassword = await User.verifyPassword(password, user.password_hash);
    console.log('🔑 Password valid:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('❌ Invalid password');
      return res.status(401).json({ error: ERROR_MESSAGES.INVALID_CREDENTIALS });
    }

    const token = generateToken(user.id, user.role || 'user', rememberMe, user.token_version || 1);
    await User.updateLastLogin(user.id);

    console.log('✅ Login successful for:', email, '| role:', user.role);
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'user'
      },
      token
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
};
