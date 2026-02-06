import React, { useEffect, useState } from 'react';

interface SimpleToastProps {
  message: string;
  type?: 'error' | 'success' | 'info';
  onClose: () => void;
  duration?: number;
}

export function SimpleToast({ message, type = 'info', onClose, duration = 3000 }: SimpleToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // Wait for fade out
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500';

  return (
    <div
      className={`fixed bottom-4 right-4 px-4 py-2 rounded shadow-lg text-white text-sm font-medium transition-opacity duration-300 ${bgColor} ${
        visible ? 'opacity-100' : 'opacity-0'
      } z-50`}
    >
      {message}
    </div>
  );
}
