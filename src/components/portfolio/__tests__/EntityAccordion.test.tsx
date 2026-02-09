import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EntityAccordion } from '../EntityAccordion';
import { Entity, Asset } from '@/lib/types';

// Mock data
const mockAssets: Asset[] = [
  { id: 'asset-1', name: 'Test Asset 1', type: 'BANK', currency: 'USD', net_worth: 100 },
  { id: 'asset-2', name: 'Test Asset 2', type: 'PROPERTY', currency: 'USD', net_worth: 200 },
];

const mockEntity: Entity = {
  id: 'entity-1',
  name: 'Test Entity',
  type: 'FAMILY',
  assets: mockAssets,
};

const mockEmptyEntity: Entity = {
  id: 'entity-empty',
  name: 'Empty Entity',
  type: 'FAMILY',
  assets: [],
};

describe('EntityAccordion', () => {
  it('renders entity name and hides assets initially (Hierarchy Check)', () => {
    render(<EntityAccordion entity={mockEntity} />);

    // Hierarchy Validation: Entity name is visible
    expect(screen.getByText('Test Entity')).toBeInTheDocument();

    // Hierarchy Validation: Assets are hidden initially
    expect(screen.queryByText('Test Asset 1')).not.toBeInTheDocument();
  });

  it('expands on click and shows assets (Interaction Check)', () => {
    render(<EntityAccordion entity={mockEntity} />);

    const button = screen.getByTestId('entity-accordion-button');
    const chevron = screen.getByTestId('chevron-icon');

    // Initial state: Chevron not rotated
    expect(chevron).not.toHaveClass('rotate-90');

    // Interaction Check: Click to expand
    fireEvent.click(button);

    // Verify assets are visible
    expect(screen.getByText('Test Asset 1')).toBeInTheDocument();
    expect(screen.getByText('Test Asset 2')).toBeInTheDocument();

    // Verify Chevron rotation (Visual Compliance)
    expect(chevron).toHaveClass('rotate-90');
  });

  it('collapses on second click', () => {
    render(<EntityAccordion entity={mockEntity} />);

    const button = screen.getByTestId('entity-accordion-button');

    // Expand
    fireEvent.click(button);
    expect(screen.getByText('Test Asset 1')).toBeInTheDocument();

    // Collapse
    fireEvent.click(button);
    expect(screen.queryByText('Test Asset 1')).not.toBeInTheDocument();

    const chevron = screen.getByTestId('chevron-icon');
    expect(chevron).not.toHaveClass('rotate-90');
  });

  it('renders asset links with correct href (Navigation Check)', () => {
    render(<EntityAccordion entity={mockEntity} />);

    // Expand accordion
    fireEvent.click(screen.getByTestId('entity-accordion-button'));

    // Navigation Check: Verify href
    const assetLink1 = screen.getByText('Test Asset 1').closest('a');
    expect(assetLink1).toHaveAttribute('href', '/portfolio/asset-1');

    const assetLink2 = screen.getByText('Test Asset 2').closest('a');
    expect(assetLink2).toHaveAttribute('href', '/portfolio/asset-2');
  });

  it('handles entity with zero assets correctly (Edge Case)', () => {
    render(<EntityAccordion entity={mockEmptyEntity} />);

    const button = screen.getByTestId('entity-accordion-button');
    fireEvent.click(button);

    // Edge Case: Should show "No assets"
    expect(screen.getByText('No assets')).toBeInTheDocument();
  });
});
