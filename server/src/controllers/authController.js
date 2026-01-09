const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const JWT_EXPIRES_IN_REMEMBER = '30d';
const ALLOWED_EMAILS = ['lucas.menezes@clint.digital', 'contateste@teste.com'];

const ERROR_MESSAGES = {
  REQUIRED_FIELDS: 'Todos os campos são obrigatórios',
  INVALID_EMAIL: 'Email inválido',
  SHORT_PASSWORD: 'Senha deve ter no mínimo 6 caracteres',
  EMAIL_EXISTS: 'Email já cadastrado',
  UNAUTHORIZED_EMAIL: 'Este email não tem permissão para acessar o sistema',
  INVALID_CREDENTIALS: 'Email ou senha incorretos',
};

const generateToken = (userId, rememberMe = false) => {
  return jwt.sign(
    { userId },
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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: ERROR_MESSAGES.INVALID_EMAIL });
    }

    const isEmailAllowed = ALLOWED_EMAILS.some(
      allowedEmail => allowedEmail.toLowerCase() === email.toLowerCase()
    );
    if (!isEmailAllowed) {
      return res.status(403).json({ error: ERROR_MESSAGES.UNAUTHORIZED_EMAIL });
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: ERROR_MESSAGES.EMAIL_EXISTS });
    }

    const user = await User.create({ name, email, password });
    const token = generateToken(user.id);
    await User.updateLastLogin(user.id);

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
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

    const isEmailAllowed = ALLOWED_EMAILS.some(
      allowedEmail => allowedEmail.toLowerCase() === email.toLowerCase()
    );
    if (!isEmailAllowed) {
      console.log('❌ Unauthorized email:', email, 'Allowed:', ALLOWED_EMAILS);
      return res.status(403).json({ error: ERROR_MESSAGES.UNAUTHORIZED_EMAIL });
    }

    const user = await User.findByEmail(email);
    console.log('👤 User found:', !!user);
    
    if (!user) {
      console.log('❌ User not found in database');
      return res.status(401).json({ error: ERROR_MESSAGES.INVALID_CREDENTIALS });
    }

    console.log('🔑 Verifying password...');
    const isValidPassword = await User.verifyPassword(password, user.password_hash);
    console.log('🔑 Password valid:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('❌ Invalid password');
      return res.status(401).json({ error: ERROR_MESSAGES.INVALID_CREDENTIALS });
    }

    const token = generateToken(user.id, rememberMe);
    await User.updateLastLogin(user.id);

    console.log('✅ Login successful for:', email);
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      token
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
};
