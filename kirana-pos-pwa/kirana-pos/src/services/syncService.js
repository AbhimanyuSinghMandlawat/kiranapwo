import { openDB, getSession } from "./db";

const API_BASE = "http://localhost:5000";

export async function queueSync(type, payload){

  const db = await openDB();

  const tx = db.transaction("sync_queue","readwrite");
  const store = tx.objectStore("sync_queue");

  store.add({
    id: crypto.randomUUID(),
    type,
    payload,
    synced:false,
    createdAt:Date.now()
  });

}

export async function syncPending(){

  if(!navigator.onLine) return;

  const db = await openDB();

  const tx = db.transaction("sync_queue","readwrite");
  const store = tx.objectStore("sync_queue");

  const items = await store.getAll();

  for(const item of items){

    if(item.synced) continue;

    try{

      await sendToServer(item);

      item.synced = true;

      store.put(item);

      console.log("sync success:", item.type);

    }catch(e){

      console.error("sync failed:", e);

    }

  }

}

async function sendToServer(item){

  const session = await getSession();

  if(!session || !session.token){
    console.warn("No auth token available for sync");
    return;
  }

  const token = session.token;

  const endpointMap = {
    sale:"/api/sales",
    customer:"/api/customers",
    stock:"/api/stocks",
    coupon:"/api/coupons"
  };

  const endpoint = endpointMap[item.type];

  if(!endpoint) return;

  await fetch(API_BASE + endpoint,{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization": `Bearer ${token}`
    },
    body:JSON.stringify(item.payload)
  });

}