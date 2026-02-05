'use client';

import React from 'react';
import { BuildingDiscoveryMap } from '@/src/components/common/BuildingDiscoveryMap';

const MOCK_BUILDINGS: any[] = [
  { id: '1', name: 'Mock Building A', location_lat: 51.505, location_lng: -0.09, main_image_url: null, status: 'completed' },
  { id: '2', name: 'Mock Building B', location_lat: 51.51, location_lng: -0.1, main_image_url: null, status: 'completed' },
  { id: '3', name: 'Mock Building C', location_lat: 51.515, location_lng: -0.09, main_image_url: null, status: 'completed' },
];

export const SearchPage = () => {
  return (
    <div className="w-full h-screen">
       <BuildingDiscoveryMap buildings={MOCK_BUILDINGS} />
    </div>
  );
};
