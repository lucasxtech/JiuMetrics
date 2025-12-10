import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../services/authService';
import beltIcon from './download.ico';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const { name, email, password, confirmPassword } = formData;
    
    if (!name || !email || !password || !confirmPassword) {
      setError('Preencha todos os campos para continuar!');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem!');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password
      });
      
      if (response.success) {
        navigate('/');
      } else {
        setError(response.error || 'Erro ao criar conta');
      }
    } catch (err) {
      setError('Houve um problema ao criar sua conta, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        {/* Header */}
        <div className="register-header">
          <div className="logo">
            <img 
              src={beltIcon}
              alt="Faixa Preta"
              style={{ width: '3rem', height: '3rem' }}
            />
          </div>
          <h1>Criar Conta</h1>
          <p>Comece a analisar seus treinos</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="register-form">
          {/* Name */}
          <div className="form-group">
            <label htmlFor="name">Nome Completo</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Seu nome completo"
              required
              autoComplete="name"
            />
          </div>

          {/* Email */}
          <div className="form-group">
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
          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Mínimo 6 caracteres"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
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

          {/* Confirm Password */}
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar Senha</label>
            <div className="password-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Digite a senha novamente"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showConfirmPassword ? (
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

          {/* Error Message */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? (
              <>
                <svg className="spinner" width="1.25rem" height="1.25rem" viewBox="0 0 24 24">
                  <circle className="spinner-circle" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="spinner-path" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Criando conta...</span>
              </>
            ) : (
              'Criar Conta'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="register-footer">
          <p>
            Já tem uma conta?{' '}
            <Link to="/login">Fazer login</Link>
          </p>
        </div>
      </div>

      <style jsx>{`
        /* Container Principal */
        .register-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        }

        /* Card de Registro */
        .register-card {
          width: 100%;
          max-width: 28rem;
          background: white;
          border-radius: 1.5rem;
          box-shadow: 0 1.25rem 3.125rem rgba(0, 0, 0, 0.15);
          padding: 3rem 2rem;
          animation: fadeInUp 0.6s ease-out;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(2rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Header */
        .register-header {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .logo {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 4rem;
          height: 4rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 1rem;
          color: white;
          margin-bottom: 1.5rem;
        }

        .register-header h1 {
          font-size: 2rem;
          font-weight: 700;
          color: #1a202c;
          margin: 0 0 0.5rem 0;
          letter-spacing: -0.025em;
        }

        .register-header p {
          font-size: 1rem;
          color: #718096;
          margin: 0;
        }

        /* Form */
        .register-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* Form Group */
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #2d3748;
          cursor: pointer;
        }

        /* Inputs */
        input[type="email"],
        input[type="password"],
        input[type="text"] {
          width: 100%;
          padding: 0.875rem 1rem;
          font-size: 1rem;
          border: 0.125rem solid #e2e8f0;
          border-radius: 0.75rem;
          transition: all 0.2s ease;
          font-family: inherit;
          background: #f7fafc;
        }

        input[type="email"]:focus,
        input[type="password"]:focus,
        input[type="text"]:focus {
          outline: none;
          border-color: #667eea;
          background: white;
          box-shadow: 0 0 0 0.25rem rgba(102, 126, 234, 0.1);
        }

        input::placeholder {
          color: #a0aec0;
        }

        /* Password Wrapper */
        .password-wrapper {
          position: relative;
        }

        .password-toggle {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #718096;
          cursor: pointer;
          padding: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s ease;
        }

        .password-toggle:hover {
          color: #2d3748;
        }

        /* Error Message */
        .error-message {
          padding: 0.875rem 1rem;
          background: #fff5f5;
          border: 0.0625rem solid #fc8181;
          border-radius: 0.75rem;
          color: #c53030;
          font-size: 0.875rem;
          font-weight: 500;
          animation: shake 0.4s ease;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-0.5rem); }
          75% { transform: translateX(0.5rem); }
        }

        /* Submit Button */
        .submit-button {
          width: 100%;
          padding: 1rem;
          font-size: 1rem;
          font-weight: 600;
          color: white;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 0.75rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.625rem;
          font-family: inherit;
        }

        .submit-button:hover:not(:disabled) {
          transform: translateY(-0.125rem);
          box-shadow: 0 0.625rem 1.875rem rgba(102, 126, 234, 0.4);
        }

        .submit-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Spinner */
        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .spinner-circle {
          opacity: 0.25;
          fill: none;
        }

        .spinner-path {
          opacity: 0.75;
        }

        /* Footer */
        .register-footer {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 0.0625rem solid #e2e8f0;
          text-align: center;
        }

        .register-footer p {
          margin: 0;
          font-size: 0.875rem;
          color: #718096;
        }

        .register-footer a {
          color: #667eea;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.2s ease;
        }

        .register-footer a:hover {
          color: #764ba2;
        }

        /* Responsive */
        @media (max-width: 48em) {
          .register-card {
            padding: 2rem 1.5rem;
          }

          .register-header h1 {
            font-size: 1.75rem;
          }

          .submit-button {
            padding: 0.875rem;
          }
        }

        @media (max-width: 30em) {
          .register-container {
            padding: 1rem;
          }

          .register-card {
            padding: 1.5rem 1rem;
          }

          .register-header h1 {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
