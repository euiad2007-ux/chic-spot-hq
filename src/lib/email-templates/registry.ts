import type { ComponentType } from 'react'
import { template as invoiceTemplate } from './invoice'
import { template as staffInviteTemplate } from './staff-invite'
import { template as bookingReminderTemplate } from './booking-reminder'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  invoice: invoiceTemplate,
  staff_invite: staffInviteTemplate,
  booking_reminder: bookingReminderTemplate,
}
