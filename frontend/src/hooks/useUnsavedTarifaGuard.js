import { useCallback, useEffect } from 'react';
import { useConfirm } from '../contexts/ConfirmContext';
import { useNavigationGuard } from '../contexts/NavigationGuardContext';

const DEFAULT_OPTIONS = {
  title: 'Tarifa sin guardar',
  message: 'Detectó una tarifa desde el recibo pero aún no la ha guardado.',
  detail: 'Pulse «Guardar Tarifa» para aplicarla antes de cambiar de módulo.',
  confirmLabel: 'Salir sin guardar',
  cancelLabel: 'Quedarme y guardar',
  variant: 'warning',
};

export function useUnsavedTarifaGuard(shouldBlock, options = {}) {
  const confirm = useConfirm();
  const { registerGuard } = useNavigationGuard();
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const confirmLeave = useCallback(async () => {
    if (!shouldBlock) return true;
    return confirm(opts);
  }, [shouldBlock, confirm, opts.title, opts.message, opts.detail, opts.confirmLabel, opts.cancelLabel, opts.variant]);

  useEffect(() => registerGuard(confirmLeave), [registerGuard, confirmLeave]);

  useEffect(() => {
    if (!shouldBlock) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [shouldBlock]);

  return confirmLeave;
}
