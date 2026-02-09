import * as React from 'react';
import {
  Text,
  Section,
  Heading,
  Link,
} from '@react-email/components';
import BaseLayout from './BaseLayout';

interface GovernanceAlertProps {
  count: number;
  link: string;
}

export const GovernanceAlert = ({ count, link }: GovernanceAlertProps) => {
  return (
    <BaseLayout>
      <Section>
        <Heading style={{ fontSize: '24px', fontWeight: 'bold', color: '#000000' }}>
          Action Required
        </Heading>
        <Text style={{ fontSize: '16px', lineHeight: '24px', color: '#000000' }}>
          You have <strong>{count}</strong> overdue items that require your attention.
        </Text>
        <Link href={link} style={{ fontSize: '16px', color: '#0070f3' }}>
          View Dashboard
        </Link>
      </Section>
    </BaseLayout>
  );
};

export default GovernanceAlert;
