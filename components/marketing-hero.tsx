import Image from "next/image"
import type { ReactNode } from "react"

export function MarketingHero({
  image,
  title,
  subtitle,
  children,
  minHeight = "min-h-[520px]",
}: {
  image: string
  title: ReactNode
  subtitle?: ReactNode
  children?: ReactNode
  minHeight?: string
}) {
  return (
    <section className="px-5 pt-5 md:px-8 lg:px-12">
      <div
        className={`relative mx-auto flex max-w-7xl items-center justify-center overflow-hidden rounded-[28px] px-6 py-20 text-center text-white shadow-[0_22px_70px_rgba(11,44,74,0.18)] md:px-10 ${minHeight}`}
      >
        <Image
          src={image}
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,26,44,0.55),rgba(8,26,44,0.45))]" />
        <div className="relative z-10 max-w-4xl">
          <h1 className="text-4xl font-semibold leading-tight tracking-[-0.03em] md:text-6xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-white/90 md:text-xl md:leading-8">
              {subtitle}
            </p>
          ) : null}
          {children}
        </div>
      </div>
    </section>
  )
}

export function MarketingCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className="px-5 py-4 md:px-8 lg:px-12">
      <div
        className={`mx-auto max-w-7xl rounded-[28px] bg-white px-6 py-10 shadow-[0_16px_50px_rgba(11,44,74,0.08)] md:px-10 md:py-12 ${className}`}
      >
        {children}
      </div>
    </section>
  )
}
