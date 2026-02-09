import * as React from 'react';
import {
  Text,
  Section,
  Heading,
} from '@react-email/components';
import BaseLayout from './BaseLayout';

interface AirlockReadyProps {
  filename: string;
}

export const AirlockReady = ({ filename }: AirlockReadyProps) => {
  return (
    <BaseLayout>
      <Section>
        <Heading style={{ fontSize: '24px', fontWeight: 'bold', color: '#000000' }}>
          Document Ready for Review
        </Heading>
        <Text style={{ fontSize: '16px', lineHeight: '24px', color: '#000000' }}>
          Your document <strong>{filename}</strong> has been processed and is ready for review.
        </Text>
      </Section>
    </BaseLayout>
  );
};

export default AirlockReady;
