import React from 'react';
import { render, screen } from '@testing-library/react';
import { MarketingNavbar } from '../MarketingNavbar';

describe('MarketingNavbar', () => {
  it('renders without crashing', () => {
    render(<MarketingNavbar />);
    const navElement = screen.getByRole('navigation');
    expect(navElement).toBeInTheDocument();
  });

  it('displays the brand name "Vexel"', () => {
    render(<MarketingNavbar />);
    const brandElement = screen.getByText('Vexel');
    expect(brandElement).toBeInTheDocument();
    expect(brandElement).toHaveClass('font-bold', 'tracking-tight', 'text-xl');
  });

  it('contains a "Sign In" link pointing to /login', () => {
    render(<MarketingNavbar />);
    const linkElement = screen.getByRole('link', { name: /sign in/i });
    expect(linkElement).toBeInTheDocument();
    expect(linkElement).toHaveAttribute('href', '/login');
  });
});
