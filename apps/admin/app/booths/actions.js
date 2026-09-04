'use server';

import { prisma } from '../../lib/prisma';
import { getDefaultOrganization } from '../../lib/org';
import { redirect } from 'next/navigation';

// Creates a new Booth from the "Add Booth" form. Kept simple for Phase 1:
// booths start OFFLINE until a device actually checks in with a heartbeat.
export async function createBooth(formData) {
    const org = await getDefaultOrganization();

  const name = formData.get('name')?.toString().trim();
    const printerAdapter = formData.get('printerAdapter')?.toString().trim() || 'canon_selphy';

  if (!name) {
        throw new Error('Missing required fields');
  }

  await prisma.booth.create({
        data: {
                organizationId: org.id,
                name,
                printerAdapter,
        },
  });

  redirect('/booths');
}
