// Componente de loading - Design moderno e profissional
export default function LoadingSpinner({ size = 'md', text = '' }) {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-20 w-20'
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <div className="relative">
        {/* Círculo externo animado */}
        <div className={`${sizes[size]} rounded-full border-4 border-slate-200 border-t-indigo-600 border-r-indigo-500 border-b-indigo-400 animate-spin`}></div>
        
        {/* Círculo interno pulsante */}
        <div className={`absolute inset-0 ${sizes[size]} rounded-full border-4 border-transparent border-t-indigo-300 opacity-50 animate-spin`} style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
      </div>
      
      {text && (
        <div className="text-sm font-medium text-slate-600 animate-pulse">
          {text}
        </div>
      )}
    </div>
  );
}
