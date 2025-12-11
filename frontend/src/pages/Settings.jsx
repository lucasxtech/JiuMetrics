import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout, getCurrentUser } from '../services/authService';
import styles from './Settings.module.css';

export default function Settings() {
  const navigate = useNavigate();
  const currentUser = useMemo(() => getCurrentUser(), []);
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('ai_model') || 'gemini-2.0-flash';
  });
  const [successMessage, setSuccessMessage] = useState('');

  const aiModels = [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Rápido e eficiente para análises básicas' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Equilíbrio entre velocidade e precisão' },
    { id: 'gemini-3.0', name: 'Gemini 3.0', description: 'Máxima precisão para análises avançadas' }
  ];

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [navigate, currentUser]);

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

  if (!currentUser) return null;

  return (
    <div className={styles.settingsContainer}>
      <div className={styles.settingsHeader}>
        <h1>Configurações</h1>
        <p>Personalize sua experiência no JiuMetrics</p>
      </div>

      {/* Informações do Usuário */}
      <div className={styles.settingsSection}>
        <div className={styles.sectionTitle}>
          <h2>Conta</h2>
        </div>
        <div className={styles.userInfoCard}>
          <div className={styles.userAvatar}>
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
          <div className={styles.userInfo}>
            <h3>{currentUser.name}</h3>
            <p>{currentUser.email}</p>
          </div>
        </div>
      </div>

      {/* Modelo de IA */}
      <div className={styles.settingsSection}>
        <div className={styles.sectionTitle}>
          <h2>Modelo de Inteligência Artificial</h2>
          <p>Escolha o modelo que será usado para análises</p>
        </div>
        
        {successMessage && (
          <div className="success-message">
            ✓ {successMessage}
          </div>
        )}

        <div className={styles.modelOptions}>
          {aiModels.map((model) => (
            <div
              key={model.id}
              className={`${styles.modelOption} ${selectedModel === model.id ? styles.selected : ''}`}
              onClick={() => handleModelChange(model.id)}
            >
              <input
                type="radio"
                name="ai-model"
                value={model.id}
                checked={selectedModel === model.id}
                onChange={() => handleModelChange(model.id)}
                className={styles.radioInput}
              />
              <div className={styles.modelContent}>
                <h3 className={styles.modelName}>{model.name}</h3>
                <p className={styles.modelDescription}>{model.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ações da Conta */}
      <div className={styles.settingsSection}>
        <div className={styles.sectionTitle}>
          <h2>Ações da Conta</h2>
        </div>
        <button className={styles.logoutButton} onClick={handleLogout}>
          <svg width="1.25rem" height="1.25rem" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sair da Conta
        </button>
      </div>
    </div>
  );
}
