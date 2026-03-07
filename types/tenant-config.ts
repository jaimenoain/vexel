export type TenantSystemConfig = {
  roles: {
    all: string[]
    owner: string
    defaultMember: string
    admin: string[]
  }
  routing: {
    protectedRoutes: string[]
    onboardingRoute: string
    postOnboardingRoute: string
  }
  email: {
    blacklistedDomains: string[]
  }
}
