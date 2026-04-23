import { redirect } from "next/navigation";

type RegisterPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const resolvedSearchParams = await searchParams;
  const params = new URLSearchParams({ tab: "register" });

  if (resolvedSearchParams?.next?.startsWith("/")) {
    params.set("next", resolvedSearchParams.next);
  }

  redirect(`/app?${params.toString()}`);
}
