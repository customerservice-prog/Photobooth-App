import {handleAdminLogin} from '../../../../lib/admin-login.mjs';
export const runtime='nodejs',dynamic='force-dynamic';
export async function POST(request){
 return handleAdminLogin(request);
}
