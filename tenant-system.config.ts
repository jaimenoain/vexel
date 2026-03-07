import type { TenantSystemConfig } from './types/tenant-config'

export const tenantConfig = {
  roles: {
    all: ['owner', 'admin', 'editor', 'viewer'],
    owner: 'owner',
    defaultMember: 'viewer',
    admin: ['owner', 'admin'],
  },
  routing: {
    protectedRoutes: [
      '/dashboard',
      '/assets',
      '/liabilities',
      '/transactions',
      '/documents',
      '/entities',
      '/settings',
    ],
    onboardingRoute: '/onboarding',
    postOnboardingRoute: '/dashboard',
  },
  email: {
    blacklistedDomains: [
      'gmail.com',
      'outlook.com',
      'yahoo.com',
      'hotmail.com',
      'icloud.com',
      'protonmail.com',
    ],
  },
} satisfies TenantSystemConfig
