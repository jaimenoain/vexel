import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Hr,
  Img,
} from '@react-email/components';

interface BaseLayoutProps {
  children: React.ReactNode;
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const logo = {
  margin: '0 auto',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
};

export const BaseLayout: React.FC<BaseLayoutProps> = ({ children }) => {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section>
             {/* Placeholder for Logo - Assuming a URL or local asset if available, using text for now or a standard placeholder */}
            <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#000000' }}>Vexel</Text>
            <Hr style={hr} />
          </Section>
          {children}
          <Section>
            <Hr style={hr} />
            <Text style={footer}>
              © {new Date().getFullYear()} Vexel. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default BaseLayout;
