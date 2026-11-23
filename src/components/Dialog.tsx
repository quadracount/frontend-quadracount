import { useEffect, useRef, type ReactNode } from "react";

/**
 * Diálogo modal sencillo: cierra con Escape o al hacer clic fuera, y lleva el
 * foco al contenido al abrirse.
 */
export function Dialog({
  title,
  children,
  footer,
  onClose,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="qc-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="qc-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={panelRef}
      >
        <div className="qc-dialog__body">
          <h2 className="qc-dialog__title">{title}</h2>
          {children}
        </div>
        {footer && <div className="qc-dialog__footer">{footer}</div>}
      </div>
    </div>
  );
}
