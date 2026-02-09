import * as React from 'react';
import {
  Text,
  Section,
  Heading,
} from '@react-email/components';
import BaseLayout from './BaseLayout';

interface GovernanceAlertProps {
  count: number;
}

export const GovernanceAlert = ({ count }: GovernanceAlertProps) => {
  return (
    <BaseLayout>
      <Section>
        <Heading style={{ fontSize: '24px', fontWeight: 'bold', color: '#000000' }}>
          Action Required
        </Heading>
        <Text style={{ fontSize: '16px', lineHeight: '24px', color: '#000000' }}>
          You have <strong>{count}</strong> overdue items that require your attention.
        </Text>
      </Section>
    </BaseLayout>
  );
};

export default GovernanceAlert;
