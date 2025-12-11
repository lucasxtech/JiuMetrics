import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../services/authService';
import beltIcon from './download.ico';
import styles from './ModernLogin.module.css';

export default function ModernLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const { email, password } = formData;
    if (!email || !password) {
      setError('Preencha e-mail e senha para continuar!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await login({
        email: formData.email,
        password: formData.password,
        rememberMe: formData.rememberMe
      });
      
      if (response.success) {
        navigate('/');
      } else {
        setError(response.error || 'Email ou senha inválidos');
      }
    } catch {
      setError('Houve um problema com o login, verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        {/* Header */}
        <div className={styles.loginHeader}>
          <div className="logo">
            <img 
              src={beltIcon}
              alt="Faixa Preta"
              style={{ width: '3rem', height: '3rem' }}
            />
          </div>
          <h1>JiuMetrics</h1>
          <p>Entre na sua conta</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.loginForm}>
          {/* Email */}
          <div className={styles.formGroup}>
            <label htmlFor="email">E-mail</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="seu@email.com"
              required
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div className={styles.formGroup}>
            <div className="label-row">
              <label htmlFor="password">Senha</label>
              <Link to="/forgot-password" className="forgot-link">
                Esqueceu a senha?
              </Link>
            </div>
            <div className={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? (
                  <svg width="1.25rem" height="1.25rem" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg width="1.25rem" height="1.25rem" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="checkbox-group">
            <input
              type="checkbox"
              id="rememberMe"
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleChange}
            />
            <label htmlFor="rememberMe">Manter-me conectado</label>
          </div>

          {/* Error Message */}
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? (
              <>
                <svg className="spinner" width="1.25rem" height="1.25rem" viewBox="0 0 24 24">
                  <circle className="spinner-circle" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="spinner-path" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Entrando...</span>
              </>
            ) : (
              'Entrar'
            )}
          </button>

          {/* Divider */}
          <div className="divider">
            <span>ou</span>
          </div>

          {/* Google Button */}
          <button type="button" className="google-button">
            <svg width="1.25rem" height="1.25rem" viewBox="0 0 20 20" fill="none">
              <path d="M19.805 10.227c0-.709-.064-1.39-.182-2.045H10.2v3.868h5.383a4.6 4.6 0 01-1.996 3.018v2.51h3.232c1.891-1.742 2.986-4.305 2.986-7.35z" fill="#4285F4"/>
              <path d="M10.2 20c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.596-4.123H1.277v2.59A9.996 9.996 0 0010.2 20z" fill="#34A853"/>
              <path d="M4.604 11.9a6.014 6.014 0 010-3.8V5.51H1.277a9.996 9.996 0 000 8.98l3.327-2.59z" fill="#FBBC04"/>
              <path d="M10.2 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C15.159.99 12.9 0 10.2 0A9.996 9.996 0 001.277 5.51l3.327 2.59c.786-2.364 2.99-4.123 5.596-4.123z" fill="#EA4335"/>
            </svg>
            Continuar com Google
          </button>
        </form>

        {/* Footer */}
        <div className={styles.loginFooter}>
          <p>
            Não tem uma conta?{' '}
            <Link to="/register">Criar conta</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
