import {NextResponse} from 'next/server';
import {prisma} from '../../../lib/prisma';
import {getDefaultOrganization} from '../../../lib/org';

export const dynamic='force-dynamic';

export async function GET(request){
  const url=new URL(request.url);
  if(url.searchParams.get('confirm')!=='oct10-demo') return NextResponse.json({ok:false},{status:404});

  const org=await getDefaultOrganization();
  const date=new Date('2026-10-10T00:00:00-04:00');
  const startTime=new Date('2026-10-10T16:00:00-04:00');
  const endTime=new Date('2026-10-10T20:00:00-04:00');

  let customer=await prisma.customer.findFirst({
    where:{organizationId:org.id,name:'October 10 Photo Booth Customer'}
  });
  if(!customer){
    customer=await prisma.customer.create({
      data:{
        organizationId:org.id,
        name:'October 10 Photo Booth Customer',
        notes:'Customer is visiting the office on 10/7/2026 for a photo booth demonstration. Name/email/event address were not provided in the booking conversation; update those fields with the customer before finalizing.'
      }
    });
  }

  const [booth,template]=await Promise.all([
    prisma.booth.findFirst({where:{organizationId:org.id},orderBy:{name:'asc'}}),
    prisma.template.findFirst({where:{organizationId:org.id,archived:false},orderBy:{name:'asc'}})
  ]);

  const existing=await prisma.event.findFirst({
    where:{
      organizationId:org.id,
      name:'October 10 Photo Booth Party',
      date:{gte:new Date('2026-10-10T00:00:00-04:00'),lt:new Date('2026-10-11T00:00:00-04:00')}
    }
  });

  const data={
    organizationId:org.id,
    customerId:customer.id,
    boothId:booth?.id||null,
    templateId:template?.id||null,
    name:'October 10 Photo Booth Party',
    eventType:'party',
    date,startTime,endTime,
    internalNotes:'Demo-ready customer event. Package includes 108 standard physical prints + 108-print add-on = 216 total. Guest flow: 4 poses per session, one physical print per session, digital sharing remains available without consuming print allowance. Customer customization still needed: customer name, email, event address/venue, and preferred party colors.',
    captureMode:'PHOTO',
    countdownSeconds:3,
    numberOfPhotos:4,
    allowRetake:true,
    maxRetakes:1,
    printingEnabled:true,
    maxPrints:216,
    copiesPerPrint:1,
    allowReprint:false,
    autoPrint:false,
    displayPrintButton:true,
    qrSharingEnabled:true,
    emailSharingEnabled:false,
    smsSharingEnabled:false,
    galleryEnabled:true,
    galleryPrivacy:'PRIVATE',
    welcomeMessage:'Welcome! Take 4 fun poses, choose your keepsake, print one copy, and send or save a digital copy.',
    status:booth&&template?'CONFIGURED':'NEEDS_SETUP'
  };

  const event=existing
    ? await prisma.event.update({where:{id:existing.id},data})
    : await prisma.event.create({data});

  return NextResponse.json({
    ok:true,
    eventId:event.id,
    eventName:event.name,
    status:event.status,
    booth:booth?.name||null,
    template:template?.name||null,
    maxPrints:event.maxPrints,
    numberOfPhotos:event.numberOfPhotos
  });
}
