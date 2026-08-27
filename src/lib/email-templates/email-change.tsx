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

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address; `email` may equal the NEW recipient
  // in a secure email_change fanout, so always render oldEmail -> newEmail.
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>{`تأكيد تغيير البريد الإلكتروني في ${siteName}`}</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <Heading style={brand.h1}>تأكيد تغيير البريد الإلكتروني</Heading>
        <Text style={brand.text}>
          طلبت تغيير بريدك الإلكتروني في <b>{siteName}</b> من {oldEmail} إلى{' '}
          {newEmail}. اضغط الزر أدناه لتأكيد التغيير.
        </Text>
        <Button style={brand.button} href={confirmationUrl}>
          تأكيد التغيير
        </Button>
        <Text style={brand.footer}>
          إذا لم تطلب هذا التغيير، يرجى تأمين حسابك فوراً.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
