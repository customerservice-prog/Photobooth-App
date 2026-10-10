'use client';
import {useEffect,useState} from 'react';
import {safeReturnDestination,readReturnDestination,withReturnTo} from '../lib/staff-navigation.mjs';
export default function BoothContextLink({href,children,...props}){
 const [back,setBack]=useState('/launch');
 useEffect(()=>{setBack(safeReturnDestination(window.location.pathname+window.location.search)||readReturnDestination(window.location.search,localStorage));},[]);
 return <a {...props} href={withReturnTo(href,back)}>{children}</a>;
}
