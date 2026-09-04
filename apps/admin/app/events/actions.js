'use server';

import { prisma } from '../../lib/prisma';
import { getDefaultOrganization } from '../../lib/org';
import { redirect } from 'next/navigation';

// Creates the customer (if needed) and the event from the "New Event" form.
// Kept intentionally simple for Phase 1: booth/template/printing settings
// can be configured afterwards from the event detail page.
export async function createEvent(formData) {
    const org = await getDefaultOrganization();

  const customerName = formData.get('customerName')?.toString().trim();
    const customerEmail = formData.get('customerEmail')?.toString().trim() || null;
    const customerPhone = formData.get('customerPhone')?.toString().trim() || null;

  const eventName = formData.get('eventName')?.toString().trim();
    const eventType = formData.get('eventType')?.toString().trim() || null;
    const date = formData.get('date')?.toString();
    const startTime = formData.get('startTime')?.toString();
    const endTime = formData.get('endTime')?.toString();
    const venueName = formData.get('venueName')?.toString().trim() || null;
    const venueAddress = formData.get('venueAddress')?.toString().trim() || null;
    const internalNotes = formData.get('internalNotes')?.toString().trim() || null;

  if (!customerName || !eventName || !date || !startTime || !endTime) {
        throw new Error('Missing required fields');
  }

  const customer = await prisma.customer.create({
        data: {
                organizationId: org.id,
                name: customerName,
                email: customerEmail,
                phone: customerPhone,
        },
  });

  await prisma.event.create({
        data: {
                organizationId: org.id,
                customerId: customer.id,
                name: eventName,
                eventType,
                date: new Date(date),
                startTime: new Date(`${date}T${startTime}`),
                endTime: new Date(`${date}T${endTime}`),
                venueName,
                venueAddress,
                internalNotes,
        },
  });

  redirect('/events');
}
