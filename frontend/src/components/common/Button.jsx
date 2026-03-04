import PropTypes from 'prop-types';

/**
 * Componente Button reutilizável e profissional
 * @param {Object} props
 * @param {string} props.variant - Variante do botão (primary, secondary, success, danger, warning, ghost)
 * @param {string} props.size - Tamanho (sm, md, lg)
 * @param {boolean} props.disabled - Se o botão está desabilitado
 * @param {boolean} props.loading - Se está em estado de loading
 * @param {React.ReactNode} props.children - Conteúdo do botão
 * @param {React.ReactNode} props.icon - Ícone opcional
 * @param {string} props.type - Tipo do botão (button, submit, reset)
 * @param {Function} props.onClick - Callback ao clicar
 * @param {string} props.className - Classes CSS adicionais
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  children,
  icon,
  type = 'button',
  onClick,
  className = '',
  ...rest
}) {
  const baseClass = 'btn';
  const variantClass = `btn-${variant}`;
  const sizeClass = size !== 'md' ? `btn-${size}` : '';
  
  const classes = [
    baseClass,
    variantClass,
    sizeClass,
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      {...rest}
    >
      {loading ? (
        <>
          <svg 
            className="animate-spin h-5 w-5" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Carregando...</span>
        </>
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}

Button.propTypes = {
  variant: PropTypes.oneOf(['primary', 'secondary', 'success', 'danger', 'warning', 'ghost']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  children: PropTypes.node.isRequired,
  icon: PropTypes.node,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  onClick: PropTypes.func,
  className: PropTypes.string,
};
