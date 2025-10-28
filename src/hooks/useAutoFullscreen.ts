import { useEffect } from 'react';

function isMobileLikeDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const userAgent = navigator.userAgent || '';
  const hasTouchPoints = typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 0;
  const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const prefersCoarsePointer = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const isNarrowViewport = window.innerWidth <= 1024;

  if (isMobileUserAgent) {
    return true;
  }

  return hasTouchPoints && prefersCoarsePointer && isNarrowViewport;
}

export function useAutoFullscreen() {
  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    if (!document.fullscreenEnabled || !isMobileLikeDevice()) {
      return;
    }

    const rootElement = document.documentElement as HTMLElement & {
      requestFullscreen?: (options?: FullscreenOptions) => Promise<void>;
    };

    if (!rootElement.requestFullscreen) {
      return;
    }

    let interactionListenersAttached = false;

    const requestFullscreen = async () => {
      if (document.fullscreenElement) {
        return;
      }

      try {
        await rootElement.requestFullscreen({ navigationUI: 'hide' });
      } catch (error) {
        console.debug('Unable to enter fullscreen mode:', error);
      }
    };

    const handleInteraction = () => {
      void requestFullscreen();
    };

    const attachInteractionListeners = () => {
      if (interactionListenersAttached) {
        return;
      }

      document.addEventListener('click', handleInteraction, { passive: true });
      document.addEventListener('touchend', handleInteraction, { passive: true });
      interactionListenersAttached = true;
    };

    const detachInteractionListeners = () => {
      if (!interactionListenersAttached) {
        return;
      }

      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchend', handleInteraction);
      interactionListenersAttached = false;
    };

    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        detachInteractionListeners();
      } else {
        attachInteractionListeners();
      }
    };

    attachInteractionListeners();
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('orientationchange', requestFullscreen);

    return () => {
      detachInteractionListeners();
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('orientationchange', requestFullscreen);
    };
  }, []);
}
