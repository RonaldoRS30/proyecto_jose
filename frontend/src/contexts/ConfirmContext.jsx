import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from 'react';
import {
  AlertTriangle, Trash2, HelpCircle, CheckCircle, Info, XCircle,
} from 'lucide-react';

const DialogContext = createContext(null);

const CONFIRM_ICONS = {
  danger: Trash2,
  warning: AlertTriangle,
  default: HelpCircle,
};

const ALERT_ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

function ConfirmDialog({
  title,
  message,
  detail,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  onConfirm,
  onCancel,
}) {
  const Icon = CONFIRM_ICONS[variant] || CONFIRM_ICONS.default;

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return (
    <div className="confirm-overlay" role="presentation" onClick={onCancel}>
      <div
        className={`confirm-dialog confirm-${variant}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`confirm-icon-wrap confirm-icon-${variant}`}>
          <Icon size={26} strokeWidth={2} />
        </div>
        <h3 id="confirm-title" className="confirm-title">{title}</h3>
        <p id="confirm-message" className="confirm-message">{message}</p>
        {detail && <p className="confirm-detail">{detail}</p>}
        <div className="confirm-actions">
          <button type="button" className="btn btn-secondary confirm-btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn confirm-btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function AlertDialog({
  title,
  message,
  detail,
  confirmLabel = 'Entendido',
  variant = 'info',
  onClose,
}) {
  const Icon = ALERT_ICONS[variant] || ALERT_ICONS.info;

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="confirm-overlay" role="presentation" onClick={onClose}>
      <div
        className={`confirm-dialog confirm-alert confirm-${variant}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-title"
        aria-describedby="alert-message"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`confirm-icon-wrap confirm-icon-${variant}`}>
          <Icon size={26} strokeWidth={2} />
        </div>
        <h3 id="alert-title" className="confirm-title">{title}</h3>
        <p id="alert-message" className="confirm-message">{message}</p>
        {detail && <p className="confirm-detail">{detail}</p>}
        <div className="confirm-actions confirm-actions-single">
          <button type="button" className="btn btn-primary confirm-btn" onClick={onClose} autoFocus>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmProvider({ children }) {
  const [confirmOptions, setConfirmOptions] = useState(null);
  const [alertOptions, setAlertOptions] = useState(null);
  const confirmResolveRef = useRef(null);
  const alertResolveRef = useRef(null);

  const confirm = useCallback((opts) => new Promise((resolve) => {
    confirmResolveRef.current = resolve;
    if (typeof opts === 'string') {
      setConfirmOptions({ message: opts, title: 'Confirmar acción' });
    } else {
      setConfirmOptions(opts);
    }
  }), []);

  const alert = useCallback((opts) => new Promise((resolve) => {
    alertResolveRef.current = resolve;
    if (typeof opts === 'string') {
      setAlertOptions({ message: opts, title: 'Aviso', variant: 'info' });
    } else {
      setAlertOptions(opts);
    }
  }), []);

  const closeConfirm = useCallback((result) => {
    confirmResolveRef.current?.(result);
    confirmResolveRef.current = null;
    setConfirmOptions(null);
  }, []);

  const closeAlert = useCallback(() => {
    alertResolveRef.current?.();
    alertResolveRef.current = null;
    setAlertOptions(null);
  }, []);

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      {confirmOptions && (
        <ConfirmDialog
          {...confirmOptions}
          onConfirm={() => closeConfirm(true)}
          onCancel={() => closeConfirm(false)}
        />
      )}
      {alertOptions && (
        <AlertDialog {...alertOptions} onClose={closeAlert} />
      )}
    </DialogContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de ConfirmProvider');
  return ctx.confirm;
}

export function useAlert() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useAlert debe usarse dentro de ConfirmProvider');
  return ctx.alert;
}

export default ConfirmProvider;
