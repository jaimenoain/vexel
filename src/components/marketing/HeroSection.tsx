import React from 'react';

export const HeroSection = () => {
  return (
    <section className="py-32 px-6 flex flex-col items-center justify-center text-center">
      <h1 className="text-6xl md:text-7xl font-bold tracking-tighter mb-6">
        Total Asset Clarity
      </h1>
      <p className="text-lg text-zinc-500 max-w-2xl mb-10">
        The operating system for your global capital. Track, manage, and govern entities and assets in one glass cockpit.
      </p>
      <button
        className="bg-foreground text-background hover:bg-foreground/90 rounded-md px-8 py-6 text-lg font-medium transition-colors"
      >
        Initialize System
      </button>
    </section>
  );
};
