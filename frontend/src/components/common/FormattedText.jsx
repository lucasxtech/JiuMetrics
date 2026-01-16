import { formatObjectToText } from '../../utils/formatters';

/**
 * Formata texto com markdown básico (negrito, itálico, listas)
 * Converte **texto** para negrito e *texto* para itálico
 */
export default function FormattedText({ text, className = '' }) {
  if (!text) return null;
  
  // Se receber um objeto, formatar de forma legível
  if (typeof text === 'object') {
    text = formatObjectToText(text);
  }
  
  // Função para processar markdown inline
  const processMarkdown = (str) => {
    const result = [];
    let key = 0;
    
    // Dividir por **negrito** primeiro
    const boldParts = str.split(/\*\*([^*]+)\*\*/g);
    
    for (let i = 0; i < boldParts.length; i++) {
      if (i % 2 === 1) {
        // Parte em negrito (índices ímpares após split)
        result.push(<strong key={key++} className="font-bold">{boldParts[i]}</strong>);
      } else if (boldParts[i]) {
        // Texto normal - verificar itálico
        const italicParts = boldParts[i].split(/\*([^*]+)\*/g);
        for (let j = 0; j < italicParts.length; j++) {
          if (j % 2 === 1) {
            result.push(<em key={key++} className="italic">{italicParts[j]}</em>);
          } else if (italicParts[j]) {
            result.push(<span key={key++}>{italicParts[j]}</span>);
          }
        }
      }
    }
    
    return result.length > 0 ? result : str;
  };
  
  // Dividir por linhas
  const lines = text.split('\n');
  
  return (
    <div className={className}>
      {lines.map((line, index) => {
        // Verificar se é lista numerada (1. 2. 3.)
        const listMatch = line.match(/^(\d+)\.\s+\*\*([^*]+)\*\*:?\s*(.*)/);
        if (listMatch) {
          return (
            <div key={index} className="flex gap-2 mt-3 first:mt-0">
              <span className="font-bold text-inherit shrink-0">{listMatch[1]}.</span>
              <span>
                <strong className="font-bold">{listMatch[2]}:</strong> {processMarkdown(listMatch[3])}
              </span>
            </div>
          );
        }
        
        // Linha normal
        return (
          <span key={index}>
            {processMarkdown(line)}
            {index < lines.length - 1 && <br />}
          </span>
        );
      })}
    </div>
  );
}
