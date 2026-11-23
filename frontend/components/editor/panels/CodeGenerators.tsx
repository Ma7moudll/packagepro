"use client"

import { useState } from "react"
import { useDesignStore } from "@/lib/editor/state/store"
import { useLanguage } from "@/providers/language-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { QrCode, Barcode, Plus, Loader2 } from "lucide-react"

import {CodeArtworkError, renderQRArtwork, renderBarcodeArtwork} from '@/lib/editor/code-artwork'

export function CodeGenerators() {
  const { language } = useLanguage()
  const addLayer = useDesignStore((s) => s.addLayer)
  const selectedFace = useDesignStore((s) => s.ui.selectedFace)

  const [qrText, setQrText] = useState("")
  const [qrSize, setQrSize] = useState(150)
  const [qrFgColor, setQrFgColor] = useState("#000000")
  const [qrBgColor, setQrBgColor] = useState("#ffffff")

  const [barcodeText, setBarcodeText] = useState("")
  const [barcodeType, setBarcodeType] = useState<"code128" | "ean13" | "upc">("code128")
  const [barcodeWidth, setBarcodeWidth] = useState(200)
  const [barcodeHeight, setBarcodeHeight] = useState(80)

  const [generating, setGenerating] = useState(false)
  const [error,setError]=useState('')
  const errorMessage=(e:unknown)=>{
   if(e instanceof CodeArtworkError){
    const messages={empty:['Enter a value.','أدخل قيمة.'],capacity:['QR content is too long. Shorten it.','محتوى QR طويل جداً. اختصره.'],colour:['Use a darker foreground and a lighter background with stronger contrast.','اختر مقدمة داكنة وخلفية فاتحة بتباين أكبر.'],barcode:['Could not encode this barcode. Check its content.','تعذر ترميز الباركود. تحقق من المحتوى.'],code128:['Code 128 needs 1 to 80 printable ASCII characters.','يحتاج Code 128 إلى ما بين 1 و80 حرفاً من أحرف ASCII القابلة للطباعة.'],ean13_length:['EAN-13 needs exactly 13 digits, including its check digit.','يحتاج EAN-13 إلى 13 رقماً بالضبط، تشمل رقم التحقق.'],upc_length:['UPC-A needs exactly 12 digits, including its check digit.','يحتاج UPC-A إلى 12 رقماً بالضبط، تشمل رقم التحقق.'],ean13_check:['The EAN-13 check digit is incorrect. Check the original number.','رقم التحقق في EAN-13 غير صحيح. راجع الرقم الأصلي.'],upc_check:['The UPC-A check digit is incorrect. Check the original number.','رقم التحقق في UPC-A غير صحيح. راجع الرقم الأصلي.'],size:['This code cannot fit this face without making its modules too small. Shorten the content or use a larger face.','لا يتسع هذا الوجه للكود دون تصغير وحداته أكثر من اللازم. اختصر المحتوى أو اختر وجهاً أكبر.']}
    return messages[e.code][language==='ar'?1:0]
   }
   return language==='ar'?'تعذر إنشاء الكود. لم تتم إضافة طبقة.':'Could not create code. No layer was added.'
  }

  const handleGenerateQR = async () => {
    if (!qrText.trim()) return
    
    setError('')
    setGenerating(true)
    try {
      const image = renderQRArtwork(qrText, qrSize, qrFgColor, qrBgColor)
      const canvas=useDesignStore.getState().canvas
      const scale=Math.min(1,canvas.width*.8/image.width,canvas.height*.8/image.height)
      // Keep at least one logical pixel per module before the 2x PNG export.
      if(image.modulePixels*scale<1)throw new CodeArtworkError('size')
      addLayer({
        scale:{x:scale,y:scale},
        type: "image",
        name: `QR Code: ${qrText.slice(0, 20)}`,
        faceId: selectedFace,
        imageProperties: {
          src: image.src,
          naturalWidth: image.width,
          naturalHeight: image.height,
        },
      })
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateBarcode = async () => {
    if (!barcodeText.trim()) return
    
    setError('')
    setGenerating(true)
    try {
      const image = renderBarcodeArtwork(barcodeText, barcodeType, barcodeWidth, barcodeHeight)
      const canvas=useDesignStore.getState().canvas
      const scale=Math.min(1,canvas.width*.8/image.width,canvas.height*.8/image.height)
      // Keep at least one logical pixel per module before the 2x PNG export.
      if(image.modulePixels*scale<1)throw new CodeArtworkError('size')
      addLayer({
        scale:{x:scale,y:scale},
        type: "image",
        name: `Barcode: ${barcodeText.slice(0, 20)}`,
        faceId: selectedFace,
        imageProperties: {
          src: image.src,
          naturalWidth: image.width,
          naturalHeight: image.height,
        },
      })
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-4" data-code-generators>
      <p className="text-xs text-slate-600">{language==='ar'?'الأكواد القديمة المحفوظة لم يتم إصلاحها. أعد إنشاءها من المحتوى الأصلي واختبرها. حجم الصورة قد يزيد للحفاظ على وحدات كاملة. تحقق من المسح بعد التصدير والطباعة.':'Previously saved codes are not repaired. Recreate them from the original content and test them. Image size may increase to keep whole modules. Verify scanning after export and printing.'}</p>
      <div className="flex items-center gap-2 mb-2">
        <QrCode className="h-4 w-4 text-slate-600" />
        <h3 className="text-sm font-semibold">
          {language === "ar" ? "مولد الأكواد" : "Code Generators"}
        </h3>
      </div>

      <p className="text-xs text-slate-600">{language==='ar'?'المقاس المختار حد أدنى لصورة المصدر، وقد تكون الصورة أكبر. تتم ملاءمتها للوجه فقط إذا بقيت الوحدات واضحة.':'Selected size is a minimum source-image size, so the image may be larger. It is fitted to the face only if its modules remain large enough.'}</p>
      <Tabs defaultValue="qr" className="w-full" onValueChange={()=>setError('')}>
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="qr" className="text-xs">
            <QrCode className="h-3 w-3 mr-1" />
            QR Code
          </TabsTrigger>
          <TabsTrigger value="barcode" className="text-xs">
            <Barcode className="h-3 w-3 mr-1" />
            Barcode
          </TabsTrigger>
        </TabsList>

        <TabsContent value="qr" className="space-y-3 mt-3">
          <div>
            <Label className="text-xs mb-1 block">
              {language === "ar" ? "النص أو الرابط" : "Text or URL"}
            </Label>
            <Input
              placeholder={language === "ar" ? "أدخل النص أو الرابط..." : "Enter text or URL..."}
              aria-label={language==='ar'?'محتوى QR':'QR content'}
              value={qrText}
              onChange={(e) => {setError('');setQrText(e.target.value)}}
              className="text-xs h-8"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs mb-1 block">
                {language === "ar" ? "الحجم" : "Size"}
              </Label>
              <Select
                value={qrSize.toString()}
                onValueChange={(v) => {setError('');setQrSize(parseInt(v))}}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">100px</SelectItem>
                  <SelectItem value="150">150px</SelectItem>
                  <SelectItem value="200">200px</SelectItem>
                  <SelectItem value="300">300px</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">
                {language === "ar" ? "اللون" : "Color"}
              </Label>
              <div className="flex gap-1">
                <input
                  type="color"
                  value={qrFgColor}
                  onChange={(e)=>{setError('');setQrFgColor(e.target.value)}}
                  className="w-8 h-8 rounded cursor-pointer"
                  title={language === "ar" ? "لون المقدمة" : "Foreground"}
                />
                <input
                  type="color"
                  value={qrBgColor}
                  onChange={(e)=>{setError('');setQrBgColor(e.target.value)}}
                  className="w-8 h-8 rounded cursor-pointer"
                  title={language === "ar" ? "لون الخلفية" : "Background"}
                />
              </div>
            </div>
          </div>

          {error&&<p role="alert" className="text-xs text-red-700">{error}</p>}
          <Button
            onClick={handleGenerateQR}
            disabled={!qrText.trim() || generating}
            className="w-full h-8 text-xs"
            size="sm"
          >
            {generating ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Plus className="h-3 w-3 mr-1" />
            )}
            {language === "ar" ? "إضافة QR Code" : "Add QR Code"}
          </Button>
        </TabsContent>

        <TabsContent value="barcode" className="space-y-3 mt-3">
          <div>
            <Label className="text-xs mb-1 block">
              {language === "ar" ? "النص" : "Text/Number"}
            </Label>
            <Input
              placeholder={language === "ar" ? "أدخل الكود..." : "Enter code..."}
              aria-label={language==='ar'?'محتوى الباركود':'Barcode content'}
              value={barcodeText}
              onChange={(e) => {setError('');setBarcodeText(e.target.value)}}
              className="text-xs h-8"
            />
          </div>

          <div>
            <Label className="text-xs mb-1 block">
              {language === "ar" ? "النوع" : "Type"}
            </Label>
            <Select
              value={barcodeType}
              onValueChange={(v: 'code128'|'ean13'|'upc')=>{setError('');setBarcodeType(v)}}
            >
              <SelectTrigger aria-label="Barcode type" className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="code128">Code 128</SelectItem>
                <SelectItem value="ean13">EAN-13</SelectItem>
                <SelectItem value="upc">UPC-A</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs mb-1 block">
                {language === "ar" ? "العرض" : "Width"}
              </Label>
              <Select
                value={barcodeWidth.toString()}
                onValueChange={(v) => {setError('');setBarcodeWidth(parseInt(v))}}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="150">150px</SelectItem>
                  <SelectItem value="200">200px</SelectItem>
                  <SelectItem value="250">250px</SelectItem>
                  <SelectItem value="300">300px</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">
                {language === "ar" ? "الارتفاع" : "Height"}
              </Label>
              <Select
                value={barcodeHeight.toString()}
                onValueChange={(v) => {setError('');setBarcodeHeight(parseInt(v))}}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="60">60px</SelectItem>
                  <SelectItem value="80">80px</SelectItem>
                  <SelectItem value="100">100px</SelectItem>
                  <SelectItem value="120">120px</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error&&<p role="alert" className="text-xs text-red-700">{error}</p>}
          <Button
            onClick={handleGenerateBarcode}
            disabled={!barcodeText.trim() || generating}
            className="w-full h-8 text-xs"
            size="sm"
          >
            {generating ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Plus className="h-3 w-3 mr-1" />
            )}
            {language === "ar" ? "إضافة Barcode" : "Add Barcode"}
          </Button>
        </TabsContent>
      </Tabs>

      <p className="text-[10px] text-slate-400 italic bg-slate-50 p-2 rounded">
        {language === "ar"
          ? "ملاحظة: يمكنك إضافة رابط موقعك أو معلومات المنتج في QR Code."
          : "Tip: Add your website URL or product info to the QR code."}
      </p>
    </div>
  )
}
