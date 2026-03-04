import PropTypes from 'prop-types';

/**
 * Componente Badge reutilizável e moderno para tags visuais
 * @param {Object} props
 * @param {string} props.variant - Variante do badge (primary, success, warning, danger, info, neutral)
 * @param {React.ReactNode} props.children - Conteúdo do badge
 * @param {React.ReactNode} props.icon - Ícone opcional
 * @param {string} props.className - Classes CSS adicionais
 */
export default function Badge({ 
  children, 
  variant = 'neutral', 
  icon,
  className = '',
  ...rest 
}) {
  const baseClass = 'badge-modern';
  const variantClass = `badge-${variant}`;
  
  const classes = [
    baseClass,
    variantClass,
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={classes} {...rest}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

Badge.propTypes = {
  variant: PropTypes.oneOf(['primary', 'success', 'warning', 'danger', 'info', 'neutral']),
  children: PropTypes.node.isRequired,
  icon: PropTypes.node,
  className: PropTypes.string,
};
