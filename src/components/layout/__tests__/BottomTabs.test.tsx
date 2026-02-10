import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomTabs } from '../BottomTabs';

describe('BottomTabs', () => {
  it('renders correctly with existing tabs', () => {
    render(<BottomTabs />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Airlock')).toBeInTheDocument();
    expect(screen.getByText('Ledger')).toBeInTheDocument();
    expect(screen.getByText('Menu')).toBeInTheDocument();
  });

  it('renders the FAB button and hidden file input', () => {
    render(<BottomTabs />);

    const fabButton = screen.getByLabelText('Upload');
    expect(fabButton).toBeInTheDocument();
    // Check key classes for styling
    expect(fabButton).toHaveClass('w-14', 'h-14', 'bg-[#111111]', 'rounded-full');

    const fileInput = screen.getByTestId('file-upload-input');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveClass('hidden');
    expect(fileInput).toHaveAttribute('type', 'file');
  });

  it('triggers file input click when FAB is clicked', () => {
    render(<BottomTabs />);

    const fileInput = screen.getByTestId('file-upload-input');
    const fabButton = screen.getByLabelText('Upload');

    // Spy on the click method of the input element
    const clickSpy = jest.spyOn(fileInput, 'click');

    fireEvent.click(fabButton);
    expect(clickSpy).toHaveBeenCalled();
  });

  it('logs file selection on change', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    render(<BottomTabs />);

    const fileInput = screen.getByTestId('file-upload-input');

    const file = new File(['test content'], 'test-file.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(consoleSpy).toHaveBeenCalledWith('File selected:', 'test-file.png');
    consoleSpy.mockRestore();
  });
});
