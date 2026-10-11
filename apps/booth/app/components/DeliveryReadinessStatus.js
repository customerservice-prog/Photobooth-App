'use client';
import './delivery-readiness.css';

const sharedRequirements={
 DELIVERY_DATABASE_URL:'Reference the project’s Postgres database URL in the booth service.',
 BOOTH_SESSION_SECRET:'Set a random secret of at least 32 characters.',
 BOOTH_PAIRING_CODE:'Set a separate random iPad authorization code of at least 16 characters.',
 BOOTH_PUBLIC_URL:'Set the booth’s public HTTPS address, without a path or login details.'
};
const channelName=name=>name==='email'?'Email':'SMS';
const stateLabel=channel=>channel.state==='disabled'?'Disabled':channel.configured?'Configured · real test required':'Needs setup';
export default function DeliveryReadinessStatus({config}){
 if(!config?.dependencies)return null;
 return <div className="deliveryReadiness" data-testid="delivery-readiness">
  <div className="deliveryReadinessChannels">{['email','sms'].map(name=>{
   const channel=config[name];
   return <article key={name} data-testid={'delivery-readiness-'+name}>
    <small>{channelName(name)} · {channel.provider}</small><strong>{stateLabel(channel)}</strong>
    <p>{channel.providerConfigured?'Provider settings are present in the expected format.':'Provider settings are missing or invalid.'}</p>
    {name==='email'&&channel.configured&&<p>{channel.receiptsEnabled===false?'Sending-only mode: check your inbox and the attachment. Provider receipt checks are off.':'Provider receipt checks are enabled. Confirm the attachment in your own inbox.'}</p>}
    {name==='sms'&&channel.providerConfigured&&<p>{channel.senderMode==='messaging-service'?'Uses a Messaging Service.':'Uses a sender phone number.'} Sender approval and opt-out handling need owner verification.</p>}
    {channel.missing.length>0&&<p className="deliveryReadinessMissing">Missing or invalid: {channel.missing.map((setting,i)=><span key={setting}>{i>0?', ':''}<code>{setting}</code></span>)}</p>}
   </article>;
  })}</div>
  <p><strong>Storage and iPad authorization:</strong> {config.dependencies.configured?'Settings configured.':'Needs setup.'} {config.paired?'This iPad is authorized for sending.':'Start the event to authorize this iPad, or use the owner code in delivery rehearsal.'}</p>
  <p className="deliveryReadinessNote">This checks configuration only. It does not verify the database connection, provider credentials, domain or sender approval, or real message delivery.</p>
  <details className="deliveryReadinessSetup">
   <summary>Owner setup instructions</summary>
   <div>
    <p>In Railway, open the booth service’s Variables. Add the missing settings there, deploy the change, then refresh this check. Keep provider credentials in Railway.</p>
    {!!config.dependencies.missing.length&&<ul>{config.dependencies.missing.map(name=><li key={name}><code>{name}</code>: {sharedRequirements[name]}</li>)}</ul>}
    <p><strong>Email:</strong> Verify the sending domain in Resend. Set <code>RESEND_API_KEY</code> and <code>BOOTH_EMAIL_FROM</code> to a bare address on that domain, then set <code>BOOTH_EMAIL_ENABLED=true</code>. For a sending-only key, set <code>BOOTH_EMAIL_RECEIPTS_ENABLED=false</code>.</p>
    <p><a href="https://resend.com/docs/dashboard/domains/introduction" target="_blank" rel="noreferrer">Resend domain setup</a></p>
    <p><strong>SMS:</strong> Set <code>TWILIO_ACCOUNT_SID</code> and <code>TWILIO_AUTH_TOKEN</code>, plus an approved <code>TWILIO_MESSAGING_SERVICE_SID</code> (preferred) or <code>TWILIO_FROM_NUMBER</code> with country code. Complete the sender registration and opt-out setup for your traffic. Set <code>BOOTH_SMS_ENABLED=true</code> when ready to test.</p>
    <p><a href="https://www.twilio.com/docs/numbers-and-senders/add-numbers-and-senders" target="_blank" rel="noreferrer">Twilio sender setup</a> · <a href="https://www.twilio.com/docs/usage/tutorials/how-to-use-your-free-trial-account" target="_blank" rel="noreferrer">Twilio trial restrictions</a></p>
    <p>Send one TEST image to your own contact with consent. Confirm its image and download link on the receiving device before offering that channel to guests.</p>
   </div>
  </details>
 </div>;
}
