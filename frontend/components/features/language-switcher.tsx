"use client"

import { Button } from "@/components/ui/button"
import { Globe } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "ar" : "en")
  }

  return (
    <Button variant="ghost" size="sm" onClick={toggleLanguage} className="flex items-center">
      <Globe className="h-4 w-4 mr-2" />
      {language === "en" ? "العربية" : "English"}
    </Button>
  )
}
