import React from 'react';
import { render, screen } from '@testing-library/react';
import LandingPage from '../LandingPage';

describe('LandingPage', () => {
  it('renders a main element', () => {
    render(<LandingPage />);
    const mainElement = screen.getByRole('main');
    expect(mainElement).toBeInTheDocument();
    expect(mainElement).toHaveClass('flex-1');
  });

  it('has the correct layout classes', () => {
    const { container } = render(<LandingPage />);
    // The first child of the container is the div we rendered
    const divElement = container.firstChild;
    expect(divElement).toHaveClass('flex', 'flex-col', 'min-h-screen', 'bg-background');
  });

  it('renders the footer', () => {
    render(<LandingPage />);
    const footerElement = screen.getByRole('contentinfo');
    expect(footerElement).toBeInTheDocument();
  });
});
