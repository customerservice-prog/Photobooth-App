import {PrismaClient} from '@prisma/client';
const prisma=new PrismaClient();
try{
 const org=await prisma.organization.create({data:{id:'smoke-org',name:'Proof-only Booth Studio'}});
 const customer=await prisma.customer.create({data:{id:'smoke-customer',organizationId:org.id,name:'Test Customer',email:'test@example.invalid'}});
 const booth=await prisma.booth.create({data:{id:'smoke-booth',organizationId:org.id,name:'Booth 01',status:'OFFLINE'}});
 const template=await prisma.template.create({data:{id:'smoke-design',organizationId:org.id,name:'Classic Celebration 4×6',category:'Wedding',format:'4x6_portrait',layout:{canvasWidth:1200,canvasHeight:1800,layers:[]}}});
 await prisma.event.create({data:{
  id:'event-smoke-20261010',organizationId:org.id,customerId:customer.id,boothId:booth.id,templateId:template.id,
  name:'October 10 Test Photo Booth Party',eventType:'Party',date:new Date('2026-10-10T12:00:00Z'),startTime:new Date('2026-10-10T20:00:00Z'),
  endTime:new Date('2026-10-11T00:00:00Z'),venueName:null,venueAddress:null,status:'CONFIGURED',
  maxPrints:108,numberOfPhotos:4,theme:{legacySetting:'must survive'}
 }});
 console.log('Seeded a smoke-test event in the temporary PostgreSQL database.');
}finally{await prisma.$disconnect();}
