import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'
import { brand } from './brand'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>{`تأكيد بريدك الإلكتروني في ${siteName}`}</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <Heading style={brand.h1}>تأكيد البريد الإلكتروني</Heading>
        <Text style={brand.text}>
          شكراً لتسجيلك في <b>{siteName}</b>. لتفعيل حسابك، يرجى تأكيد بريدك
          الإلكتروني ({recipient}) بالضغط على الزر أدناه.
        </Text>
        <Button style={brand.button} href={confirmationUrl}>
          تأكيد البريد الإلكتروني
        </Button>
        <Text style={brand.footer}>
          إذا لم تقم بإنشاء حساب، يمكنك تجاهل هذه الرسالة بأمان.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
