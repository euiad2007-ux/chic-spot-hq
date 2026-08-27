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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>{`إعادة تعيين كلمة المرور في ${siteName}`}</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <Heading style={brand.h1}>إعادة تعيين كلمة المرور</Heading>
        <Text style={brand.text}>
          وصلنا طلب لإعادة تعيين كلمة المرور لحسابك في <b>{siteName}</b>. اضغط
          الزر أدناه لتعيين كلمة مرور جديدة.
        </Text>
        <Button style={brand.button} href={confirmationUrl}>
          تعيين كلمة مرور جديدة
        </Button>
        <Text style={brand.footer}>
          إذا لم تطلب ذلك، تجاهل هذه الرسالة وستبقى كلمة مرورك كما هي.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
