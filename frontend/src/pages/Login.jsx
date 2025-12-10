import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../services/authService';

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await login(formData.email, formData.password, formData.rememberMe);
      if (response.success) {
        navigate('/');
      } else {
        setError(response.error || 'Email ou senha inválidos');
      }
    } catch (err) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4 py-12">
      <div className="w-full max-w-[560px]">
        {/* Header - Logo + Brand */}
        <div className="text-center mb-12">
          {/* Logo - Ícone da faixa preta */}
          <div className="inline-flex items-center justify-center mb-6">
            <svg 
              width="56" 
              height="56" 
              viewBox="0 0 800 600" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="opacity-80"
            >
              <path 
                d="M175 322L386 290L598 322L463 430L463 523L337 523L337 430L175 322Z" 
                fill="#E5E5E5"
              />
              <path 
                d="M143 350L335 322L335 392L143 420L143 350Z" 
                fill="#E5E5E5"
              />
              <path 
                d="M465 322L657 350L657 420L465 392L465 322Z" 
                fill="#E5E5E5"
              />
            </svg>
          </div>

          {/* Brand Name */}
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
            JiuMetrics
          </h1>
          <p className="text-gray-400 text-base">
            Análise Tática de Jiu-Jitsu
          </p>
        </div>

        {/* Card de Login */}
        <div className="bg-[#1a1a1a] rounded-2xl p-10 border border-gray-800">
          {/* Título do Card */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              Entrar na plataforma
            </h2>
            <p className="text-gray-400 text-sm">
              Acesse sua conta para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Campo Email */}
            <div>
              <label 
                htmlFor="email" 
                className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider"
              >
                Endereço de email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full h-12 px-4 bg-black border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
                placeholder="seu@email.com"
              />
            </div>

            {/* Campo Senha */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label 
                  htmlFor="password" 
                  className="block text-xs font-medium text-gray-400 uppercase tracking-wider"
                >
                  Senha
                </label>
                <Link 
                  to="/forgot-password" 
                  className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
                >
                  Esqueceu?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full h-12 px-4 bg-black border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
                placeholder="••••••••••"
              />
            </div>

            {/* Checkbox - Lembrar-me */}
            <div className="flex items-center pt-1">
              <input
                type="checkbox"
                id="rememberMe"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                className="w-4 h-4 rounded border-gray-700 bg-black text-white focus:ring-2 focus:ring-gray-600 focus:ring-offset-0 cursor-pointer"
              />
              <label 
                htmlFor="rememberMe" 
                className="ml-3 text-sm text-gray-400 cursor-pointer select-none"
              >
                Manter-me conectado
              </label>
            </div>

            {/* Mensagem de Erro */}
            {error && (
              <div className="bg-red-950/50 border border-red-900 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Botão de Login */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-white text-black font-semibold text-sm rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            {/* Separador */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-800" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-4 bg-[#1a1a1a] text-gray-500 uppercase tracking-wider">
                  ou
                </span>
              </div>
            </div>

            {/* Botão Google */}
            <button
              type="button"
              className="w-full h-12 bg-black border border-gray-800 text-white font-medium text-sm rounded-lg hover:bg-gray-900 transition-colors flex items-center justify-center gap-3"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M19.805 10.227c0-.709-.064-1.39-.182-2.045H10.2v3.868h5.383a4.6 4.6 0 01-1.996 3.018v2.51h3.232c1.891-1.742 2.986-4.305 2.986-7.35z" fill="#4285F4"/>
                <path d="M10.2 20c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.596-4.123H1.277v2.59A9.996 9.996 0 0010.2 20z" fill="#34A853"/>
                <path d="M4.604 11.9a6.014 6.014 0 010-3.8V5.51H1.277a9.996 9.996 0 000 8.98l3.327-2.59z" fill="#FBBC04"/>
                <path d="M10.2 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C15.159.99 12.9 0 10.2 0A9.996 9.996 0 001.277 5.51l3.327 2.59c.786-2.364 2.99-4.123 5.596-4.123z" fill="#EA4335"/>
              </svg>
              Entrar com Google
            </button>
          </form>

          {/* Link de Registro */}
          <div className="mt-8 pt-6 border-t border-gray-800">
            <p className="text-center text-sm text-gray-400">
              Não tem uma conta?{' '}
              <Link 
                to="/register" 
                className="text-white font-medium hover:underline"
              >
                Criar conta gratuita
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
