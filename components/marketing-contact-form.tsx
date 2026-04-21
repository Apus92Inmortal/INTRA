"use client"

import { useState } from "react"

export function MarketingContactForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [status, setStatus] = useState<null | "success">(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const subject = encodeURIComponent(`Contacto INTRA - ${name || "Nuevo mensaje"}`)
    const body = encodeURIComponent(
      `Nombre: ${name}\nEmail: ${email}\n\nMensaje:\n${message}`
    )

    window.location.href = `mailto:soporte@intra.com.co?subject=${subject}&body=${body}`
    setStatus("success")
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[28px] bg-[#f7f3eb] p-6 md:p-8">
      <div className="space-y-5">
        <div>
          <label htmlFor="contact-name" className="mb-2 block text-sm font-medium text-[#0B2C4A]">
            Nombre
          </label>
          <input
            id="contact-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className="w-full rounded-2xl border border-[#d8d1c4] bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#2ECC71] focus:ring-2 focus:ring-[#2ECC71]/15"
          />
        </div>

        <div>
          <label htmlFor="contact-email" className="mb-2 block text-sm font-medium text-[#0B2C4A]">
            Email
          </label>
          <input
            id="contact-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="w-full rounded-2xl border border-[#d8d1c4] bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#2ECC71] focus:ring-2 focus:ring-[#2ECC71]/15"
          />
        </div>

        <div>
          <label htmlFor="contact-message" className="mb-2 block text-sm font-medium text-[#0B2C4A]">
            Mensaje
          </label>
          <textarea
            id="contact-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            required
            rows={6}
            className="w-full rounded-2xl border border-[#d8d1c4] bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#2ECC71] focus:ring-2 focus:ring-[#2ECC71]/15"
          />
        </div>

        <button
          type="submit"
          className="rounded-full bg-[#2ECC71] px-8 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[#26b861]"
        >
          Enviar
        </button>

        {status === "success" ? (
          <div className="space-y-2 text-sm text-slate-600">
            <p>Gracias por escribirnos.</p>
            <p>Hemos preparado tu mensaje y nuestro equipo te responderá en las próximas 24 horas.</p>
          </div>
        ) : null}
      </div>
    </form>
  )
}
