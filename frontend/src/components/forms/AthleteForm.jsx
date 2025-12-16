// Formulário para criar/editar atleta
import { useState } from 'react';
import { createAthlete, updateAthlete } from '../../services/athleteService';
import { createOpponent, updateOpponent } from '../../services/opponentService';

export default function AthleteForm({ 
  initialData, 
  onSuccess,
  isOpponent = false, // Se true, cria adversário
  isLoading: externalLoading = false 
}) {
  const defaultData = {
    name: '',
    belt: 'Branca',
  };

  const [formData, setFormData] = useState({
    ...defaultData,
    ...(initialData || {}),
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  /**
   * Valida os campos do formulário
   */
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle mudanças nos inputs
   */
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
    
    // Limpar erro do campo ao editar
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  /**
   * Handle submit do formulário
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      setSuccessMessage('');
      
      let response;
      
      if (initialData?.id) {
        // Atualizar existente
        if (isOpponent) {
          response = await updateOpponent(initialData.id, formData);
        } else {
          response = await updateAthlete(initialData.id, formData);
        }
      } else {
        // Criar novo
        if (isOpponent) {
          response = await createOpponent(formData);
        } else {
          response = await createAthlete(formData);
        }
      }

      if (response.success) {
        setSuccessMessage(
          initialData?.id 
            ? `${isOpponent ? 'Adversário' : 'Atleta'} atualizado com sucesso!`
            : `${isOpponent ? 'Adversário' : 'Atleta'} criado com sucesso!`
        );
        
        // Reset form se for criação nova
        if (!initialData?.id) {
          setFormData(defaultData);
        }
        
        // Chamar callback de sucesso
        if (onSuccess) {
          setTimeout(() => onSuccess(response.data), 1000);
        }
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setErrors({ submit: 'Erro ao salvar. Tente novamente.' });
    } finally {
      setIsLoading(false);
    }
  };

  const belts = ['Branca', 'Azul', 'Roxa', 'Marrom', 'Preta'];

  const loading = isLoading || externalLoading;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Mensagem de sucesso */}
      {successMessage && (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-green-800 flex items-center gap-3 animate-fadeIn">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Erro geral */}
      {errors.submit && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-red-800 flex items-center gap-3">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span className="font-semibold">{errors.submit}</span>
        </div>
      )}

      {/* Nome */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Nome {isOpponent ? 'do Adversário' : 'do Atleta'} *
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 ${
            isOpponent ? 'focus:ring-orange-500 focus:border-orange-500' : 'focus:ring-blue-500 focus:border-blue-500'
          } outline-none transition-all ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Ex: João Silva"
        />
        {errors.name && <p className="text-red-600 text-sm mt-1 font-medium">{errors.name}</p>}
      </div>

      {/* Faixa */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Faixa
        </label>
        <select
          name="belt"
          value={formData.belt}
          onChange={handleChange}
          className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 ${
            isOpponent ? 'focus:ring-orange-500 focus:border-orange-500' : 'focus:ring-blue-500 focus:border-blue-500'
          } outline-none transition-all border-gray-300`}
        >
          {belts.map((belt) => (
            <option key={belt} value={belt}>
              {belt}
            </option>
          ))}
        </select>
      </div>

      {/* Botão Submit */}
      <button
        type="submit"
        disabled={loading}
        className={`w-full mt-15 ${
          isOpponent 
            ? 'bg-orange-600 hover:bg-orange-700' 
            : 'bg-blue-600 hover:bg-blue-700'
        } text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3`}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Salvando...</span>
          </>
        ) : (
          <>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{initialData?.id ? 'Atualizar' : 'Salvar'} {isOpponent ? 'Adversário' : 'Atleta'}</span>
          </>
        )}
      </button>
    </form>
  );
}
