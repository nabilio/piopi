import { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

type ToastProps = {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
};

export function Toast({ message, type = 'info', onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getBgColor = () => {
    if (type === 'success') return 'bg-green-50 border-green-200';
    if (type === 'error') return 'bg-red-50 border-red-200';
    return 'bg-blue-50 border-blue-200';
  };

  const getIcon = () => {
    if (type === 'success') return <CheckCircle size={18} className="text-green-600" />;
    if (type === 'error') return <AlertCircle size={18} className="text-red-600" />;
    return null;
  };

  const getTextColor = () => {
    if (type === 'success') return 'text-green-800';
    if (type === 'error') return 'text-red-800';
    return 'text-blue-800';
  };

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 z-[200] animate-in slide-in-from-top duration-300">
      <div className={`${getBgColor()} border-2 rounded-xl shadow-2xl p-4 pr-12 max-w-sm mx-auto md:mx-0`}>
        <div className="flex items-start gap-3">
          {getIcon()}
          <p className={`text-sm md:text-base font-semibold ${getTextColor()}`}>{message}</p>
        </div>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
