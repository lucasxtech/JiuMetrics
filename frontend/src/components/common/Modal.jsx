import { useEffect } from 'react';
import styles from './Modal.module.css';

/**
 * Modal Component - Componente de modal reutilizável e acessível
 * @param {Object} props
 * @param {boolean} props.isOpen - Estado de abertura do modal
 * @param {Function} props.onClose - Callback ao fechar modal
 * @param {string} props.title - Título do modal
 * @param {string} props.subtitle - Subtítulo/descrição do modal
 * @param {React.ReactNode} props.children - Conteúdo do modal
 * @param {string} props.size - Tamanho do modal (sm, md, lg, xl)
 */
export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  subtitle, 
  children, 
  size = 'md' 
}) {
  // Fecha modal com tecla ESC
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Previne scroll do body
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Fecha ao clicar no backdrop
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={handleBackdropClick}>
      <div className={`${styles.modalContent} ${styles[`modal${size.charAt(0).toUpperCase() + size.slice(1)}`]}`}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div>
            {title && <h2 className={styles.modalTitle}>{title}</h2>}
            {subtitle && <p className={styles.modalSubtitle}>{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Fechar modal"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          {children}
        </div>
      </div>
    </div>
  );
}
