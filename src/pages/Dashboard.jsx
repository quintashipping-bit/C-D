import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useEffect, useState } from 'react';

export default function Dashboard(){
  const [customers, setCustomers] = useState(0);
  useEffect(()=>{
    getDocs(collection(db,'customers')).then(s=>setCustomers(s.size));
  },[]);
  return <div className="p-8 text-white bg-zinc-950 min-h-screen">Customers: {customers}</div>
}
