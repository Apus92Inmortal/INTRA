import { redirect } from "next/navigation";
import { isSafeInternalPath } from "@/lib/safe-next";

type RegisterPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const resolvedSearchParams = await searchParams;
  const params = new URLSearchParams({ tab: "register" });

  if (isSafeInternalPath(resolvedSearchParams?.next)) {
    params.set("next", resolvedSearchParams.next);
  }

  redirect(`/app?${params.toString()}`);
}
