import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  mockGetUser.mockReset();
});

describe("middleware (limbo gate)", () => {
  it("redirects unauthenticated user on a protected route to /login", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { updateSession } = await import("@/lib/supabase/middleware");
    const request = new NextRequest("http://localhost:3000/dashboard");
    const response = await updateSession(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toContain("/login");
  });

  it("redirects limbo user (no tenant_id) on a protected route to /onboarding", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          app_metadata: {},
        },
      },
    });
    const { updateSession } = await import("@/lib/supabase/middleware");
    const request = new NextRequest("http://localhost:3000/dashboard");
    const response = await updateSession(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toContain("/onboarding");
  });

  it("allows limbo user on /onboarding (no redirect loop)", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          app_metadata: {},
        },
      },
    });
    const { updateSession } = await import("@/lib/supabase/middleware");
    const request = new NextRequest("http://localhost:3000/onboarding");
    const response = await updateSession(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Location")).toBeNull();
  });

  it("allows authenticated user with tenant_id through", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          app_metadata: { tenant_id: "tenant-1" },
        },
      },
    });
    const { updateSession } = await import("@/lib/supabase/middleware");
    const request = new NextRequest("http://localhost:3000/dashboard");
    const response = await updateSession(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Location")).toBeNull();
  });
});
