import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MagneticButton } from '../MagneticButton';

describe('MagneticButton', () => {
  it('renders children correctly', () => {
    render(
      <MagneticButton>
        <button>Click Me</button>
      </MagneticButton>
    );
    expect(screen.getByRole('button', { name: /Click Me/i })).toBeInTheDocument();
  });

  it('updates transform on mouse move', () => {
    render(
      <MagneticButton>
        <button>Hover Me</button>
      </MagneticButton>
    );

    const button = screen.getByText(/Hover Me/i);
    const wrapper = button.parentElement!;

    // Mock getBoundingClientRect
    jest.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      bottom: 100,
      right: 100,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    // Center is (50, 50).
    // Mouse at (60, 60) -> offset (10, 10) -> dampened (2, 2).

    fireEvent.mouseMove(wrapper, { clientX: 60, clientY: 60 });

    expect(wrapper).toHaveStyle('transform: translate(2px, 2px)');
  });

  it('resets transform on mouse leave', () => {
    render(
      <MagneticButton>
        <button>Leave Me</button>
      </MagneticButton>
    );

    const button = screen.getByText(/Leave Me/i);
    const wrapper = button.parentElement!;

    jest.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      bottom: 100,
      right: 100,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    // Move first
    fireEvent.mouseMove(wrapper, { clientX: 60, clientY: 60 });
    expect(wrapper).toHaveStyle('transform: translate(2px, 2px)');

    // Leave
    fireEvent.mouseLeave(wrapper);
    expect(wrapper).toHaveStyle('transform: translate(0px, 0px)');
  });
});
