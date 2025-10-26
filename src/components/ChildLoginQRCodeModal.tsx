import { useEffect, useState } from 'react';
import { QrCode, RefreshCw, Copy, Check, X, Smartphone, ShieldCheck } from 'lucide-react';
import { supabase, type Profile } from '../lib/supabase';

const QR_IMAGE_BASE_URL = 'https://api.qrserver.com/v1/create-qr-code/';

type ChildLoginQRCodeModalProps = {
  child: Profile;
  onClose: () => void;
};

type GenerateLinkResponse = {
  loginLink: string;
  expiresAt?: string | null;
  childName?: string;
};

export function ChildLoginQRCodeModal({ child, onClose }: ChildLoginQRCodeModalProps) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null | undefined>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void refreshQr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child.id]);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function refreshQr() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke<GenerateLinkResponse>('generate-child-login-link', {
        body: {
          childId: child.id,
          redirectTo: `${window.location.origin}/child-qr-login`
        }
      });

      if (fnError) {
        throw new Error(fnError.message || 'Erreur lors de la génération du lien.');
      }

      if (!data?.loginLink) {
        throw new Error("Le lien de connexion n'a pas pu être généré. Réessayez.");
      }

      const qrImage = `${QR_IMAGE_BASE_URL}?size=420x420&data=${encodeURIComponent(data.loginLink)}`;

      setLink(data.loginLink);
      setQrUrl(qrImage);
      setExpiresAt(data.expiresAt);
    } catch (err) {
      console.error('Error while generating child login QR code:', err);
      setError((err as Error).message || 'Une erreur est survenue lors de la génération du QR code.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyLink() {
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch (err) {
      console.error('Unable to copy QR login link:', err);
      setError("Impossible de copier le lien. Vous pouvez copier manuellement l'URL affichée ci-dessous.");
    }
  }

  const expiresLabel = expiresAt ? new Date(expiresAt).toLocaleTimeString() : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="relative w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-gray-100 p-2 text-gray-500 transition hover:bg-gray-200 hover:text-gray-700"
          aria-label="Fermer le QR code"
        >
          <X size={18} />
        </button>

        <div className="max-h-[90vh] overflow-y-auto">
          <div className="space-y-6 p-6 sm:p-8 md:p-10">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-600">
                  <QrCode size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800 md:text-2xl">Connexion rapide</h2>
                  <p className="text-sm text-gray-600 md:text-base">
                    Scannez ce code pour ouvrir le profil de {child.full_name}.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6 md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] md:items-start md:gap-8">
              <div className="space-y-6">
                <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 md:text-base">
                  <div className="flex items-start gap-3">
                    <Smartphone className="mt-0.5 h-5 w-5 text-purple-500" />
                    <div>
                      <p className="font-semibold text-gray-700">Instructions</p>
                      <ol className="mt-2 list-decimal space-y-1 pl-5">
                        <li>Ouvrez l'appareil photo ou un lecteur QR sur la tablette / le mobile.</li>
                        <li>Scannez le code pour ouvrir le lien sécurisé.</li>
                        <li>Validez si le navigateur demande une confirmation.</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {link && !loading && !error ? (
                  <div className="space-y-3 rounded-2xl border border-purple-100 bg-purple-50/70 p-4 text-sm text-gray-700">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 h-5 w-5 text-purple-500" />
                      <div>
                        <p className="font-semibold text-purple-700">Sécurité du lien</p>
                        <p className="text-xs text-purple-600 md:text-sm">
                          Ce lien est temporaire et réservé à {child.full_name}. Partagez-le uniquement avec votre enfant.
                        </p>
                        {expiresLabel ? (
                          <p className="mt-2 text-xs text-gray-500">Expiration estimée : {expiresLabel}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="break-words rounded-xl bg-white p-3 text-xs text-gray-600 md:text-sm">
                      {link}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? 'Lien copié !' : 'Copier le lien'}
                      </button>
                      <button
                        type="button"
                        onClick={refreshQr}
                        className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-purple-400 hover:text-purple-600"
                      >
                        <RefreshCw size={16} />
                        Nouveau lien
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col items-center gap-4 rounded-2xl bg-gradient-to-b from-purple-50/80 via-white to-white p-4 md:min-h-[22rem] md:justify-center md:p-6">
                {loading ? (
                  <div className="flex h-48 w-48 items-center justify-center">
                    <div className="h-16 w-16 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
                  </div>
                ) : error ? (
                  <div className="w-full rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600">
                    <p className="mb-3 font-semibold">{error}</p>
                    <button
                      type="button"
                      onClick={refreshQr}
                      className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-white transition hover:bg-red-700"
                    >
                      <RefreshCw size={16} />
                      Réessayer
                    </button>
                  </div>
                ) : qrUrl ? (
                  <>
                    <div className="rounded-3xl bg-white p-4 shadow-lg">
                      <img
                        src={qrUrl}
                        alt={`QR code de connexion pour ${child.full_name}`}
                        className="h-60 w-60 max-w-full rounded-2xl md:h-64 md:w-64"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={refreshQr}
                      className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-4 py-2 text-white transition hover:bg-purple-700"
                    >
                      <RefreshCw size={16} />
                      Régénérer le QR code
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
