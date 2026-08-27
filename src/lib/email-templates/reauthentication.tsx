import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'
import { brand } from './brand'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>رمز التحقق الخاص بك</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <Heading style={brand.h1}>رمز التحقق</Heading>
        <Text style={brand.text}>استخدم الرمز التالي لتأكيد هويتك:</Text>
        <Text style={brand.code}>{token}</Text>
        <Text style={brand.footer}>
          صلاحية الرمز قصيرة. إذا لم تطلبه، تجاهل هذه الرسالة.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
