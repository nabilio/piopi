import { Loader2, X, CheckCircle2 } from 'lucide-react';

type GenerationProgressProps = {
  message: string;
  progress: number;
  onClose?: () => void;
};

export function GenerationProgress({ message, progress, onClose }: GenerationProgressProps) {
  const isComplete = progress === 100;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md w-full mx-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 border-2 border-green-200 animate-slide-up">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isComplete
                ? 'bg-green-500'
                : 'bg-gradient-to-br from-green-500 to-blue-500'
            }`}>
              {isComplete ? (
                <CheckCircle2 className="text-white" size={24} />
              ) : (
                <Loader2 className="text-white animate-spin" size={24} />
              )}
            </div>
            <div>
              <h3 className="font-bold text-gray-800">
                {isComplete ? 'Génération terminée !' : 'Génération en cours'}
              </h3>
              <p className="text-sm text-gray-600">{message}</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="space-y-2">
          <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`absolute top-0 left-0 h-full transition-all duration-500 rounded-full ${
                isComplete
                  ? 'bg-green-500'
                  : 'bg-gradient-to-r from-green-500 to-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-gray-800">{Math.round(progress)}%</span>
            {!isComplete && (
              <span className="text-xs text-gray-500">
                Continue en arrière-plan
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
