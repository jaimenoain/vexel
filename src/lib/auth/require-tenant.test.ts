import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    })
  ),
}));

beforeEach(() => {
  mockGetUser.mockReset();
});

describe("requireTenantSession", () => {
  it("returns 401 when session is missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { requireTenantSession } = await import("./require-tenant");

    const result = await requireTenantSession();

    expect(result).toEqual({ error: "UNAUTHENTICATED", status: 401 });
  });

  it("returns 403 when session is present but no tenant_id", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "u@example.com",
          app_metadata: {},
        },
      },
    });
    const { requireTenantSession } = await import("./require-tenant");

    const result = await requireTenantSession();

    expect(result).toEqual({ error: "NO_TENANT", status: 403 });
  });

  it("returns session object when valid session with tenant_id", async () => {
    const user = {
      id: "user-1",
      email: "u@example.com",
      app_metadata: { tenant_id: "tenant-1", role: "admin" },
    };
    mockGetUser.mockResolvedValue({ data: { user } });
    const { requireTenantSession } = await import("./require-tenant");

    const result = await requireTenantSession();

    expect(result).not.toHaveProperty("error");
    expect(result).toMatchObject({
      user,
      tenantId: "tenant-1",
      role: "admin",
    });
  });
});
