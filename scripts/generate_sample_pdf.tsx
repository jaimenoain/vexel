import React from 'react';
import { renderToFile } from '@react-pdf/renderer';
import { NetWorthStatement, NetWorthReportData } from '../src/components/reports/NetWorthStatement';

const generateSampleReport = async () => {
  const data: NetWorthReportData = {
    reportDate: 'October 31, 2023',
    currency: 'USD',
    totalAssets: 12500000,
    totalLiabilities: 2500000,
    netEquity: 10000000,
    assetGroups: [
      {
        groupName: 'Real Estate',
        items: [
          { name: 'Primary Residence', value: 5000000 },
          { name: 'Vacation Home', value: 3000000 },
        ],
        total: 8000000,
      },
      {
        groupName: 'Public Equities',
        items: [
          { name: 'Vanguard Total Stock Market', value: 2000000 },
          { name: 'Berkshire Hathaway', value: 1500000 },
        ],
        total: 3500000,
      },
      {
        groupName: 'Cash & Equivalents',
        items: [
          { name: 'Chase Checking', value: 500000 },
          { name: 'Goldman Sachs HYSA', value: 500000 },
        ],
        total: 1000000,
      },
    ],
    liabilityGroups: [
      {
        groupName: 'Mortgages',
        items: [
          { name: 'Primary Residence Mortgage', value: 2000000 },
          { name: 'Vacation Home Mortgage', value: 500000 },
        ],
        total: 2500000,
      },
    ],
  };

  try {
    await renderToFile(<NetWorthStatement data={data} />, './net_worth_statement_sample.pdf');
    console.log('Successfully generated net_worth_statement_sample.pdf');
  } catch (error) {
    console.error('Error generating PDF:', error);
    process.exit(1);
  }
};

generateSampleReport();
