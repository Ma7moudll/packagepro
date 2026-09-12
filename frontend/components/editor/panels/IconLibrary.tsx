"use client"

import { useState, useMemo, useCallback } from "react"
import { useDesignStore } from "@/lib/editor/state/store"
import { useLanguage } from "@/providers/language-provider"
import { ColorPicker } from "@/components/editor/panels/ColorPicker"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Search,
  Package,
  ShoppingBag,
  Coffee,
  Pizza,
  Gift,
  Heart,
  Star,
  Mail,
  Phone,
  MapPin,
  Globe,
  MessageCircle,
  MessageSquare,
  Briefcase,
  Play,
  Tag,
  Truck,
  Clock,
  Calendar,
  CheckCircle,
  AlertCircle,
  Info,
  HelpCircle,
  Settings,
  User,
  Users,
  Home,
  Building,
  Store,
  ShoppingCart,
  CreditCard,
  Wallet,
  Percent,
  Award,
  Medal,
  Trophy,
  Crown,
  Sparkles,
  Zap,
  Flame,
  Leaf,
  Trees,
  Flower2,
  Sun,
  Moon,
  Cloud,
  Droplets,
  Snowflake,
  Wind,
  Music,
  Camera,
  Image,
  Film,
  Mic,
  Headphones,
  Gamepad2,
  Dumbbell,
  Bike,
  Car,
  Plane,
  Ship,
  Train,
  Utensils,
  Wine,
  Beer,
  Apple,
  Banana,
  Cherry,
  Grape,
  Carrot,
  Salad,
  Sandwich,
  Croissant,
  IceCream,
  Cake,
  Cookie,
  Candy,
  Baby,
  Cat,
  Dog,
  Bird,
  Fish,
  Bug,
  Smile,
  Frown,
  Meh,
  Laugh,
  ThumbsUp,
  ThumbsDown,
  HeartHandshake,
  HelpingHand,
  Recycle,
  Leaf as EcoLeaf,
  Lightbulb,
  Key,
  Lock,
  Unlock,
  Shield,
  Eye,
  EyeOff,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Bluetooth,
  Battery,
  BatteryCharging,
  Power,
  Plug,
  type LucideIcon,
} from "lucide-react"

// Icon categories with icons
const ICON_CATEGORIES = [
  {
    id: "packaging",
    name: { en: "Packaging", ar: "تغليف" },
    icons: [
      { name: "Package", icon: Package },
      { name: "ShoppingBag", icon: ShoppingBag },
      { name: "Gift", icon: Gift },
      { name: "Tag", icon: Tag },
      { name: "Truck", icon: Truck },
      { name: "Store", icon: Store },
    ],
  },
  {
    id: "food",
    name: { en: "Food & Drink", ar: "طعام وشراب" },
    icons: [
      { name: "Coffee", icon: Coffee },
      { name: "Pizza", icon: Pizza },
      { name: "Utensils", icon: Utensils },
      { name: "Wine", icon: Wine },
      { name: "Beer", icon: Beer },
      { name: "Apple", icon: Apple },
      { name: "Banana", icon: Banana },
      { name: "Cherry", icon: Cherry },
      { name: "Grape", icon: Grape },
      { name: "Carrot", icon: Carrot },
      { name: "Salad", icon: Salad },
      { name: "Sandwich", icon: Sandwich },
      { name: "Croissant", icon: Croissant },
      { name: "IceCream", icon: IceCream },
      { name: "Cake", icon: Cake },
      { name: "Cookie", icon: Cookie },
      { name: "Candy", icon: Candy },
    ],
  },
  {
    id: "social",
    name: { en: "Social Media", ar: "وسائل التواصل" },
    icons: [
      { name: "Instagram", icon: Camera },
      { name: "Facebook", icon: MessageCircle },
      { name: "Twitter", icon: MessageSquare },
      { name: "Linkedin", icon: Briefcase },
      { name: "Youtube", icon: Play },
      { name: "Globe", icon: Globe },
    ],
  },
  {
    id: "contact",
    name: { en: "Contact", ar: "تواصل" },
    icons: [
      { name: "Mail", icon: Mail },
      { name: "Phone", icon: Phone },
      { name: "MapPin", icon: MapPin },
      { name: "Globe", icon: Globe },
      { name: "User", icon: User },
      { name: "Users", icon: Users },
    ],
  },
  {
    id: "symbols",
    name: { en: "Symbols", ar: "رموز" },
    icons: [
      { name: "Heart", icon: Heart },
      { name: "Star", icon: Star },
      { name: "CheckCircle", icon: CheckCircle },
      { name: "AlertCircle", icon: AlertCircle },
      { name: "Info", icon: Info },
      { name: "HelpCircle", icon: HelpCircle },
      { name: "ThumbsUp", icon: ThumbsUp },
      { name: "ThumbsDown", icon: ThumbsDown },
      { name: "Smile", icon: Smile },
      { name: "Frown", icon: Frown },
    ],
  },
  {
    id: "badges",
    name: { en: "Badges & Awards", ar: "شارات وجوائز" },
    icons: [
      { name: "Award", icon: Award },
      { name: "Medal", icon: Medal },
      { name: "Trophy", icon: Trophy },
      { name: "Crown", icon: Crown },
      { name: "Sparkles", icon: Sparkles },
      { name: "Zap", icon: Zap },
      { name: "Flame", icon: Flame },
    ],
  },
  {
    id: "nature",
    name: { en: "Nature & Eco", ar: "طبيعة وبيئة" },
    icons: [
      { name: "Leaf", icon: Leaf },
      { name: "Trees", icon: Trees },
      { name: "Flower2", icon: Flower2 },
      { name: "Sun", icon: Sun },
      { name: "Moon", icon: Moon },
      { name: "Cloud", icon: Cloud },
      { name: "Droplets", icon: Droplets },
      { name: "Snowflake", icon: Snowflake },
      { name: "Wind", icon: Wind },
      { name: "Recycle", icon: Recycle },
    ],
  },
  {
    id: "shopping",
    name: { en: "Shopping", ar: "تسوق" },
    icons: [
      { name: "ShoppingCart", icon: ShoppingCart },
      { name: "CreditCard", icon: CreditCard },
      { name: "Wallet", icon: Wallet },
      { name: "Percent", icon: Percent },
      { name: "Tag", icon: Tag },
    ],
  },
  {
    id: "time",
    name: { en: "Time", ar: "وقت" },
    icons: [
      { name: "Clock", icon: Clock },
      { name: "Calendar", icon: Calendar },
    ],
  },
]

// Convert SVG to data URL
function iconToDataUrl(
  IconComponent: LucideIcon,
  size: number,
  color: string,
  strokeWidth: number
): string {
  // Create SVG string manually
  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
      ${getIconPath(IconComponent.displayName || "")}
    </svg>
  `
  return `data:image/svg+xml,${encodeURIComponent(svgString)}`
}

// Get path data for icons (simplified - in production use react-dom/server)
function getIconPath(iconName: string): string {
  // Common icon paths - this is a simplified approach
  // In production, you might want to use @iconify/react or render to string
  const paths: Record<string, string> = {
    Package: '<path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" x2="12" y1="22" y2="12"/>',
    Heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    Star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    Mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    Phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    MapPin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    Globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    Instagram: '<rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>',
    Facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
    Twitter: '<path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>',
    CheckCircle: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    Leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
    Recycle: '<path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5"/><path d="M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12"/><path d="m14 16-3 3 3 3"/><path d="M8.293 13.596 7.196 9.5 3.1 10.598"/><path d="m9.344 5.811 1.093-1.892A1.83 1.83 0 0 1 11.985 3a1.784 1.784 0 0 1 1.546.888l3.943 6.843"/><path d="m13.378 9.633 4.096 1.098 1.097-4.096"/>',
    Coffee: '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/>',
    Gift: '<polyline points="20 12 20 22 4 22 4 12"/><rect width="20" height="5" x="2" y="7"/><line x1="12" x2="12" y1="22" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
  }
  return paths[iconName] || '<circle cx="12" cy="12" r="10"/>'
}

export function IconLibrary() {
  const { language } = useLanguage()
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [iconColor, setIconColor] = useState("#000000")
  const [iconSize, setIconSize] = useState(48)
  const [strokeWidth, setStrokeWidth] = useState(2)

  const addLayer = useDesignStore((s) => s.addLayer)
  const selectedFace = useDesignStore((s) => s.ui.selectedFace)

  const filteredIcons = useMemo(() => {
    let icons: { name: string; icon: LucideIcon; category: string }[] = []

    const categories = selectedCategory
      ? ICON_CATEGORIES.filter((c) => c.id === selectedCategory)
      : ICON_CATEGORIES

    for (const category of categories) {
      for (const icon of category.icons) {
        if (search && !icon.name.toLowerCase().includes(search.toLowerCase())) {
          continue
        }
        icons.push({ ...icon, category: category.id })
      }
    }

    return icons
  }, [search, selectedCategory])

  const handleAddIcon = useCallback(
    (IconComponent: LucideIcon, name: string) => {
      // Create an SVG data URL
      const svgSize = iconSize
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
      svg.setAttribute("width", svgSize.toString())
      svg.setAttribute("height", svgSize.toString())
      svg.setAttribute("viewBox", "0 0 24 24")
      svg.setAttribute("fill", "none")
      svg.setAttribute("stroke", iconColor)
      svg.setAttribute("stroke-width", strokeWidth.toString())
      svg.setAttribute("stroke-linecap", "round")
      svg.setAttribute("stroke-linejoin", "round")

      // Create a temporary container to render the icon
      const tempDiv = document.createElement("div")
      tempDiv.style.display = "none"
      document.body.appendChild(tempDiv)

      // Use innerHTML to get SVG content (simplified approach)
      const pathData = getIconPath(name)
      svg.innerHTML = pathData

      const svgString = new XMLSerializer().serializeToString(svg)
      const dataUrl = `data:image/svg+xml,${encodeURIComponent(svgString)}`

      document.body.removeChild(tempDiv)

      addLayer({
        type: "image",
        name: `Icon: ${name}`,
        faceId: selectedFace,
        imageProperties: {
          src: dataUrl,
          naturalWidth: svgSize,
          naturalHeight: svgSize,
        },
        scale: { x: 1, y: 1 },
      })
    },
    [iconColor, iconSize, strokeWidth, addLayer, selectedFace]
  )

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-slate-600" />
          <h3 className="text-sm font-semibold">
            {language === "ar" ? "مكتبة الأيقونات" : "Icon Library"}
          </h3>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder={language === "ar" ? "بحث..." : "Search icons..."}
            className="pl-8 text-xs h-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-1">
          <Button
            variant={selectedCategory === null ? "secondary" : "ghost"}
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={() => setSelectedCategory(null)}
          >
            {language === "ar" ? "الكل" : "All"}
          </Button>
          {ICON_CATEGORIES.slice(0, 5).map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "secondary" : "ghost"}
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => setSelectedCategory(category.id)}
            >
              {language === "ar" ? category.name.ar : category.name.en}
            </Button>
          ))}
        </div>

        {/* Icon customization */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px]">{language === "ar" ? "اللون" : "Color"}</Label>
            <div className="flex gap-1 mt-1">
              <ColorPicker value={iconColor} onChange={setIconColor} size="sm" />
              <Input
                value={iconColor}
                onChange={(e) => setIconColor(e.target.value)}
                className="h-7 text-[10px] font-mono flex-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-[10px]">{language === "ar" ? "الحجم" : "Size"}: {iconSize}px</Label>
            <Slider
              value={[iconSize]}
              onValueChange={([v]) => setIconSize(v)}
              min={24}
              max={128}
              step={8}
              className="mt-2"
            />
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 grid grid-cols-4 gap-2">
          {filteredIcons.map(({ name, icon: Icon }) => (
            <button
              key={name}
              onClick={() => handleAddIcon(Icon, name)}
              className="aspect-square flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all group"
              title={name}
            >
              <Icon
                className="h-6 w-6 text-slate-600 group-hover:text-slate-900 transition-colors"
                style={{ color: iconColor }}
                strokeWidth={strokeWidth}
              />
              <span className="text-[8px] text-slate-400 mt-1 truncate w-full text-center">
                {name}
              </span>
            </button>
          ))}
        </div>
      </ScrollArea>

      <div className="p-3 border-t bg-slate-50">
        <p className="text-[10px] text-slate-500 text-center">
          {filteredIcons.length} {language === "ar" ? "أيقونة" : "icons"}
        </p>
      </div>
    </div>
  )
}
