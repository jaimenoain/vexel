import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AirlockPage from '../page';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'test-id' }),
}));

jest.mock('@/app/context/AuthContext', () => ({
  useAuth: () => ({
    session: { access_token: 'fake-token' },
    loading: false,
  }),
}));

// Mock Shell component to avoid complex layout issues in test
jest.mock('@/src/components/layout/Shell', () => ({
  Shell: ({ children }: { children: React.ReactNode }) => <div data-testid="shell-mock">{children}</div>,
}));

// Mock fetch
global.fetch = jest.fn();

const mockItem = {
  id: 'test-id',
  asset_id: 'asset-123',
  file_path: 'test.pdf',
  status: 'REVIEW_NEEDED',
  url: 'https://example.com/test.pdf',
  confidence_score: 0.95,
  traffic_light: 'GREEN',
  created_at: '2023-01-01T00:00:00Z',
  ai_payload: {
    transactions: [
      {
        date: '2023-01-01',
        description: 'Test Transaction',
        amount: 100.00,
        currency: 'USD',
        confidence: 0.99
      }
    ]
  }
};

describe('AirlockPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolve
    render(<AirlockPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders error state on fetch failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
    });

    render(<AirlockPage />);

    await waitFor(() => {
      expect(screen.getByText('Error: Error fetching airlock item: Not Found')).toBeInTheDocument();
    });
  });

  it('renders PDF Viewer and Editor with data', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockItem,
    });

    render(<AirlockPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Check PDF Viewer
    // Note: PDFViewer uses iframe, we can check if it exists
    // The component renders an iframe with title "PDF Document"
    expect(screen.getByTitle('PDF Document')).toHaveAttribute('src', mockItem.url);

    // Check Editor content
    expect(screen.getByDisplayValue('Test Transaction')).toBeInTheDocument();
  });

  it('handles split transaction logic correctly', async () => {
     (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockItem,
    });

    render(<AirlockPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Initial state: 1 transaction
    const initialRows = screen.getAllByLabelText('Description');
    expect(initialRows).toHaveLength(1);

    // Click "Add Split"
    const addSplitBtn = screen.getByTestId('add-split-btn'); // Need to ensure this ID exists or use text
    fireEvent.click(addSplitBtn);

    // Verify row added
    await waitFor(() => {
        const rows = screen.getAllByLabelText('Description');
        expect(rows).toHaveLength(2);
    });

    // Verify removal
    const removeButtons = screen.getAllByLabelText('Remove row');
    fireEvent.click(removeButtons[1]); // Remove the new one

    await waitFor(() => {
        const rows = screen.getAllByLabelText('Description');
        expect(rows).toHaveLength(1);
    });
  });

  it('handles invalid file path gracefully', async () => {
      const itemWithoutUrl = { ...mockItem, url: null };
      (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => itemWithoutUrl,
      });

      render(<AirlockPage />);

      await waitFor(() => {
          expect(screen.getByText('No document available')).toBeInTheDocument();
      });
  });
});
