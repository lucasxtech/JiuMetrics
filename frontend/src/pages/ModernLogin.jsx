import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { login } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import beltIcon from './download.ico';
import styles from './ModernLogin.module.css';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

export default function ModernLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUserFromLoginResponse } = useAuth();
  const from = location.state?.from?.pathname || '/';

  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockout, setLockout] = useState(0); // segundos restantes
  const [shake, setShake] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (lockout <= 0) return;
    timerRef.current = setInterval(() => {
      setLockout(s => {
        if (s <= 1) { clearInterval(timerRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [lockout]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lockout > 0) return;

    const { email, password } = formData;
    if (!email || !password) {
      setError('Preencha e-mail e senha para continuar.');
      triggerShake();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await login({ email, password, rememberMe: formData.rememberMe });

      if (response.success) {
        setAttempts(0);
        setUserFromLoginResponse(response.user);
        navigate(from, { replace: true });
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        triggerShake();
        if (newAttempts >= MAX_ATTEMPTS) {
          setAttempts(0);
          setLockout(LOCKOUT_SECONDS);
          setError(`Muitas tentativas. Aguarde ${LOCKOUT_SECONDS} segundos.`);
        } else {
          setError(`E-mail ou senha inválidos. ${MAX_ATTEMPTS - newAttempts} tentativa${MAX_ATTEMPTS - newAttempts !== 1 ? 's' : ''} restante${MAX_ATTEMPTS - newAttempts !== 1 ? 's' : ''}.`);
        }
      }
    } catch {
      setError('Problema de conexão. Tente novamente.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const isLocked = lockout > 0;

  return (
    <div className={styles.root}>
      {/* ── Painel esquerdo ── */}
      <div className={styles.left}>
        <div className={styles.leftInner}>
          <div className={styles.brandLogo}>
            <img src={beltIcon} alt="JiuMetrics" className={styles.beltImg} />
          </div>
          <h1 className={styles.brandName}>JiuMetrics</h1>
          <p className={styles.brandTagline}>Análise inteligente para atletas de alto rendimento</p>

          <ul className={styles.features}>
            <li>
              <span className={styles.featIcon}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.87V15.13a1 1 0 01-1.447.9L15 14M3 8h12a2 2 0 012 2v4a2 2 0 01-2 2H3a2 2 0 01-2-2v-4a2 2 0 012-2z" /></svg>
              </span>
              Análise de vídeo com IA
            </li>
            <li>
              <span className={styles.featIcon}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </span>
              Estratégias táticas personalizadas
            </li>
            <li>
              <span className={styles.featIcon}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </span>
              Gestão completa de atletas
            </li>
          </ul>
        </div>

        {/* decoração: círculos */}
        <div className={styles.circle1} />
        <div className={styles.circle2} />
        <div className={styles.circle3} />
      </div>

      {/* ── Painel direito ── */}
      <div className={styles.right}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>Bem-vindo de volta</h2>
            <p>Entre com suas credenciais para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            {/* Email */}
            <div className={styles.field}>
              <label htmlFor="email">E-mail</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="seu@email.com"
                autoComplete="email"
                disabled={isLocked || loading}
              />
            </div>

            {/* Senha */}
            <div className={styles.field}>
              <label htmlFor="password">Senha</label>
              <div className={styles.pwWrap}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isLocked || loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className={styles.eyeBtn}
                >
                  {showPassword ? (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className={styles.checkRow}>
              <label className={styles.checkLabel}>
                <div className={`${styles.toggle} ${formData.rememberMe ? styles.toggleOn : ''}`}>
                  <div className={styles.toggleThumb} />
                </div>
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                />
                <span>Manter-me conectado</span>
              </label>
            </div>

            {/* Erro */}
            {error && (
              <div className={`${styles.errorBox} ${shake ? styles.shake : ''}`}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                <span>{error}</span>
              </div>
            )}

            {/* Lockout progress */}
            {isLocked && (
              <div className={styles.lockoutBar}>
                <div
                  className={styles.lockoutFill}
                  style={{ width: `${(lockout / LOCKOUT_SECONDS) * 100}%` }}
                />
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={loading || isLocked}
              className={styles.submitBtn}
            >
              {loading ? (
                <><span className={styles.spin} /><span>Entrando...</span></>
              ) : isLocked ? (
                <><span className={styles.lockIcon}><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></span><span>Aguarde {lockout}s</span></>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          <div className={styles.formFooter}>
            <span>Não tem uma conta?</span>
            <Link to="/register">Criar conta</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
