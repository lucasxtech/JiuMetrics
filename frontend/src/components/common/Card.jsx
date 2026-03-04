import PropTypes from 'prop-types';

/**
 * Componente Card reutilizável e moderno
 * @param {Object} props
 * @param {React.ReactNode} props.children - Conteúdo do card
 * @param {string} props.className - Classes CSS adicionais
 * @param {boolean} props.hover - Se deve ter efeito hover
 * @param {Function} props.onClick - Callback ao clicar (torna o card clicável)
 * @param {boolean} props.gradient - Se deve mostrar gradiente no topo ao hover
 */
export default function Card({
  children,
  className = '',
  hover = false,
  onClick,
  gradient = true,
  ...rest
}) {
  const baseClass = 'card-modern';
  const isClickable = !!onClick;
  
  const classes = [
    baseClass,
    hover && 'hover-lift',
    isClickable && 'cursor-pointer',
    !gradient && 'no-gradient',
    className,
  ].filter(Boolean).join(' ');

  const Component = isClickable ? 'button' : 'div';

  return (
    <Component 
      className={classes}
      onClick={onClick}
      {...rest}
    >
      {children}
    </Component>
  );
}

Card.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  hover: PropTypes.bool,
  onClick: PropTypes.func,
  gradient: PropTypes.bool,
};

/**
 * Card Header - Componente de cabeçalho do card
 */
export function CardHeader({ children, className = '', ...rest }) {
  return (
    <div className={`card-header ${className}`} {...rest}>
      {children}
    </div>
  );
}

CardHeader.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

/**
 * Card Body - Componente de corpo do card
 */
export function CardBody({ children, className = '', ...rest }) {
  return (
    <div className={`card-body ${className}`} {...rest}>
      {children}
    </div>
  );
}

CardBody.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

/**
 * Card Footer - Componente de rodapé do card
 */
export function CardFooter({ children, className = '', ...rest }) {
  return (
    <div className={`card-footer ${className}`} {...rest}>
      {children}
    </div>
  );
}

CardFooter.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};
