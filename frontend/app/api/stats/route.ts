import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Return mock stats - in production, this would call the backend API
    return NextResponse.json({
      success: true,
      stats: {
        completedDeals: {
          value: "50,000+",
          raw: 50000,
        },
        registeredFactories: {
          value: "1,200+",
          raw: 1200,
        },
        transactionVolume: {
          value: "100+",
          raw: 100000000,
          inMillion: 100,
        },
        activeTraders: {
          value: "15,000+",
          raw: 15000,
        },
        categories: {
          "Plastic Bags": 1250,
          "Cardboard Boxes": 890,
          "Flexible Packaging": 560,
          "Sustainable Materials": 320,
        },
      },
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      stats: {
        completedDeals: { value: "0+", raw: 0 },
        registeredFactories: { value: "0+", raw: 0 },
        transactionVolume: { value: "0+", raw: 0, inMillion: 0 },
        activeTraders: { value: "0+", raw: 0 },
      },
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
