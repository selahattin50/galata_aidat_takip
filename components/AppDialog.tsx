import React, { useCallback, useEffect, useMemo, useState } from 'react';

type DialogKind = 'alert' | 'confirm';

interface DialogState {
  kind: DialogKind;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  resolve?: (value: boolean) => void;
}

let openDialog: ((dialog: DialogState) => void) | null = null;

export const appAlert = (message: unknown, title = 'Bilgilendirme') => {
  if (!openDialog) {
    window.alert(String(message ?? ''));
    return;
  }

  openDialog({
    kind: 'alert',
    title,
    message: String(message ?? ''),
    confirmText: 'TAMAM'
  });
};

export const appConfirm = (message: unknown, title = 'Onay', confirmText = 'ONAYLA') => {
  if (!openDialog) {
    return Promise.resolve(window.confirm(String(message ?? '')));
  }

  return new Promise<boolean>((resolve) => {
    openDialog({
      kind: 'confirm',
      title,
      message: String(message ?? ''),
      confirmText,
      cancelText: 'VAZGEÇ',
      resolve
    });
  });
};

export const AppDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [queue, setQueue] = useState<DialogState[]>([]);
  const dialog = queue[0] || null;

  const showDialog = useCallback((nextDialog: DialogState) => {
    setQueue((items) => [...items, nextDialog]);
  }, []);

  const closeDialog = useCallback((value: boolean) => {
    setQueue((items) => {
      const [current, ...rest] = items;
      current?.resolve?.(value);
      return rest;
    });
  }, []);

  useEffect(() => {
    openDialog = showDialog;
    const nativeAlert = window.alert;

    window.alert = (message?: unknown) => {
      showDialog({
        kind: 'alert',
        title: 'Bilgilendirme',
        message: String(message ?? ''),
        confirmText: 'TAMAM'
      });
    };

    return () => {
      if (openDialog === showDialog) openDialog = null;
      window.alert = nativeAlert;
    };
  }, [showDialog]);

  const lines = useMemo(() => dialog?.message.split('\n') || [], [dialog]);

  return (
    <>
      {children}

      {dialog && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm overflow-hidden rounded-[26px] border border-blue-400/25 bg-[#17233a] shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
            <div className="h-1 w-full bg-gradient-to-r from-blue-500/60 via-emerald-400/60 to-blue-500/60" />
            <div className="p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300/80">
                {dialog.title}
              </p>
              <div className="mt-3 space-y-2 text-[15px] font-black leading-snug text-white">
                {lines.map((line, index) => (
                  <p key={`${index}-${line}`} className={line.trim() ? '' : 'h-2'}>
                    {line}
                  </p>
                ))}
              </div>

              <div className="mt-5 flex justify-end gap-2">
                {dialog.kind === 'confirm' && (
                  <button
                    onClick={() => closeDialog(false)}
                    className="embossed-cash h-11 rounded-2xl border border-white/10 bg-white/5 px-5 text-[10px] font-black uppercase tracking-widest text-white/65 transition-all active:scale-95"
                  >
                    {dialog.cancelText || 'VAZGEÇ'}
                  </button>
                )}
                <button
                  onClick={() => closeDialog(true)}
                  className="embossed-cash h-11 rounded-2xl bg-blue-600 px-6 text-[11px] font-black uppercase tracking-widest text-white shadow-lg transition-all active:scale-95"
                >
                  {dialog.confirmText || 'TAMAM'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
