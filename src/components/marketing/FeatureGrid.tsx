import React from 'react';

export const FeatureGrid = () => {
  return (
    <section className="w-full max-w-6xl mx-auto px-6 pb-32 animate-fade-in-up delay-300">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Global Position - Spans 2 columns */}
        <div className="md:col-span-2 bg-white border border-zinc-200 p-8 rounded-lg">
          <div className="font-mono text-xs uppercase text-zinc-500 mb-4">
            SCOPE: GLOBAL
          </div>
          <h3 className="text-2xl font-semibold mb-2">Global Position</h3>
          <p className="text-zinc-600">
            A high-level overview of your entire portfolio, aggregating data from all connected entities and asset classes into a single, unified view.
          </p>
        </div>

        {/* Card 2: Entity Control - Spans 1 column */}
        <div className="md:col-span-1 bg-white border border-zinc-200 p-8 rounded-lg">
          <div className="font-mono text-xs uppercase text-zinc-500 mb-4">
            SCOPE: ENTITY
          </div>
          <h3 className="text-2xl font-semibold mb-2">Entity Control</h3>
          <p className="text-zinc-600">
            Granular control over individual holding companies, allowing for precise management of mandates and access.
          </p>
        </div>

        {/* Card 3: Asset Details - Spans 3 columns (full width row) */}
        <div className="md:col-span-3 bg-white border border-zinc-200 p-8 rounded-lg">
          <div className="font-mono text-xs uppercase text-zinc-500 mb-4">
            SCOPE: ASSET
          </div>
          <h3 className="text-2xl font-semibold mb-2">Asset Details</h3>
          <p className="text-zinc-600">
            Deep dive into specific asset performance, valuation history, and documentation. Track every detail from acquisition to disposition.
          </p>
        </div>
      </div>
    </section>
  );
};
