"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useId,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Info, X } from "lucide-react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function portal(node: ReactNode) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(node, document.body);
}

export type IntraButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
};

export const IntraButton = forwardRef<HTMLButtonElement, IntraButtonProps>(
  ({ className, isLoading = false, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cx("intra-btn", className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {children}
    </button>
  )
);
IntraButton.displayName = "IntraButton";

export const IntraPrimaryButton = forwardRef<HTMLButtonElement, IntraButtonProps>(
  ({ className, ...props }, ref) => (
    <IntraButton ref={ref} className={cx("intra-btn-primary", className)} {...props} />
  )
);
IntraPrimaryButton.displayName = "IntraPrimaryButton";

export const IntraSecondaryButton = forwardRef<HTMLButtonElement, IntraButtonProps>(
  ({ className, ...props }, ref) => (
    <IntraButton ref={ref} className={cx("intra-btn-secondary", className)} {...props} />
  )
);
IntraSecondaryButton.displayName = "IntraSecondaryButton";

export const IntraDangerButton = forwardRef<HTMLButtonElement, IntraButtonProps>(
  ({ className, ...props }, ref) => (
    <IntraButton ref={ref} className={cx("intra-btn-danger", className)} {...props} />
  )
);
IntraDangerButton.displayName = "IntraDangerButton";

export const IntraInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cx("intra-input", className)} {...props} />
  )
);
IntraInput.displayName = "IntraInput";

export const IntraSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cx("intra-input intra-select", className)} {...props}>
      {children}
    </select>
  )
);
IntraSelect.displayName = "IntraSelect";

export const IntraTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cx("intra-input intra-textarea", className)} {...props} />
  )
);
IntraTextarea.displayName = "IntraTextarea";

type IntraFieldMessageProps = HTMLAttributes<HTMLParagraphElement> & {
  tone?: "error" | "success" | "info";
};

export function IntraFieldMessage({
  tone = "error",
  className,
  children,
  ...props
}: IntraFieldMessageProps) {
  return (
    <p
      className={cx(
        "intra-field-message",
        tone === "error" && "intra-field-message-error",
        tone === "success" && "intra-field-message-success",
        tone === "info" && "intra-field-message-info",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export function IntraCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("intra-card", className)} {...props} />;
}

export function IntraSummaryCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("intra-card-compact", className)} {...props} />;
}

type IntraMetricCardProps = HTMLAttributes<HTMLDivElement> & {
  label: string;
  value: ReactNode;
  helper?: string;
};

export function IntraMetricCard({
  label,
  value,
  helper,
  className,
  ...props
}: IntraMetricCardProps) {
  return (
    <div className={cx("intra-card p-4", className)} {...props}>
      <p className="intra-caption-strong uppercase text-intra-text-muted">{label}</p>
      <div className="mt-2 intra-metric">{value}</div>
      {helper ? <p className="intra-caption mt-1">{helper}</p> : null}
    </div>
  );
}

type IntraBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "success" | "warning" | "danger" | "info" | "rating";
};

export function IntraBadge({ tone = "neutral", className, children, ...props }: IntraBadgeProps) {
  const toneClass =
    tone === "success"
      ? "intra-badge-success"
      : tone === "warning" || tone === "rating"
        ? "intra-badge-warning"
        : tone === "danger"
          ? "intra-badge-danger"
          : tone === "info"
            ? "intra-badge-info"
            : "border border-intra-border bg-intra-neutral-pill text-intra-blue";

  return (
    <span className={cx("intra-badge", toneClass, className)} {...props}>
      {children}
    </span>
  );
}

export const IntraStatusBadge = IntraBadge;

export function IntraRatingBadge({ className, ...props }: Omit<IntraBadgeProps, "tone">) {
  return <IntraBadge tone="rating" className={className} {...props} />;
}

export function IntraIconContainer({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        "intra-icon-shell-body rounded-[var(--intra-radius-xs)] bg-intra-neutral-soft-alt text-intra-blue",
        className
      )}
      {...props}
    />
  );
}

type IntraEmptyStateProps = HTMLAttributes<HTMLDivElement> & {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function IntraEmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: IntraEmptyStateProps) {
  return (
    <div className={cx("intra-empty-state", className)} {...props}>
      {icon ? <div className="mb-3 flex justify-center text-intra-blue">{icon}</div> : null}
      <p className="intra-subtitle">{title}</p>
      {description ? <p className="intra-body mt-2">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function IntraSkeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("intra-skeleton", className)} aria-hidden="true" {...props} />;
}

export function IntraDetailBlock({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("rounded-[var(--intra-radius-xs)] border border-intra-border bg-intra-card p-4", className)} {...props} />;
}

export function IntraTable({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return <table className={cx("intra-table", className)} {...props} />;
}

export function IntraMobileRowCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("intra-mobile-row-card", className)} {...props} />;
}

type IntraModalProps = {
  open: boolean;
  title: ReactNode;
  titleIcon?: ReactNode;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  className?: string;
  panelClassName?: string;
  align?: "start" | "center";
};

export function IntraModal({
  open,
  title,
  titleIcon,
  description,
  children,
  footer,
  onClose,
  className,
  panelClassName,
  align = "start",
}: IntraModalProps) {
  const titleId = useId();

  if (!open) {
    return null;
  }

  return portal(
    <div className={cx("intra-modal-backdrop p-4", className)} role="presentation">
      <div
        className={cx(
          "intra-modal-panel w-full max-w-[var(--intra-modal-max-width)]",
          "p-5",
          panelClassName
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={cx("flex items-start", onClose ? "justify-between" : "justify-center", "gap-4")}>
          <div className={cx("min-w-0", align === "center" && "text-center")}>
            <div className={cx("flex min-w-0 items-center gap-2", align === "center" && "justify-center")}>
              {titleIcon ? (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--intra-radius-xs)] bg-intra-danger-soft text-intra-danger">
                  {titleIcon}
                </span>
              ) : null}
              <h3 id={titleId} className="intra-subtitle text-intra-blue">
                {title}
              </h3>
            </div>
            {description ? <p className={cx("intra-body text-intra-text-subtle mt-2")}>{description}</p> : null}
          </div>
          {onClose ? (
            <button
              type="button"
              className={cx("intra-icon-button shrink-0 text-intra-text-muted h-10 w-10")}
              onClick={onClose}
              aria-label="Cerrar"
            >
              <X className="intra-icon-lg" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        {children ? <div className="mt-4">{children}</div> : null}
        {footer ? (
          <div className={cx("flex flex-col-reverse sm:flex-row sm:justify-end mt-5 gap-2")}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

type IntraConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "primary" | "danger";
  icon?: ReactNode;
  showIcon?: boolean;
  showCloseButton?: boolean;
  align?: "start" | "center";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function IntraConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  variant = "danger",
  icon,
  showIcon = false,
  showCloseButton = false,
  align = "start",
  isLoading = false,
  onConfirm,
  onCancel,
}: IntraConfirmDialogProps) {
  const isDanger = variant === "danger";
  const ConfirmButtonClass = isDanger
    ? "intra-btn bg-intra-danger text-intra-card hover:opacity-95 disabled:opacity-60"
    : "intra-btn intra-btn-primary";

  if (!open) {
    return null;
  }

  return (
    <IntraModal
      open={open}
      title={title}
      titleIcon={showIcon ? (icon ?? <AlertTriangle className="intra-icon-body" aria-hidden="true" />) : undefined}
      description={description}
      onClose={showCloseButton ? onCancel : undefined}
      panelClassName="max-w-sm"
      align={align}
      footer={
        <>
          <IntraSecondaryButton
            type="button"
            className="w-full justify-center sm:w-auto"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </IntraSecondaryButton>
          <button
            type="button"
            className={cx(ConfirmButtonClass, "w-full justify-center sm:w-auto")}
            onClick={onConfirm}
            disabled={isLoading}
            aria-busy={isLoading || undefined}
          >
            {isLoading ? "Cargando..." : confirmLabel}
          </button>
        </>
      }
    />
  );
}

type IntraDrawerProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
};

export function IntraDrawer({ open, title, children, onClose, className }: IntraDrawerProps) {
  const titleId = useId();

  if (!open) {
    return null;
  }

  return portal(
    <div className="intra-drawer-backdrop" role="presentation">
      <aside className={cx("intra-drawer-panel overflow-y-auto p-5", className)} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="intra-subtitle">
            {title}
          </h2>
          <button type="button" className="intra-icon-button h-10 w-10 shrink-0" onClick={onClose} aria-label="Cerrar">
            <X className="intra-icon-lg" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </aside>
    </div>
  );
}

type IntraBottomSheetProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
};

export function IntraBottomSheet({ open, title, children, onClose, className }: IntraBottomSheetProps) {
  const titleId = useId();

  if (!open) {
    return null;
  }

  return portal(
    <div className="intra-bottom-sheet-backdrop" role="presentation">
      <section
        className={cx("intra-bottom-sheet-panel overflow-y-auto p-5", className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="intra-subtitle">
            {title}
          </h2>
          <button type="button" className="intra-icon-button h-10 w-10 shrink-0" onClick={onClose} aria-label="Cerrar">
            <X className="intra-icon-lg" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </section>
    </div>
  );
}

type IntraToastProps = HTMLAttributes<HTMLDivElement> & {
  tone?: "success" | "warning" | "danger" | "info";
};

export function IntraToast({ tone = "info", className, children, ...props }: IntraToastProps) {
  const toneClass =
    tone === "success"
      ? "border-intra-success-border bg-intra-success-soft text-intra-text-success"
      : tone === "warning"
        ? "border-intra-warning-border bg-intra-warning-soft text-intra-warning-text"
        : tone === "danger"
          ? "border-intra-danger-border bg-intra-danger-soft text-intra-danger"
          : "border-intra-border-soft bg-intra-info-soft text-intra-info";

  return (
    <div className={cx("intra-toast flex items-start gap-3", toneClass, className)} role="status" {...props}>
      <Info className="intra-icon-lg mt-0.5 shrink-0" aria-hidden="true" />
      <div className="intra-body">{children}</div>
    </div>
  );
}
