import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../services/authService';

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Nome é obrigatório');
      return false;
    }
    if (!formData.email.includes('@')) {
      setError('Email inválido');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Senha deve ter no mínimo 6 caracteres');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const response = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password
      });

      if (response.success) {
        navigate('/login', { 
          state: { message: 'Conta criada com sucesso! Faça login para continuar.' }
        });
      } else {
        setError(response.error || 'Erro ao criar conta');
      }
    } catch (err) {
      setError(err.message || 'Erro ao conectar com o servidor');
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

        {/* Card de Registro */}
        <div className="bg-[#1a1a1a] rounded-2xl p-10 border border-gray-800">
          {/* Título do Card */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              Criar sua conta
            </h2>
            <p className="text-gray-400 text-sm">
              Comece a analisar suas lutas gratuitamente
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Campo Nome */}
            <div>
              <label 
                htmlFor="name" 
                className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider"
              >
                Nome completo
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full h-12 px-4 bg-black border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
                placeholder="Seu nome"
                required
              />
            </div>

            {/* Campo Email */}
            <div>
              <label 
                htmlFor="email" 
                className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider"
              >
                Endereço de email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full h-12 px-4 bg-black border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
                placeholder="seu@email.com"
                required
              />
            </div>

            {/* Campo Senha */}
            <div>
              <label 
                htmlFor="password" 
                className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider"
              >
                Senha
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full h-12 px-4 bg-black border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>

            {/* Campo Confirmar Senha */}
            <div>
              <label 
                htmlFor="confirmPassword" 
                className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider"
              >
                Confirmar senha
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full h-12 px-4 bg-black border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
                placeholder="Digite a senha novamente"
                required
              />
            </div>

            {/* Mensagem de Erro */}
            {error && (
              <div className="bg-red-950/50 border border-red-900 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Botão de Registro */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-white text-black font-semibold text-sm rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? 'Criando conta...' : 'Criar conta'}
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
              Continuar com Google
            </button>
          </form>

          {/* Link para Login */}
          <div className="mt-8 pt-6 border-t border-gray-800">
            <p className="text-center text-sm text-gray-400">
              Já tem uma conta?{' '}
              <Link 
                to="/login" 
                className="text-white font-medium hover:underline"
              >
                Fazer login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
