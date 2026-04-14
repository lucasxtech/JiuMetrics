import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../services/authService';
import beltIcon from './download.ico';
import styles from './ModernLogin.module.css';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]  = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [shake, setShake] = useState(false);

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 500); };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, password, confirmPassword } = formData;

    if (!name || !email || !password || !confirmPassword) {
      setError('Preencha todos os campos para continuar.'); triggerShake(); return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.'); triggerShake(); return;
    }
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.'); triggerShake(); return;
    }

    setLoading(true); setError('');
    try {
      const response = await register({ name, email, password });
      if (response.success) {
        navigate('/');
      } else {
        setError(response.error || 'Erro ao criar conta'); triggerShake();
      }
    } catch {
      setError('Problema de conexão. Tente novamente.'); triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const EyeIcon = ({ visible }) => visible ? (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );

  return (
    <div className={styles.root}>
      {/* ── Painel esquerdo ── */}
      <div className={styles.left}>
        <div className={styles.leftInner}>
          <div className={styles.brandLogo}>
            <img src={beltIcon} alt="JiuMetrics" className={styles.beltImg} />
          </div>
          <h1 className={styles.brandName}>JiuMetrics</h1>
          <p className={styles.brandTagline}>Comece agora e leve a análise dos seus atletas para outro nível</p>

          <ul className={styles.features}>
            <li>
              <span className={styles.featIcon}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </span>
              Cadastro rápido e gratuito
            </li>
            <li>
              <span className={styles.featIcon}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </span>
              Dados isolados e seguros
            </li>
            <li>
              <span className={styles.featIcon}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </span>
              IA ativa imediatamente após o cadastro
            </li>
          </ul>
        </div>
        <div className={styles.circle1} />
        <div className={styles.circle2} />
        <div className={styles.circle3} />
      </div>

      {/* ── Painel direito ── */}
      <div className={styles.right}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>Criar conta</h2>
            <p>Preencha os dados abaixo para começar</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            {/* Nome */}
            <div className={styles.field}>
              <label htmlFor="name">Nome completo</label>
              <input
                type="text" id="name" name="name"
                value={formData.name} onChange={handleChange}
                placeholder="Seu nome completo"
                autoComplete="name" disabled={loading}
              />
            </div>

            {/* Email */}
            <div className={styles.field}>
              <label htmlFor="email">E-mail</label>
              <input
                type="email" id="email" name="email"
                value={formData.email} onChange={handleChange}
                placeholder="seu@email.com"
                autoComplete="email" disabled={loading}
              />
            </div>

            {/* Senha */}
            <div className={styles.field}>
              <label htmlFor="password">Senha</label>
              <div className={styles.pwWrap}>
                <input
                  type={showPassword ? 'text' : 'password'} id="password" name="password"
                  value={formData.password} onChange={handleChange}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password" disabled={loading}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)} tabIndex={-1} className={styles.eyeBtn} aria-label="alternar visibilidade">
                  <EyeIcon visible={showPassword} />
                </button>
              </div>
            </div>

            {/* Confirmar senha */}
            <div className={styles.field}>
              <label htmlFor="confirmPassword">Confirmar senha</label>
              <div className={styles.pwWrap}>
                <input
                  type={showConfirm ? 'text' : 'password'} id="confirmPassword" name="confirmPassword"
                  value={formData.confirmPassword} onChange={handleChange}
                  placeholder="Repita a senha"
                  autoComplete="new-password" disabled={loading}
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)} tabIndex={-1} className={styles.eyeBtn} aria-label="alternar visibilidade">
                  <EyeIcon visible={showConfirm} />
                </button>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className={`${styles.errorBox} ${shake ? styles.shake : ''}`}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className={styles.submitBtn}>
              {loading ? <><span className={styles.spin} /><span>Criando conta...</span></> : 'Criar conta'}
            </button>
          </form>

          <div className={styles.formFooter}>
            <span>Já tem uma conta?</span>
            <Link to="/login">Fazer login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
