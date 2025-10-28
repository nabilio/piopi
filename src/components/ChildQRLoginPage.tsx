import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, ShieldAlert, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function ChildQRLoginPage() {
  const { loading, profile, user } = useAuth();
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const initialError = useMemo(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    return hashParams.get('error_description');
  }, []);

  useEffect(() => {
    if (initialError) {
      setStatus('error');
      setErrorMessage(decodeURIComponent(initialError));
    }
  }, [initialError]);

  useEffect(() => {
    if (loading || status === 'error') {
      return;
    }

    if (profile?.role === 'child') {
      setStatus('success');
      const timer = setTimeout(() => {
        window.location.replace('/');
      }, 1200);
      return () => clearTimeout(timer);
    }

    if (!loading && !user) {
      setStatus('error');
      setErrorMessage('Lien expiré ou invalide. Demandez au parent de générer un nouveau QR code.');
    } else if (profile && profile.role !== 'child') {
      setStatus('error');
      setErrorMessage('Ce lien est réservé aux profils enfants.');
    }
  }, [loading, profile, status, user]);

  const renderContent = () => {
    if (status === 'success') {
      return (
        <div className="flex flex-col items-center gap-4 text-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-500" />
          <h1 className="text-2xl font-bold text-gray-800">Connexion réussie !</h1>
          <p className="text-gray-600">Bienvenue, ton espace va s'ouvrir dans un instant...</p>
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="flex flex-col items-center gap-4 text-center">
          <XCircle className="h-16 w-16 text-red-500" />
          <h1 className="text-2xl font-bold text-gray-800">Impossible de terminer la connexion</h1>
          <p className="text-gray-600">{errorMessage || 'Une erreur inattendue est survenue.'}</p>
          <div className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
            <ShieldAlert className="h-5 w-5" />
            <span>Demande à ton parent de régénérer un QR code depuis son espace.</span>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="h-16 w-16 animate-spin text-purple-500" />
        <h1 className="text-2xl font-bold text-gray-800">Connexion en cours...</h1>
        <p className="text-gray-600">Nous sécurisons ton accès à l'espace enfant.</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4">
        <div className="w-full rounded-3xl bg-white p-8 shadow-xl">
          {renderContent()}
        </div>
        <p className="mt-6 text-center text-xs text-gray-500">
          Besoin d'aide ? Contactez le support PioPi pour sécuriser l'accès de votre enfant.
        </p>
      </div>
    </div>
  );
}
