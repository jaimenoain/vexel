import React, { Suspense } from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AssetDetailPage from '@/app/portfolio/[assetId]/page';

// Mock swr
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock useAuth
jest.mock('@/app/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock Shell
jest.mock('@/src/components/layout/Shell', () => ({
  Shell: ({ children }: { children: React.ReactNode }) => <div data-testid="shell">{children}</div>,
}));

import useSWR from 'swr';
import { useAuth } from '@/app/context/AuthContext';

describe('AssetDetailPage', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ session: { access_token: 'fake-token' } });
  });

  it('renders asset name correctly', async () => {
    const mockEntities = [
      {
        id: 'entity-1',
        name: 'Entity One',
        type: 'FAMILY',
        assets: [
          { id: 'asset-1', name: 'Asset One', type: 'BANK', currency: 'USD', net_worth: 100 },
        ],
      },
    ];

    (useSWR as jest.Mock).mockReturnValue({
      data: mockEntities,
      error: undefined,
      isLoading: false,
    });

    const params = Promise.resolve({ assetId: 'asset-1' });

    await act(async () => {
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <AssetDetailPage params={params} />
        </Suspense>
      );
    });

    expect(await screen.findByText('Asset One')).toBeInTheDocument();
    expect(screen.getByText('Asset ID: asset-1')).toBeInTheDocument();
  });

   it('renders asset ID when name not found', async () => {
    (useSWR as jest.Mock).mockReturnValue({
      data: [],
      error: undefined,
      isLoading: false,
    });

    const params = Promise.resolve({ assetId: 'unknown-asset' });
    await act(async () => {
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <AssetDetailPage params={params} />
        </Suspense>
      );
    });

    expect(await screen.findByText('unknown-asset')).toBeInTheDocument();
    expect(screen.getByText('Asset ID: unknown-asset')).toBeInTheDocument();
  });
});
