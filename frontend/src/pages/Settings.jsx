import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout, getCurrentUser } from '../services/authService';

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const [successMessage, setSuccessMessage] = useState('');

  const aiModels = [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Rápido e eficiente para análises básicas' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Equilíbrio entre velocidade e precisão' },
    { id: 'gemini-3.0', name: 'Gemini 3.0', description: 'Máxima precisão para análises avançadas' }
  ];

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      navigate('/login');
    } else {
      setUser(currentUser);
      
      const savedModel = localStorage.getItem('ai_model');
      if (savedModel) {
        setSelectedModel(savedModel);
      }
    }
  }, [navigate]);

  const handleModelChange = (modelId) => {
    setSelectedModel(modelId);
    localStorage.setItem('ai_model', modelId);
    
    setSuccessMessage('Modelo salvo com sucesso!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Configurações</h1>
        <p>Personalize sua experiência no JiuMetrics</p>
      </div>

      {/* Informações do Usuário */}
      <div className="settings-section">
        <div className="section-header">
          <h2>Conta</h2>
        </div>
        <div className="user-info-card">
          <div className="user-avatar">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="user-details">
            <h3>{user.name}</h3>
            <p>{user.email}</p>
          </div>
        </div>
      </div>

      {/* Modelo de IA */}
      <div className="settings-section">
        <div className="section-header">
          <h2>Modelo de Inteligência Artificial</h2>
          <p>Escolha o modelo que será usado para análises</p>
        </div>
        
        {successMessage && (
          <div className="success-message">
            ✓ {successMessage}
          </div>
        )}

        <div className="model-selector">
          {aiModels.map((model) => (
            <div
              key={model.id}
              className={`model-option ${selectedModel === model.id ? 'selected' : ''}`}
              onClick={() => handleModelChange(model.id)}
            >
              <div className="model-radio">
                <input
                  type="radio"
                  name="ai-model"
                  value={model.id}
                  checked={selectedModel === model.id}
                  onChange={() => handleModelChange(model.id)}
                />
                <span className="radio-custom"></span>
              </div>
              <div className="model-info">
                <h3>{model.name}</h3>
                <p>{model.description}</p>
              </div>
              {selectedModel === model.id && (
                <div className="selected-badge">
                  <svg width="1.25rem" height="1.25rem" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Ações da Conta */}
      <div className="settings-section">
        <div className="section-header">
          <h2>Ações da Conta</h2>
        </div>
        <button className="logout-button" onClick={handleLogout}>
          <svg width="1.25rem" height="1.25rem" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sair da Conta
        </button>
      </div>

      <style jsx>{`
        .settings-container {
          max-width: 50rem;
          margin: 0 auto;
          padding: 2rem 1.5rem;
        }

        .settings-header {
          margin-bottom: 3rem;
        }

        .settings-header h1 {
          font-size: 2rem;
          font-weight: 700;
          color: #1a202c;
          margin: 0 0 0.5rem 0;
        }

        .settings-header p {
          font-size: 1rem;
          color: #718096;
          margin: 0;
        }

        .settings-section {
          background: white;
          border-radius: 1rem;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.05);
        }

        .section-header {
          margin-bottom: 1.5rem;
        }

        .section-header h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1a202c;
          margin: 0 0 0.25rem 0;
        }

        .section-header p {
          font-size: 0.875rem;
          color: #718096;
          margin: 0;
        }

        /* User Info Card */
        .user-info-card {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 1.5rem;
          background: #f7fafc;
          border-radius: 0.75rem;
        }

        .user-avatar {
          width: 4rem;
          height: 4rem;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .user-details h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1a202c;
          margin: 0 0 0.25rem 0;
        }

        .user-details p {
          font-size: 0.875rem;
          color: #718096;
          margin: 0;
        }

        /* Success Message */
        .success-message {
          padding: 0.875rem 1rem;
          background: #f0fdf4;
          border: 0.0625rem solid #86efac;
          border-radius: 0.75rem;
          color: #166534;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 1.5rem;
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-0.5rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Model Selector */
        .model-selector {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .model-option {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          border: 0.125rem solid #e2e8f0;
          border-radius: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }

        .model-option:hover {
          border-color: #667eea;
          background: #f7fafc;
        }

        .model-option.selected {
          border-color: #667eea;
          background: #eef2ff;
        }

        .model-radio {
          position: relative;
          flex-shrink: 0;
        }

        .model-radio input[type="radio"] {
          width: 1.25rem;
          height: 1.25rem;
          cursor: pointer;
          accent-color: #667eea;
        }

        .model-info {
          flex: 1;
        }

        .model-info h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #1a202c;
          margin: 0 0 0.25rem 0;
        }

        .model-info p {
          font-size: 0.875rem;
          color: #718096;
          margin: 0;
        }

        .selected-badge {
          color: #667eea;
          flex-shrink: 0;
        }

        /* Logout Button */
        .logout-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.875rem 1rem;
          font-size: 1rem;
          font-weight: 600;
          color: #dc2626;
          background: white;
          border: 0.125rem solid #fca5a5;
          border-radius: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .logout-button:hover {
          background: #fef2f2;
          border-color: #dc2626;
        }

        /* Responsive */
        @media (max-width: 48em) {
          .settings-container {
            padding: 1.5rem 1rem;
          }

          .settings-section {
            padding: 1.5rem;
          }

          .settings-header h1 {
            font-size: 1.75rem;
          }

          .user-info-card {
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
