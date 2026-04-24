import { redirect } from "next/navigation";
import { isSafeInternalPath } from "@/lib/safe-next";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const params = new URLSearchParams({ tab: "login" });

  if (resolvedSearchParams?.error) {
    params.set("error", resolvedSearchParams.error);
  }

  if (isSafeInternalPath(resolvedSearchParams?.next)) {
    params.set("next", resolvedSearchParams.next);
  }

  redirect(`/app?${params.toString()}`);
}
