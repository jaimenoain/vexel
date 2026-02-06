import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContextSwitcher } from '../ContextSwitcher';
import { useAuth } from '@/app/context/AuthContext';
import { useVexelContext } from '@/app/context/VexelContext';

// Mock the hooks
jest.mock('@/app/context/AuthContext');
jest.mock('@/app/context/VexelContext');

const mockUseAuth = useAuth as jest.Mock;
const mockUseVexelContext = useVexelContext as jest.Mock;

describe('ContextSwitcher', () => {
  const mockSetSelectedScope = jest.fn();
  const mockEntities = [
    {
      id: 'entity-1',
      name: 'Entity One',
      assets: [
        { id: 'asset-1', name: 'Asset One' },
        { id: 'asset-2', name: 'Asset Two' },
      ],
    },
    {
      id: 'entity-2',
      name: 'Entity Two',
      assets: [
        { id: 'asset-3', name: 'Asset Three' },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue({
      session: { access_token: 'fake-token' },
    });

    mockUseVexelContext.mockReturnValue({
      selectedScope: { type: 'GLOBAL' },
      setSelectedScope: mockSetSelectedScope,
    });

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockEntities),
      })
    ) as jest.Mock;
  });

  it('renders default state correctly (Global View)', () => {
    render(<ContextSwitcher />);
    expect(screen.getByText('Global View')).toBeInTheDocument();
  });

  it('opens dropdown and displays entities and assets', async () => {
    render(<ContextSwitcher />);

    // Open dropdown
    fireEvent.click(screen.getByText('Global View'));

    // Check if dropdown content is fetched and displayed
    await waitFor(() => {
      expect(screen.getByText('Entity One')).toBeInTheDocument();
      expect(screen.getByText('Asset One')).toBeInTheDocument();
      expect(screen.getByText('Asset Two')).toBeInTheDocument();
      expect(screen.getByText('Entity Two')).toBeInTheDocument();
      expect(screen.getByText('Asset Three')).toBeInTheDocument();
    });
  });

  it('updates scope when an asset is clicked', async () => {
    render(<ContextSwitcher />);

    // Open dropdown
    fireEvent.click(screen.getByText('Global View'));

    // Wait for data
    await waitFor(() => screen.getByText('Asset One'));

    // Click on Asset One
    fireEvent.click(screen.getByText('Asset One'));

    expect(mockSetSelectedScope).toHaveBeenCalledWith({
      type: 'ASSET',
      id: 'asset-1',
      name: 'Asset One',
    });
  });

  it('updates scope when an entity group is clicked', async () => {
      render(<ContextSwitcher />);

      // Open dropdown
      fireEvent.click(screen.getByText('Global View'));

      // Wait for data
      await waitFor(() => screen.getByText('All Entity One Assets'));

      // Click on Entity One Group
      fireEvent.click(screen.getByText('All Entity One Assets'));

      expect(mockSetSelectedScope).toHaveBeenCalledWith({
        type: 'ENTITY',
        id: 'entity-1',
        name: 'Entity One',
      });
    });

  it('updates scope when Global View is clicked inside dropdown', async () => {
    // Setup initial state as non-global to verify change
    mockUseVexelContext.mockReturnValue({
        selectedScope: { type: 'ASSET', id: 'asset-1', name: 'Asset One' },
        setSelectedScope: mockSetSelectedScope,
    });

    render(<ContextSwitcher />);

    // The button label should be "Asset One"
    expect(screen.getByText('Asset One')).toBeInTheDocument();

    // Open dropdown
    fireEvent.click(screen.getByText('Asset One'));

    // Wait for dropdown to open and show Global View
    const globalOptions = await screen.findAllByText('Global View');
    fireEvent.click(globalOptions[0]);

    expect(mockSetSelectedScope).toHaveBeenCalledWith({
      type: 'GLOBAL',
    });
  });
});
