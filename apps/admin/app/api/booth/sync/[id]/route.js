import {NextResponse} from 'next/server';
import {prisma} from '../../../../../../../lib/prisma';
import {checkSyncTicket} from '../../../../lib/event-sync-token.mjs';
import {buildBoothHandoffPayload} from '../../../../lib/booth-transfer.mjs';
export const runtime='nodejs',dynamic='force-dynamic';
const boothOrigin='https://photobooth-booth-production.up.railway.app';
const headers={'Access-Control-Allow-Origin':boothOrigin,'Access-Control-Allow-Headers':'Authorization','Access-Control-Allow-Methods':'GET, OPTIONS','Cache-Control':'private, no-store','Vary':'Origin'};
export async function OPTIONS(){return new Response(null,{status:204,headers});}
export async function GET(request,{params}){
 if(request.headers.get('origin')!==boothOrigin)return new Response('Invalid origin',{status:403,headers});
 const token=(request.headers.get('authorization')||'').replace(/^Bearer /,'');
 try{
  if(!checkSyncTicket(token,params.id))return new Response('Unauthorized',{status:401,headers});
  const event=await prisma.event.findUnique({where:{id:params.id}});
  if(!event)return new Response('Not found',{status:404,headers});
  return NextResponse.json(buildBoothHandoffPayload(event),{headers});
 }catch{return new Response('Event sync unavailable',{status:503,headers});}
}