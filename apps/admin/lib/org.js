import { prisma } from './prisma';

// Phase 1 is single-tenant: there should only ever be one Organization row
// (Friendly Party Rental). This finds it, or creates it on first run, so we
// never need a signup / org-management flow right now.
export async function getDefaultOrganization() {
    let org = await prisma.organization.findFirst();
    if (!org) {
          org = await prisma.organization.create({
                  data: { name: 'Friendly Party Rental' },
          });
    }
    return org;
}
