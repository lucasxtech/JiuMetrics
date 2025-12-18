import { AlertTriangle } from 'lucide-react';

export default function ConfirmDeleteModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirmar Exclusão",
  message = "Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.",
  itemName = "",
  confirmText = "Excluir",
  cancelText = "Cancelar"
}) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            {title}
          </h3>
          <p className="text-slate-600 leading-relaxed">
            {message}
          </p>
          {itemName && (
            <p className="mt-3 text-base font-semibold text-slate-900">
              "{itemName}"
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-all duration-200"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-all duration-200 shadow-lg shadow-red-600/30"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
