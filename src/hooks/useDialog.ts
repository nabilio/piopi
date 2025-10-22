import { useState, useCallback } from 'react';

type DialogType = 'info' | 'success' | 'error' | 'warning';

type DialogOptions = {
  title: string;
  message: string;
  type?: DialogType;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
};

export function useDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<DialogOptions>({
    title: '',
    message: '',
    type: 'info',
    confirmText: 'OK',
    cancelText: 'Annuler',
    showCancel: false
  });
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  const showDialog = useCallback((options: DialogOptions): Promise<boolean> => {
    setConfig({
      confirmText: 'OK',
      cancelText: 'Annuler',
      showCancel: false,
      type: 'info',
      ...options
    });
    setIsOpen(true);

    return new Promise<boolean>((resolve) => {
      setResolvePromise(() => resolve);
    });
  }, []);

  const alert = useCallback((message: string, title = 'Information', type: DialogType = 'info'): Promise<boolean> => {
    return showDialog({
      title,
      message,
      type,
      showCancel: false
    });
  }, [showDialog]);

  const confirm = useCallback((message: string, title = 'Confirmation', type: DialogType = 'warning'): Promise<boolean> => {
    return showDialog({
      title,
      message,
      type,
      showCancel: true,
      confirmText: 'Confirmer',
      cancelText: 'Annuler'
    });
  }, [showDialog]);

  const handleConfirm = useCallback(() => {
    if (resolvePromise) {
      resolvePromise(true);
    }
    setIsOpen(false);
    setResolvePromise(null);
  }, [resolvePromise]);

  const handleClose = useCallback(() => {
    if (resolvePromise) {
      resolvePromise(false);
    }
    setIsOpen(false);
    setResolvePromise(null);
  }, [resolvePromise]);

  return {
    isOpen,
    config,
    handleConfirm,
    handleClose,
    showDialog,
    alert,
    confirm
  };
}
