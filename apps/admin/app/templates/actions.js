'use server';

import { prisma } from '../../lib/prisma';
import { getDefaultOrganization } from '../../lib/org';
import { redirect } from 'next/navigation';

// Default canvas dimensions per print format, at 300 DPI.
const FORMAT_DIMENSIONS = {
    '4x6_portrait': { canvasWidth: 1200, canvasHeight: 1800, orientation: 'portrait' },
    '4x6_landscape': { canvasWidth: 1800, canvasHeight: 1200, orientation: 'landscape' },
    '2x6_strip': { canvasWidth: 600, canvasHeight: 1800, orientation: 'portrait' },
};

// Creates a new Template from the "Add Template" form. Kept simple for
// Phase 1: the layout starts with an empty layers array and a canvas sized
// for the chosen print format. The full visual editor can fill it in later.
export async function createTemplate(formData) {
    const org = await getDefaultOrganization();

  const name = formData.get('name')?.toString().trim();
    const category = formData.get('category')?.toString().trim() || 'General Party';
    const format = formData.get('format')?.toString().trim() || '4x6_portrait';

  if (!name) {
        throw new Error('Missing required fields');
  }

  const dims = FORMAT_DIMENSIONS[format] || FORMAT_DIMENSIONS['4x6_portrait'];

  await prisma.template.create({
        data: {
                organizationId: org.id,
                name,
                category,
                format,
                layout: { ...dims, layers: [] },
        },
  });

  redirect('/templates');
}
