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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, confirmationUrl }: InviteEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>{`دعوة للانضمام إلى ${siteName}`}</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <Heading style={brand.h1}>تمت دعوتك للانضمام</Heading>
        <Text style={brand.text}>
          تمت دعوتك للانضمام إلى <b>{siteName}</b>. اضغط الزر أدناه لقبول الدعوة
          وإنشاء حسابك.
        </Text>
        <Button style={brand.button} href={confirmationUrl}>
          قبول الدعوة
        </Button>
        <Text style={brand.footer}>
          إذا لم تكن تتوقع هذه الدعوة، يمكنك تجاهل الرسالة.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
