import * as React from 'react';
import {
  Text,
  Section,
  Heading,
  Link,
} from '@react-email/components';
import BaseLayout from './BaseLayout';

interface AirlockReadyProps {
  filename: string;
  link: string;
}

export const AirlockReady = ({ filename, link }: AirlockReadyProps) => {
  return (
    <BaseLayout>
      <Section>
        <Heading style={{ fontSize: '24px', fontWeight: 'bold', color: '#000000' }}>
          Document Ready for Review
        </Heading>
        <Text style={{ fontSize: '16px', lineHeight: '24px', color: '#000000' }}>
          Your document <strong>{filename}</strong> has been processed and is ready for review.
        </Text>
        <Link href={link} style={{ fontSize: '16px', color: '#0070f3' }}>
          View in Airlock
        </Link>
      </Section>
    </BaseLayout>
  );
};

export default AirlockReady;
