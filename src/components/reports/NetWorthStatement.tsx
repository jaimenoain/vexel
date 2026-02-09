import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { formatCurrency } from '../../../lib/formatting';

// --- Data Interfaces ---

export interface AssetStart {
  name: string;
  value: number;
}

export interface AssetGroup {
  groupName: string;
  items: AssetStart[];
  total: number;
}

export interface NetWorthReportData {
  reportDate: string;
  currency: string;
  totalAssets: number;
  totalLiabilities: number;
  netEquity: number;
  assetGroups: AssetGroup[];
  liabilityGroups: AssetGroup[];
}

// --- Styles ---

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#000000',
  },
  // Cover Page Styles
  coverContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  coverDate: {
    fontSize: 14,
    color: '#000000',
    marginBottom: 40,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    border: '1px solid #E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 8,
    color: '#000000',
  },

  // Section Styles
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    textTransform: 'uppercase',
    borderBottom: '1px solid #000000',
    paddingBottom: 5,
  },
  subHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 5,
    color: '#000000',
  },

  // Table Styles
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingVertical: 5,
    alignItems: 'center',
  },
  tableRowTotal: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#000000',
    paddingVertical: 5,
    marginTop: 5,
    marginBottom: 10,
    alignItems: 'center',
  },
  tableRowGrandTotal: {
    flexDirection: 'row',
    borderTopWidth: 2,
    borderTopColor: '#000000',
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    paddingVertical: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  colLabel: {
    flex: 3,
    textAlign: 'left',
  },
  colValue: {
    flex: 1,
    textAlign: 'right',
    fontVariant: ['tabular-nums'], // Ideally supported, but PDF might just rely on font
  },
  bold: {
    fontWeight: 'bold',
  },

  // Grid/Layout
  spacer: {
    height: 20,
  },
});

// --- Components ---

const CoverPage = ({ date }: { date: string }) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.coverContainer}>
      <View style={styles.logoPlaceholder}>
        <Text style={styles.logoText}>Family Office Logo</Text>
      </View>
      <Text style={styles.coverTitle}>Net Worth Statement</Text>
      <Text style={styles.coverDate}>{date}</Text>
    </View>
  </Page>
);

const SummaryRow = ({ label, value, currency, isTotal = false, isGrandTotal = false }: { label: string, value: number, currency: string, isTotal?: boolean, isGrandTotal?: boolean }) => {
  const rowStyle = isGrandTotal ? styles.tableRowGrandTotal : (isTotal ? styles.tableRowTotal : styles.tableRow);
  const textStyle = (isTotal || isGrandTotal) ? styles.bold : {};

  return (
    <View style={rowStyle}>
      <Text style={[styles.colLabel, textStyle]}>{label}</Text>
      <Text style={[styles.colValue, textStyle]}>{formatCurrency(value, currency, 'en-US')}</Text>
    </View>
  );
};

const SummaryPage = ({ data }: { data: NetWorthReportData }) => (
  <Page size="A4" style={styles.page}>
    <Text style={styles.sectionTitle}>Executive Summary</Text>
    <View style={styles.spacer} />

    <SummaryRow label="Total Assets" value={data.totalAssets} currency={data.currency} />
    <SummaryRow label="Total Liabilities" value={data.totalLiabilities} currency={data.currency} />
    <View style={styles.spacer} />
    <SummaryRow label="Net Equity" value={data.netEquity} currency={data.currency} isGrandTotal />
  </Page>
);

const DetailedSchedulePage = ({ data }: { data: NetWorthReportData }) => (
  <Page size="A4" style={styles.page}>
    <Text style={styles.sectionTitle}>Detailed Schedule</Text>

    <Text style={styles.subHeader}>Assets</Text>
    {data.assetGroups.map((group, idx) => (
      <View key={`asset-group-${idx}`}>
        <Text style={{ marginTop: 10, marginBottom: 5, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' }}>{group.groupName}</Text>
        {group.items.map((item, itemIdx) => (
           <SummaryRow key={`asset-${idx}-${itemIdx}`} label={item.name} value={item.value} currency={data.currency} />
        ))}
        <SummaryRow label={`Total ${group.groupName}`} value={group.total} currency={data.currency} isTotal />
        <View style={{height: 10}} />
      </View>
    ))}

    <View style={styles.spacer} />

    <Text style={styles.subHeader}>Liabilities</Text>
    {data.liabilityGroups.map((group, idx) => (
      <View key={`liab-group-${idx}`}>
        <Text style={{ marginTop: 10, marginBottom: 5, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' }}>{group.groupName}</Text>
        {group.items.map((item, itemIdx) => (
           <SummaryRow key={`liab-${idx}-${itemIdx}`} label={item.name} value={item.value} currency={data.currency} />
        ))}
        <SummaryRow label={`Total ${group.groupName}`} value={group.total} currency={data.currency} isTotal />
        <View style={{height: 10}} />
      </View>
    ))}
  </Page>
);

// --- Main Document ---

export const NetWorthStatement = ({ data }: { data: NetWorthReportData }) => (
  <Document>
    <CoverPage date={data.reportDate} />
    <SummaryPage data={data} />
    <DetailedSchedulePage data={data} />
  </Document>
);

export default NetWorthStatement;
