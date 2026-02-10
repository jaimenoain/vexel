import React from 'react';
import { render, screen } from '@testing-library/react';
import { MarketingFooter } from '../MarketingFooter';

describe('MarketingFooter', () => {
  it('renders copyright and links', () => {
    render(<MarketingFooter />);

    expect(screen.getByText('© 2024 Vexel Inc.')).toBeInTheDocument();

    const privacyLink = screen.getByRole('link', { name: /privacy/i });
    expect(privacyLink).toBeInTheDocument();
    expect(privacyLink).toHaveAttribute('href', '/privacy');

    const termsLink = screen.getByRole('link', { name: /terms/i });
    expect(termsLink).toBeInTheDocument();
    expect(termsLink).toHaveAttribute('href', '/terms');
  });

  it('has correct layout classes', () => {
    render(<MarketingFooter />);
    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveClass('w-full', 'border-t', 'border-zinc-100', 'py-12', 'px-8', 'bg-background', 'text-sm', 'text-zinc-400');
  });
});
