'use client'
import {useEffect,useMemo} from 'react'
import {createCarrierWall,createCarrierGusset,type CarrierStyle} from '@/lib/editor/geometry/carrier-construction'
import {CarrierHandle} from './CarrierHandle'
import {StockPanel,type ProductShapeProps} from './StockPanel'

/** Formed paper carrier, not a strength rating or approved assembly drawing.
 * Handle material and fastening are separate production decisions. Here paper
 * handles use glued patches; rope/ribbon use an illustrative punched fixing. */
export function PaperCarrier({dimensions,stock,carrierHandle='twisted_paper'}:ProductShapeProps){
 const l=dimensions.length/100,w=dimensions.width/100,h=dimensions.height/100,b=.002
 const style=carrierHandle as CarrierStyle
 const parts=useMemo(()=>({wall:createCarrierWall(l,w,h,b,style),turn:createCarrierWall(l,w,h,b,style,true),gussets:[-1,1].flatMap(side=>[-1,1].map(front=>({side,front,g:createCarrierGusset(l,w,h,side,front),inner:createCarrierGusset(l,w,h,side,front,true)})))}),[l,w,h,b,style])
 useEffect(()=>()=>{parts.wall.dispose();parts.turn.dispose();parts.gussets.forEach(p=>{p.g.dispose();p.inner.dispose()})},[parts])
 const p={thickness:b,edge:stock.edge}
 return <group name="paper-bag-construction">
  {[-1,1].map(side=>{const face=side===1?'front':'back';return <group key={face} position={[0,0,side*w/2]} rotation={[0,side===1?0:Math.PI,0]}>
   <mesh geometry={parts.wall} material={[stock.face(face),stock.inner(face),stock.edge]} castShadow receiveShadow userData={{faceId:face,insideFaceId:`inside_${face}`}} name={`carrier-wall-${face}`}/>
   <mesh geometry={parts.turn} position={[0,0,-b*2.2]} material={[stock.inside,stock.inside,stock.edge]} castShadow receiveShadow name="turned-paper-top"/>
   <mesh position={[0,h,-b*.8]} rotation={[0,0,Math.PI/2]} material={stock.inside}><cylinderGeometry args={[b*1.2,b*1.2,l,10]}/></mesh>
   {carrierHandle!=='none'&&<group position={[0,0,carrierHandle==='twisted_paper'?-b*4:0]}>
    <CarrierHandle width={l} height={h} style={carrierHandle} stock={stock}/>
    {carrierHandle==='twisted_paper'&&[-1,1].map(x=><StockPanel key={x} {...p} width={l*.13} height={h*.105} outside={stock.inside} inside={stock.inside} position={[x*l*.19,h*.925,-b*1.5]}/>)}
   </group>}
  </group>})}
  {parts.gussets.map(({side,front,g,inner})=>{const face=side===1?'right':'left';return <group key={`${side}-${front}`}>
   <mesh geometry={g} material={stock.face(face)} castShadow receiveShadow userData={{faceId:face}} name="formed-side-gusset"/>
   <mesh geometry={inner} material={stock.inner(face)} receiveShadow userData={{faceId:`inside_${face}`}}/>
  </group>})}
  <StockPanel {...p} width={l} height={w} outside={stock.face('bottom')} inside={stock.inner('bottom')} faceId="bottom" position={[0,b,0]} rotation={[Math.PI/2,0,0]}/>
 </group>
}
