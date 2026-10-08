'use client';
import {useEffect} from 'react';
import {workspace} from '../lib/event-workspace.mjs';
import {syncEventPhotos} from '../lib/backup-sync.mjs';
export default function BackupCoordinator(){
 useEffect(()=>{
  const run=()=>{const scope=workspace(location.search);if((scope.managed||scope.imported)&&navigator.onLine)void syncEventPhotos({storage:localStorage,scope:scope.archive,eventId:scope.id});};
  const timer=setInterval(run,30000);
  addEventListener('online',run);
  run();
  return()=>{clearInterval(timer);removeEventListener('online',run);};
 },[]);
 return null;
}