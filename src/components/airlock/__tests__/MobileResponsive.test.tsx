import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import AirlockPage from '@/app/airlock/[id]/page';
import { useAuth } from '@/app/context/AuthContext';
import { useParams } from 'next/navigation';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
}));

jest.mock('@/app/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/src/components/layout/Shell', () => ({
  Shell: ({ children }: { children: React.ReactNode }) => <div data-testid="shell">{children}</div>,
}));

// Mock child components to verify their presence easily
jest.mock('@/src/components/airlock/AirlockMobileList', () => ({
  AirlockMobileList: () => <div data-testid="airlock-mobile-list">Mobile List</div>,
}));

jest.mock('@/src/components/airlock/AirlockMobileModal', () => ({
  AirlockMobileModal: () => <div data-testid="airlock-mobile-modal">Mobile Modal</div>,
}));

jest.mock('@/src/components/airlock/PdfViewer', () => ({
  PdfViewer: () => <div data-testid="pdf-viewer">PDF Viewer</div>,
}));

jest.mock('@/src/components/airlock/TransactionEditor', () => ({
  TransactionEditor: () => <div data-testid="transaction-editor">Transaction Editor</div>,
}));

describe('AirlockPage Responsive Behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    (useParams as jest.Mock).mockReturnValue({ id: '123' });
    (useAuth as jest.Mock).mockReturnValue({
      session: { access_token: 'fake-token' },
      loading: false,
    });

    // Mock fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: '123',
        asset_id: 'asset-123',
        status: 'REVIEW_NEEDED',
        traffic_light: 'YELLOW',
        confidence_score: 0.85,
        ai_payload: { transactions: [] }
      }),
    });
  });

  const resizeWindow = (width: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    fireEvent(window, new Event('resize'));
  };

  it('renders mobile view when width is < 768px', async () => {
    // Set initial width to mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    await act(async () => {
      render(<AirlockPage />);
    });

    // Expect Mobile List to be present
    expect(screen.getByTestId('airlock-mobile-list')).toBeInTheDocument();

    // Expect Desktop components NOT to be present
    expect(screen.queryByTestId('pdf-viewer')).not.toBeInTheDocument();
  });

  it('renders desktop view when width is >= 768px', async () => {
    // Set initial width to desktop
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    await act(async () => {
      render(<AirlockPage />);
    });

    // Expect Desktop components to be present
    expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument();
    expect(screen.getByTestId('transaction-editor')).toBeInTheDocument();

    // Expect Mobile List NOT to be present
    expect(screen.queryByTestId('airlock-mobile-list')).not.toBeInTheDocument();
  });

  it('switches to mobile view on resize', async () => {
     // Start Desktop
     Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      await act(async () => {
        render(<AirlockPage />);
      });

      expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument();

      // Resize to Mobile
      act(() => {
          resizeWindow(375);
      });

      // Assert Mobile List is now present
      expect(screen.getByTestId('airlock-mobile-list')).toBeInTheDocument();
      expect(screen.queryByTestId('pdf-viewer')).not.toBeInTheDocument();
  });
});
