import React from 'react';
import { render, screen } from '@testing-library/react';
import { HeroSection } from '../HeroSection';

describe('HeroSection', () => {
  it('renders the headline', () => {
    render(<HeroSection />);
    const headline = screen.getByRole('heading', { level: 1 });
    expect(headline).toHaveTextContent('Total Asset Clarity');
    expect(headline).toHaveClass('text-6xl', 'md:text-7xl', 'font-bold', 'tracking-tighter');
  });

  it('renders the subtext', () => {
    render(<HeroSection />);
    const subtext = screen.getByText(/The operating system for your global capital/i);
    expect(subtext).toBeInTheDocument();
    expect(subtext).toHaveClass('text-lg', 'text-zinc-500');
  });

  it('renders the CTA button', () => {
    render(<HeroSection />);
    const button = screen.getByRole('button', { name: /Initialize System/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-foreground', 'text-background', 'rounded-md', 'font-medium');
  });
});
