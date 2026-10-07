import BoothLauncher from '../components/BoothLauncher';
// Existing Home Screen installations keep this historical URL and identity.
// Never seed a wedding, overwrite a saved event, or lose the selected demo scope.
export const dynamic='force-dynamic';
export const revalidate=0;
export default function LegacyHomeScreenLauncher(){return <BoothLauncher/>;}
