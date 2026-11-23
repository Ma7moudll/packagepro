"use client"
import {useEffect,useState} from "react"
import {useParams} from "next/navigation"
import Link from "next/link"
import {useAuth} from "@/providers/auth-provider"
import {ordersApi} from "@/lib/api/orders"
import {Button} from "@/components/ui/button"
import {Card,CardContent,CardHeader,CardTitle} from "@/components/ui/card"
import type {Order} from "@shared/types"

export default function AdminApprovalPage(){
 const {user,isLoading}=useAuth();const {id}=useParams();const orderId=String(id||"")
 const [reason,setReason]=useState(""),[reopenAck,setReopenAck]=useState(false)
 const [order,setOrder]=useState<Order|null>(null),[print,setPrint]=useState(""),[dieline,setDieline]=useState(""),[renew,setRenew]=useState(false),[ack,setAck]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState("")
 async function load(){const r=await ordersApi.getById(orderId);if(r.success)setOrder(r.data)}
 useEffect(()=>{if(user?.role==='ADMIN')load().catch(e=>setMessage(e.message))},[user,orderId])
 if(isLoading)return <p className="p-6">Loading...</p>
 if(user?.role!=='ADMIN')return <p className="p-6">Admin access required.</p>
 const request=order?.currentApprovalRequest;const eligible=order&&['pending_review','awaiting_approval'].includes(order.status)
 async function submit(){if(!print||!dieline||!ack)return;setBusy(true);setMessage("");try{const r=await ordersApi.requestApproval(orderId,{printFileId:print,dielineFileId:dieline==='none'?null:dieline,renew});setMessage(r.message||'Request stored. Check delivery state.');await load();setAck(false)}catch(e){setMessage(e instanceof Error?e.message:'Request failed')}finally{setBusy(false)}}
 async function reopen(){if(!reopenAck||reason.trim().length<10)return;setBusy(true);setMessage("");try{await ordersApi.reopenApproval(orderId,reason);setMessage('Reopened for fresh review. No email sent. Save and attach the intended files before requesting approval.');setPrint("");setDieline("");setRenew(true);setAck(false);setReopenAck(false);await load()}catch(e){setMessage(e instanceof Error?e.message:'Reopen failed')}finally{setBusy(false)}}
 return <div dir="ltr" className="mx-auto max-w-3xl p-4 sm:p-8 space-y-6 text-left">
  <Link href="/admin/orders" className="underline">Back to orders</Link>
  <h1 className="text-2xl font-bold">Approval review: {order?.orderNumber||orderId}</h1>
  <Card><CardHeader><CardTitle>Current request and delivery</CardTitle></CardHeader><CardContent className="space-y-2 break-words">
   <p>Order state: {order?.status||'Loading'}</p><p>Request: {request?.id||'No snapshot-bound request. Legacy links are not accepted.'}</p>
   {request&&<><p>Status: {request.status}. Saved content: {request.current?'matches':'CHANGED'}.</p><p data-testid="approval-delivery-state">Delivery: {request.deliveryState}</p><p>Expires: {request.expiresAt}</p></>}
   <p className="text-sm text-amber-800">Sending or uncertain may mean the customer received the email. Never retry blindly. An explicit renewal invalidates the old link. Not sent means no provider send was recorded. A crash can require a new request.</p>
  </CardContent></Card>
  {order&&['ready_for_routing','awaiting_approval'].includes(order.status)&&<Card><CardHeader><CardTitle>Reopen for fresh review</CardTitle></CardHeader><CardContent className="space-y-4">
   <p>Admin only. Reopening invalidates old approval links and returns the order to pending review. No email is sent. Any existing purchase order, even incomplete, blocks this action.</p>
   <label className="block">Reason<textarea aria-label="Reopen reason" className="block w-full rounded border p-2" value={reason} onChange={e=>setReason(e.target.value)} /></label>
   <label className="flex items-start gap-2"><input type="checkbox" checked={reopenAck} onChange={e=>setReopenAck(e.target.checked)}/>I want to invalidate the current approval and require fresh review.</label>
   <Button className="min-h-11" disabled={busy||!reopenAck||reason.trim().length<10||!!(order as any).purchaseOrders?.length} onClick={reopen}>Reopen for fresh review</Button>
  </CardContent></Card>}
  <Card><CardHeader><CardTitle>Explicit input selection</CardTitle></CardHeader><CardContent className="space-y-4">
   <p className="text-sm">Save the current design and upload or attach its intended print file and dieline first. Legacy or stale associations are refused. No latest-file guess is made. Files listed here are historical records, not certified production output.</p>
   <label className="block">Print file<select aria-label="Print file" className="mt-1 block w-full min-h-11 rounded border p-2" value={print} onChange={e=>setPrint(e.target.value)}><option value="">Choose a print file</option>{order?.design?.files?.filter(f=>f.fileType==='print_file').map(f=><option key={f.id} value={f.id}>{f.fileName} ({f.id})</option>)}</select></label>
   <label className="block">Dieline<select aria-label="Dieline" className="mt-1 block w-full min-h-11 rounded border p-2" value={dieline} onChange={e=>setDieline(e.target.value)}><option value="">Choose a dieline or explicitly none</option><option value="none">No dieline will be sent to the vendor</option>{order?.design?.files?.filter(f=>f.fileType==='dieline').map(f=><option key={f.id} value={f.id}>{f.fileName} ({f.id})</option>)}</select></label>
   <label className="flex gap-2 items-start"><input type="checkbox" checked={renew} onChange={e=>setRenew(e.target.checked)}/><span>Explicit renewal. Replace the previous request, including after reopening, and send a new request. This may send another email.</span></label>
   <label className="flex gap-2 items-start"><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/><span>I checked the saved content, selected files and delivery state. Send this review request to the order's customer.</span></label>
   {!eligible&&<p className="text-amber-800">This order cannot be requested or renewed in its current state. Use explicit admin reopening before any purchase order. Reopening is refused after a purchase order exists.</p>}
   <Button className="min-h-11" disabled={!eligible||!print||!dieline||!ack||busy} onClick={submit}>{busy?'Preparing request...':renew?'Renew approval request':'Request approval'}</Button>
   {message&&<p role="status" className="break-words">{message}</p>}
  </CardContent></Card>
 </div>
}
