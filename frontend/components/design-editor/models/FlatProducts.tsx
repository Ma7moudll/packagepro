"use client"
import {StockPanel,type ProductShapeProps} from "./StockPanel"

/** A single label/card/sheet, never a fabricated roll or die-cut toolpath.
 * Flat-face contract: the sheet is length × height (the product's width
 * axis is its 1mm sheet thickness, not a printable face). StockPanel's
 * outside (+Z) carries the `front` texture and its inside (−Z) carries
 * the `back` texture; the panel geometry flips U on the −Z cap, so back
 * artwork reads correctly when the card is turned over, matching the 2D
 * editor's back-face view. Bounds are exactly the current dimensions,
 * so dimension edits resize the preview 1:1 with the 2D canvas. */
export function FlatProductShape({dimensions,type,stock}:ProductShapeProps){
 const l=dimensions.length/100,h=dimensions.height/100,circle=type.replace(/_/g,"-")==="circle-label"
 if(circle)return <group name="circle-label-preview">
  <mesh material={stock.face("front")} userData={{faceId:"front"}} castShadow><circleGeometry args={[l/2,96]}/></mesh>
  <mesh rotation={[0,Math.PI,0]} position={[0,0,-.002]} material={stock.face("back")} userData={{faceId:"back"}}><circleGeometry args={[l/2,96]}/></mesh>
 </group>
 const businessCard=type.replace(/_/g,"-")==="business-card"
 return <group name={businessCard?"business-card-preview":"flat-product-preview"}><StockPanel width={l} height={h} thickness={.002} outside={stock.face("front")} inside={stock.face("back")} edge={stock.edge} faceId="front" insideFaceId="back"/></group>
}
