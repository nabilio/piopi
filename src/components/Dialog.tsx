import { X, CheckCircle, AlertCircle } from 'lucide-react';

type DialogProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'error' | 'warning';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  showCancel?: boolean;
};

export function Dialog({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  confirmText = 'OK',
  cancelText = 'Annuler',
  onConfirm,
  showCancel = false
}: DialogProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const getIcon = () => {
    if (type === 'success') return <CheckCircle size={20} className="text-green-600" />;
    if (type === 'error') return <AlertCircle size={20} className="text-red-600" />;
    if (type === 'warning') return <AlertCircle size={20} className="text-orange-600" />;
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-sm w-full border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getIcon()}
            <h3 className="font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4">
          <p className="text-gray-600 text-sm whitespace-pre-line">
            {message}
          </p>
        </div>

        <div className="p-4 pt-0 flex gap-2 justify-end">
          {showCancel && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded transition"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
