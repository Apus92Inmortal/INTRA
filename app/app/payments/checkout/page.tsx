import { Suspense } from "react"
import { AppNavbar } from "@/components/app-navbar"
import CheckoutClient from "./CheckoutClient"

export default function CheckoutPage() {
  return (
    <>
      <AppNavbar />
      <Suspense fallback={null}>
        <CheckoutClient />
      </Suspense>
    </>
  )
}
