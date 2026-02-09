import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { useTranslation } from 'react-i18next';

jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

describe('LanguageSwitcher', () => {
  const mockChangeLanguage = jest.fn();

  beforeEach(() => {
    (useTranslation as jest.Mock).mockReturnValue({
      t: (key: string) => key,
      i18n: {
        changeLanguage: mockChangeLanguage,
        resolvedLanguage: 'en',
      },
    });
    mockChangeLanguage.mockClear();
  });

  it('renders language options', () => {
    render(<LanguageSwitcher />);
    expect(screen.getByText('EN')).toBeInTheDocument();
    expect(screen.getByText('ES')).toBeInTheDocument();
    expect(screen.getByText('FR')).toBeInTheDocument();
  });

  it('highlights current language', () => {
    render(<LanguageSwitcher />);
    const enButton = screen.getByText('EN');
    expect(enButton).toHaveClass('text-[#111111]');
    expect(enButton).toHaveClass('font-bold');

    const esButton = screen.getByText('ES');
    expect(esButton).not.toHaveClass('font-bold');
  });

  it('calls changeLanguage on click', () => {
    render(<LanguageSwitcher />);
    const esButton = screen.getByText('ES');
    fireEvent.click(esButton);
    expect(mockChangeLanguage).toHaveBeenCalledWith('es');
  });
});
