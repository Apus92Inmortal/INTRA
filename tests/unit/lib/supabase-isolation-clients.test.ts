// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { browserFactory, serverFactory, adminFactory, getUser } = vi.hoisted(() => ({
  browserFactory: vi.fn(), serverFactory: vi.fn(), adminFactory: vi.fn(), getUser: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@supabase/ssr", () => ({ createBrowserClient: browserFactory, createServerClient: serverFactory }));
vi.mock("@supabase/supabase-js", () => ({ createClient: adminFactory }));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: vi.fn() }) }));

import { createClient as browserClient } from "@/lib/supabase/client";
import { createClient as serverClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { proxy } from "@/proxy";

describe("Supabase deployment isolation at client boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://okajyhkdyapbsornjeeb.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "synthetic-public-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "synthetic-service-key");
    vi.stubEnv("NEXT_PUBLIC_INTRA_DEPLOYMENT_ENV", "preview");
    vi.stubEnv("VERCEL_ENV", "preview");
    getUser.mockResolvedValue({ data: { user: { id: "synthetic-user" } }, error: null });
    browserFactory.mockReturnValue({ auth: { getUser } });
    serverFactory.mockReturnValue({ auth: { getUser } });
    adminFactory.mockReturnValue({ synthetic: true });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("never constructs a browser or SSR SDK client for the production project in Preview", async () => {
    expect((await browserClient().auth.getUser()).data.user).toBeNull();
    expect((await (await serverClient()).auth.getUser()).data.user).toBeNull();
    expect(browserFactory).not.toHaveBeenCalled();
    expect(serverFactory).not.toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
  });

  it("rejects service-role access before constructing the privileged SDK client", () => {
    expect(() => createAdminClient()).toThrow("Production database access is disabled");
    expect(adminFactory).not.toHaveBeenCalled();
  });

  it("redirects protected navigation without consulting the production Auth service", async () => {
    const response = await proxy(new NextRequest("http://localhost:3000/app/wallet"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/app?tab=login&next=%2Fapp%2Fwallet");
    expect(serverFactory).not.toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
  });

  it("permits an isolated Preview project and the production deployment's own project", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://isolated-test.supabase.co");
    browserClient();
    await serverClient();
    createAdminClient();
    expect(browserFactory).toHaveBeenCalledOnce();
    expect(serverFactory).toHaveBeenCalledOnce();
    expect(adminFactory).toHaveBeenCalledOnce();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://okajyhkdyapbsornjeeb.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_INTRA_DEPLOYMENT_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    browserClient();
    await serverClient();
    createAdminClient();
    expect(browserFactory).toHaveBeenCalledTimes(2);
    expect(serverFactory).toHaveBeenCalledTimes(2);
    expect(adminFactory).toHaveBeenCalledTimes(2);
  });
});
