'use client';

import React, { useRef, useState, useEffect } from 'react';

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({ children, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { left, top, width, height } = element.getBoundingClientRect();
      const centerX = left + width / 2;
      const centerY = top + height / 2;

      const x = (clientX - centerX) / 5;
      const y = (clientY - centerY) / 5;

      setPosition({ x, y });
    };

    const handleMouseLeave = () => {
      setPosition({ x: 0, y: 0 });
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const { x, y } = position;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transform: `translate(${x}px, ${y}px)`,
        transition: x === 0 && y === 0 ? 'transform 0.5s ease-out' : 'transform 0.1s ease-out',
        display: 'inline-block',
      }}
    >
      {children}
    </div>
  );
};
