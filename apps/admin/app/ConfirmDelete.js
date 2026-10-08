'use client';
export default function ConfirmDelete({name}){
 return <button type="submit" onClick={e=>{if(!window.confirm('Permanently delete "'+name+'"? This cannot be undone and could remove saved event relationships.'))e.preventDefault();}}>Delete this event</button>;
}
