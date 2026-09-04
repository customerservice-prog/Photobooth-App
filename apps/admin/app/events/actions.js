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

// Updates an existing event's core details from the event edit page.
export async function updateEvent(id, formData) {
      const eventName = formData.get('eventName')?.toString().trim();
      const eventType = formData.get('eventType')?.toString().trim() || null;
      const date = formData.get('date')?.toString();
      const startTime = formData.get('startTime')?.toString();
      const endTime = formData.get('endTime')?.toString();
      const venueName = formData.get('venueName')?.toString().trim() || null;
      const venueAddress = formData.get('venueAddress')?.toString().trim() || null;
      const internalNotes = formData.get('internalNotes')?.toString().trim() || null;

  const customerName = formData.get('customerName')?.toString().trim();
      const customerEmail = formData.get('customerEmail')?.toString().trim() || null;
      const customerPhone = formData.get('customerPhone')?.toString().trim() || null;

  if (!eventName || !date || !startTime || !endTime) {
          throw new Error('Missing required fields');
  }

  const event = await prisma.event.update({
          where: { id },
          data: {
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

  if (event.customerId && customerName) {
          await prisma.customer.update({
                    where: { id: event.customerId },
                    data: {
                                name: customerName,
                                email: customerEmail,
                                phone: customerPhone,
                    },
          });
  }

  redirect(`/events/${id}`);
}

// Permanently deletes an event. In this simple Phase 1 model each customer
// record was created for a single event, so we clean up the customer too
// if it has no other events referencing it.
export async function deleteEvent(id) {
      const event = await prisma.event.findUnique({ where: { id } });
      if (!event) {
              redirect('/events');
      }

  await prisma.event.delete({ where: { id } });

  if (event.customerId) {
          const otherEvents = await prisma.event.count({ where: { customerId: event.customerId } });
          if (otherEvents === 0) {
                    await prisma.customer.delete({ where: { id: event.customerId } }).catch(() => {});
          }
  }

  redirect('/events');
}
