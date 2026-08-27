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

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>{`رابط الدخول إلى ${siteName}`}</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <Heading style={brand.h1}>رابط الدخول</Heading>
        <Text style={brand.text}>
          اضغط الزر أدناه لتسجيل الدخول إلى <b>{siteName}</b> بدون كلمة مرور.
        </Text>
        <Button style={brand.button} href={confirmationUrl}>
          تسجيل الدخول
        </Button>
        <Text style={brand.footer}>
          صلاحية الرابط محدودة. إذا لم تطلب الدخول، تجاهل هذه الرسالة.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
