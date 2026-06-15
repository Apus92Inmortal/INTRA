import type { ReactNode } from "react"

export type AdminInboxTab = {
  key: string
  label: string
  count: number
}

export function AdminMetricCard({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="rounded-2xl bg-intra-bg-app px-4 py-3">
      <p className="intra-caption-strong text-intra-blue">{label}</p>
      <p className="mt-1 intra-metric-sm text-intra-blue">{value}</p>
    </div>
  )
}

export function AdminField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <p className="intra-caption-strong uppercase tracking-wide text-intra-text-muted">
        {label}
      </p>
      <div className="mt-1 intra-body-strong break-words text-intra-blue">
        {children}
      </div>
    </div>
  )
}

export function AdminEmptyState({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-dashed border-intra-border-soft bg-intra-card px-6 py-6 intra-body text-intra-text-subtle shadow-sm">
      {children}
    </section>
  )
}

export function AdminFeedback({
  type,
  children,
}: {
  type: "success" | "error"
  children: ReactNode
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 intra-body ${
        type === "error"
          ? "border-intra-danger-border bg-intra-danger-soft text-intra-danger"
          : "border-intra-success-border bg-intra-success-soft text-intra-text-success"
      }`}
    >
      {children}
    </div>
  )
}

export function AdminSectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="intra-h2">{children}</h2>
}

export function AdminSubsectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="intra-h3">{children}</h3>
}

export function AdminInboxTabs({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: AdminInboxTab[]
  activeTab: string
  onTabChange: (tab: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`inline-flex min-h-11 items-center gap-2 rounded-[var(--intra-radius-xs)] border px-4 py-2.5 intra-badge-text transition ${
              isActive
                ? "border-intra-blue bg-intra-blue text-intra-card"
                : "border-intra-border-soft bg-intra-card text-intra-text-subtle hover:border-intra-blue hover:text-intra-blue"
            }`}
          >
            <span>{tab.label}</span>
            <span className="rounded-full border border-current px-2 py-0.5">
              {tab.count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
