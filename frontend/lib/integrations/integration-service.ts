"use client"

import {
  Integration,
  IntegrationProvider,
  IntegrationCredentials,
  IntegrationSettings,
  SyncJob,
  ShopifyProduct,
  WooCommerceProduct,
  EtsyListing,
  PrintfulProduct,
  PrintfulOrder,
  MailchimpList,
  MailchimpCampaign,
  HubSpotContact,
  HubSpotDeal,
} from "./types"

export class IntegrationService {
  /**
   * Connect integration
   */
  async connectIntegration(
    provider: IntegrationProvider,
    credentials: IntegrationCredentials,
    settings?: IntegrationSettings
  ): Promise<Integration> {
    const response = await fetch("/api/integrations/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, credentials, settings }),
    })

    if (!response.ok) {
      throw new Error("Failed to connect integration")
    }

    return response.json()
  }

  /**
   * Get integrations
   */
  async getIntegrations(): Promise<Integration[]> {
    const response = await fetch("/api/integrations")
    if (!response.ok) {
      throw new Error("Failed to fetch integrations")
    }
    return response.json()
  }

  /**
   * Update integration
   */
  async updateIntegration(
    id: string,
    updates: Partial<Integration>
  ): Promise<Integration> {
    const response = await fetch(`/api/integrations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      throw new Error("Failed to update integration")
    }

    return response.json()
  }

  /**
   * Disconnect integration
   */
  async disconnectIntegration(id: string): Promise<void> {
    const response = await fetch(`/api/integrations/${id}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      throw new Error("Failed to disconnect integration")
    }
  }

  /**
   * Sync products (Shopify/WooCommerce/Etsy)
   */
  async syncProducts(integrationId: string): Promise<SyncJob> {
    const response = await fetch(`/api/integrations/${integrationId}/sync/products`, {
      method: "POST",
    })

    if (!response.ok) {
      throw new Error("Failed to sync products")
    }

    return response.json()
  }

  /**
   * Get Shopify products
   */
  async getShopifyProducts(integrationId: string): Promise<ShopifyProduct[]> {
    const response = await fetch(`/api/integrations/${integrationId}/shopify/products`)
    if (!response.ok) {
      throw new Error("Failed to fetch Shopify products")
    }
    return response.json()
  }

  /**
   * Create Shopify product
   */
  async createShopifyProduct(
    integrationId: string,
    product: Partial<ShopifyProduct>
  ): Promise<ShopifyProduct> {
    const response = await fetch(`/api/integrations/${integrationId}/shopify/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    })

    if (!response.ok) {
      throw new Error("Failed to create Shopify product")
    }

    return response.json()
  }

  /**
   * Get WooCommerce products
   */
  async getWooCommerceProducts(integrationId: string): Promise<WooCommerceProduct[]> {
    const response = await fetch(`/api/integrations/${integrationId}/woocommerce/products`)
    if (!response.ok) {
      throw new Error("Failed to fetch WooCommerce products")
    }
    return response.json()
  }

  /**
   * Create WooCommerce product
   */
  async createWooCommerceProduct(
    integrationId: string,
    product: Partial<WooCommerceProduct>
  ): Promise<WooCommerceProduct> {
    const response = await fetch(`/api/integrations/${integrationId}/woocommerce/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    })

    if (!response.ok) {
      throw new Error("Failed to create WooCommerce product")
    }

    return response.json()
  }

  /**
   * Get Etsy listings
   */
  async getEtsyListings(integrationId: string): Promise<EtsyListing[]> {
    const response = await fetch(`/api/integrations/${integrationId}/etsy/listings`)
    if (!response.ok) {
      throw new Error("Failed to fetch Etsy listings")
    }
    return response.json()
  }

  /**
   * Create Etsy listing
   */
  async createEtsyListing(
    integrationId: string,
    listing: Partial<EtsyListing>
  ): Promise<EtsyListing> {
    const response = await fetch(`/api/integrations/${integrationId}/etsy/listings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(listing),
    })

    if (!response.ok) {
      throw new Error("Failed to create Etsy listing")
    }

    return response.json()
  }

  /**
   * Get Printful products
   */
  async getPrintfulProducts(integrationId: string): Promise<PrintfulProduct[]> {
    const response = await fetch(`/api/integrations/${integrationId}/printful/products`)
    if (!response.ok) {
      throw new Error("Failed to fetch Printful products")
    }
    return response.json()
  }

  /**
   * Create Printful order
   */
  async createPrintfulOrder(
    integrationId: string,
    order: Partial<PrintfulOrder>
  ): Promise<PrintfulOrder> {
    const response = await fetch(`/api/integrations/${integrationId}/printful/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    })

    if (!response.ok) {
      throw new Error("Failed to create Printful order")
    }

    return response.json()
  }

  /**
   * Get Mailchimp lists
   */
  async getMailchimpLists(integrationId: string): Promise<MailchimpList[]> {
    const response = await fetch(`/api/integrations/${integrationId}/mailchimp/lists`)
    if (!response.ok) {
      throw new Error("Failed to fetch Mailchimp lists")
    }
    return response.json()
  }

  /**
   * Create Mailchimp campaign
   */
  async createMailchimpCampaign(
    integrationId: string,
    campaign: Partial<MailchimpCampaign>
  ): Promise<MailchimpCampaign> {
    const response = await fetch(`/api/integrations/${integrationId}/mailchimp/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(campaign),
    })

    if (!response.ok) {
      throw new Error("Failed to create Mailchimp campaign")
    }

    return response.json()
  }

  /**
   * Get HubSpot contacts
   */
  async getHubSpotContacts(integrationId: string): Promise<HubSpotContact[]> {
    const response = await fetch(`/api/integrations/${integrationId}/hubspot/contacts`)
    if (!response.ok) {
      throw new Error("Failed to fetch HubSpot contacts")
    }
    return response.json()
  }

  /**
   * Create HubSpot contact
   */
  async createHubSpotContact(
    integrationId: string,
    contact: Partial<HubSpotContact>
  ): Promise<HubSpotContact> {
    const response = await fetch(`/api/integrations/${integrationId}/hubspot/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contact),
    })

    if (!response.ok) {
      throw new Error("Failed to create HubSpot contact")
    }

    return response.json()
  }

  /**
   * Get HubSpot deals
   */
  async getHubSpotDeals(integrationId: string): Promise<HubSpotDeal[]> {
    const response = await fetch(`/api/integrations/${integrationId}/hubspot/deals`)
    if (!response.ok) {
      throw new Error("Failed to fetch HubSpot deals")
    }
    return response.json()
  }

  /**
   * Create HubSpot deal
   */
  async createHubSpotDeal(
    integrationId: string,
    deal: Partial<HubSpotDeal>
  ): Promise<HubSpotDeal> {
    const response = await fetch(`/api/integrations/${integrationId}/hubspot/deals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deal),
    })

    if (!response.ok) {
      throw new Error("Failed to create HubSpot deal")
    }

    return response.json()
  }

  /**
   * Get sync job status
   */
  async getSyncJobStatus(jobId: string): Promise<SyncJob> {
    const response = await fetch(`/api/integrations/sync-jobs/${jobId}`)
    if (!response.ok) {
      throw new Error("Failed to fetch sync job status")
    }
    return response.json()
  }
}

export const integrationService = new IntegrationService()

