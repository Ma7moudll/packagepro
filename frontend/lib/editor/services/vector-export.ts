"use client"

function toHex(str: string): string {
  let hex = ""
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(2, "0")
  }
  return hex
}

export function generateAI(svg: string, width: number, height: number): string {
  return `%!PS-Adobe-3.0
%%Creator: PackagePro
%%Title: design.ai
%%DocumentData: Clean7Bit
%%LanguageLevel: 2
%%BoundingBox: 0 0 ${Math.ceil(width)} ${Math.ceil(height)}
%%HiResBoundingBox: 0 0 ${width} ${height}
%%EndComments
%%BeginProlog
%%EndProlog
%%BeginSetup
%%EndSetup
%%Page: 1 1
%%PageBoundingBox: 0 0 ${Math.ceil(width)} ${Math.ceil(height)}
%%BeginPageSetup
%%EndPageSetup
%AI5_BeginData
${svg}
%AI5_EndData
%%PageTrailer
%%Trailer
%%EOF`
}

export function generateEPS(svg: string, width: number, height: number): string {
  return `%!PS-Adobe-3.0 EPSF-3.0
%%Creator: PackagePro
%%Title: design.eps
%%BoundingBox: 0 0 ${Math.ceil(width)} ${Math.ceil(height)}
%%HiResBoundingBox: 0 0 ${width} ${height}
%%LanguageLevel: 3
%%EndComments
%%BeginProlog
%%EndProlog
%%Page: 1 1
%%PageBoundingBox: 0 0 ${Math.ceil(width)} ${Math.ceil(height)}
%%EndPageSetup
% Begin embedded SVG data
%%BeginData: ${svg.length} Hex Bytes
${toHex(svg)}
%%EndData
%%PageTrailer
%%Trailer
%%EOF`
}

export function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
