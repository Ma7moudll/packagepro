"use client"
import {StockPanel,type ProductShapeProps} from "./StockPanel"

/** A single label/card/sheet, never a fabricated roll or die-cut toolpath. */
export function FlatProductShape({dimensions,type,stock}:ProductShapeProps){
 const l=dimensions.length/100,h=dimensions.height/100,circle=type.replace(/_/g,"-")==="circle-label"
 if(circle)return <group name="circle-label-preview">
  <mesh material={stock.face("front")} userData={{faceId:"front"}} castShadow><circleGeometry args={[l/2,96]}/></mesh>
  <mesh rotation={[0,Math.PI,0]} position={[0,0,-.002]} material={stock.face("back")} userData={{faceId:"back"}}><circleGeometry args={[l/2,96]}/></mesh>
 </group>
 return <group name="flat-product-preview"><StockPanel width={l} height={h} thickness={.002} outside={stock.face("front")} inside={stock.face("back")} edge={stock.edge} faceId="front" insideFaceId="back"/></group>
}
