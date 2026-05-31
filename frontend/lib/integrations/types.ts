"use client"

export interface Integration {
  id: string
  name: string
  type: IntegrationType
  provider: IntegrationProvider
  status: "connected" | "disconnected" | "error"
  credentials: IntegrationCredentials
  settings: IntegrationSettings
  lastSync?: string
  createdAt: string
  updatedAt: string
}

export type IntegrationType =
  | "ecommerce"
  | "print-on-demand"
  | "marketing"
  | "crm"
  | "storage"

export type IntegrationProvider =
  | "shopify"
  | "woocommerce"
  | "etsy"
  | "printful"
  | "gooten"
  | "mailchimp"
  | "hubspot"
  | "salesforce"
  | "zoho"
  | "google-drive"
  | "dropbox"

export interface IntegrationCredentials {
  apiKey?: string
  apiSecret?: string
  accessToken?: string
  refreshToken?: string
  storeUrl?: string
  webhookSecret?: string
  [key: string]: any
}

export interface IntegrationSettings {
  autoSync?: boolean
  syncInterval?: number // minutes
  webhookUrl?: string
  syncProducts?: boolean
  syncOrders?: boolean
  syncInventory?: boolean
  defaultCollection?: string
  defaultTags?: string[]
  [key: string]: any
}

export interface ShopifyProduct {
  id: string
  title: string
  handle: string
  description?: string
  vendor?: string
  productType?: string
  tags?: string[]
  variants: ShopifyVariant[]
  images: ShopifyImage[]
  status: "active" | "archived" | "draft"
}

export interface ShopifyVariant {
  id: string
  title: string
  price: string
  sku?: string
  barcode?: string
  inventoryQuantity?: number
  weight?: number
  weightUnit?: string
  option1?: string
  option2?: string
  option3?: string
}

export interface ShopifyImage {
  id: string
  src: string
  alt?: string
  width?: number
  height?: number
}

export interface WooCommerceProduct {
  id: number
  name: string
  slug: string
  permalink: string
  description?: string
  shortDescription?: string
  sku?: string
  price: string
  regularPrice?: string
  salePrice?: string
  stockStatus: "instock" | "outofstock" | "onbackorder"
  stockQuantity?: number
  images: WooCommerceImage[]
  categories: WooCommerceCategory[]
  tags: WooCommerceTag[]
  status: "publish" | "draft" | "pending" | "private"
}

export interface WooCommerceImage {
  id: number
  src: string
  name?: string
  alt?: string
}

export interface WooCommerceCategory {
  id: number
  name: string
  slug: string
}

export interface WooCommerceTag {
  id: number
  name: string
  slug: string
}

export interface EtsyListing {
  listingId: number
  title: string
  description?: string
  price: number
  currencyCode: string
  quantity: number
  tags?: string[]
  materials?: string[]
  images: EtsyImage[]
  state: "active" | "inactive" | "draft"
  shopId: number
}

export interface EtsyImage {
  listingImageId: number
  url: string
  rank: number
}

export interface PrintfulProduct {
  id: number
  name: string
  type: string
  brand?: string
  model?: string
  image?: string
  variantCount?: number
  currency?: string
  files?: PrintfulFile[]
}

export interface PrintfulFile {
  id: number
  type: "default" | "preview" | "back"
  url: string
  width?: number
  height?: number
}

export interface PrintfulOrder {
  id: number
  externalId?: string
  recipient: PrintfulRecipient
  items: PrintfulOrderItem[]
  status: "pending" | "failed" | "canceled" | "inprocess" | "partial" | "fulfilled" | "returned"
  created: string
  updated: string
}

export interface PrintfulRecipient {
  name: string
  address1: string
  address2?: string
  city: string
  stateCode?: string
  countryCode: string
  zip: string
  phone?: string
  email?: string
}

export interface PrintfulOrderItem {
  id: number
  variantId: number
  quantity: number
  files: PrintfulFile[]
}

export interface MailchimpList {
  id: string
  name: string
  memberCount: number
  unsubscribeCount: number
  createdAt: string
}

export interface MailchimpCampaign {
  id: string
  type: "regular" | "plaintext" | "rss" | "absplit" | "automation"
  status: "save" | "paused" | "schedule" | "sending" | "sent"
  createTime: string
  sendTime?: string
  recipients: {
    listId: string
    listName: string
    recipientCount: number
  }
  settings: {
    subjectLine: string
    fromName: string
    replyTo: string
  }
}

export interface HubSpotContact {
  id: string
  properties: {
    email?: string
    firstname?: string
    lastname?: string
    phone?: string
    company?: string
    website?: string
    [key: string]: any
  }
  createdAt: string
  updatedAt: string
}

export interface HubSpotDeal {
  id: string
  properties: {
    dealname?: string
    amount?: string
    dealstage?: string
    pipeline?: string
    closedate?: string
    [key: string]: any
  }
  createdAt: string
  updatedAt: string
}

export interface SyncJob {
  id: string
  integrationId: string
  type: "products" | "orders" | "inventory" | "contacts" | "campaigns"
  status: "pending" | "processing" | "completed" | "failed"
  progress: number
  itemsProcessed: number
  itemsTotal: number
  error?: string
  startedAt?: string
  completedAt?: string
  createdAt: string
}

