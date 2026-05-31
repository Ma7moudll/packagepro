# Integrations System

This directory contains the integrations system for PackagePro.

## Features

### ✅ Shopify Integration
- **Features**:
  - Connect Shopify store
  - Sync products
  - Create products
  - Manage inventory
  - Order management

### ✅ WooCommerce Integration
- **Features**:
  - Connect WooCommerce store
  - Sync products
  - Create products
  - Manage inventory
  - Order management

### ✅ Etsy Integration
- **Features**:
  - Connect Etsy shop
  - Sync listings
  - Create listings
  - Manage inventory

### ✅ Print-on-Demand APIs
- **Printful**:
  - Browse products
  - Create orders
  - Track fulfillment
- **Gooten**:
  - Browse products
  - Create orders
  - Track fulfillment

### ✅ Marketing Tools
- **Mailchimp**:
  - Manage lists
  - Create campaigns
  - Track subscribers
- **HubSpot**:
  - Manage contacts
  - Create deals
  - Track marketing

### ✅ CRM Integration
- **HubSpot**:
  - Contacts management
  - Deals management
  - Pipeline tracking
- **Salesforce**:
  - Contacts management
  - Opportunities management
- **Zoho**:
  - Contacts management
  - Deals management

## Usage

### Connect Integration

```typescript
import { IntegrationService } from "@/lib/integrations/integration-service"

const integrationService = new IntegrationService()

const integration = await integrationService.connectIntegration(
  "shopify",
  {
    storeUrl: "mystore.myshopify.com",
    apiKey: "your-api-key",
    apiSecret: "your-api-secret",
  },
  {
    autoSync: true,
    syncInterval: 60,
    syncProducts: true,
  }
)
```

### Sync Products

```typescript
const job = await integrationService.syncProducts(integrationId)
```

### Get Shopify Products

```typescript
const products = await integrationService.getShopifyProducts(integrationId)
```

### Create Shopify Product

```typescript
const product = await integrationService.createShopifyProduct(integrationId, {
  title: "Custom Box",
  description: "A custom packaging box",
  variants: [
    {
      title: "Default",
      price: "29.99",
      sku: "BOX-001",
    },
  ],
})
```

### Create Printful Order

```typescript
const order = await integrationService.createPrintfulOrder(integrationId, {
  recipient: {
    name: "John Doe",
    address1: "123 Main St",
    city: "New York",
    countryCode: "US",
    zip: "10001",
  },
  items: [
    {
      variantId: 1,
      quantity: 1,
      files: [
        {
          url: "https://example.com/design.pdf",
          type: "default",
        },
      ],
    },
  ],
})
```

### Create Mailchimp Campaign

```typescript
const campaign = await integrationService.createMailchimpCampaign(integrationId, {
  type: "regular",
  recipients: {
    listId: "list-123",
  },
  settings: {
    subjectLine: "New Product Launch",
    fromName: "PackagePro",
    replyTo: "noreply@packagepro.com",
  },
})
```

### Create HubSpot Contact

```typescript
const contact = await integrationService.createHubSpotContact(integrationId, {
  properties: {
    email: "customer@example.com",
    firstname: "John",
    lastname: "Doe",
    phone: "+1234567890",
    company: "Example Corp",
  },
})
```

## API Routes

- `POST /api/integrations/connect` - Connect integration
- `GET /api/integrations` - List integrations
- `GET /api/integrations/[id]` - Get integration
- `PUT /api/integrations/[id]` - Update integration
- `DELETE /api/integrations/[id]` - Disconnect integration
- `POST /api/integrations/[id]/sync/products` - Sync products
- `GET /api/integrations/[id]/shopify/products` - Get Shopify products
- `POST /api/integrations/[id]/shopify/products` - Create Shopify product
- `GET /api/integrations/[id]/woocommerce/products` - Get WooCommerce products
- `POST /api/integrations/[id]/woocommerce/products` - Create WooCommerce product
- `GET /api/integrations/[id]/etsy/listings` - Get Etsy listings
- `POST /api/integrations/[id]/etsy/listings` - Create Etsy listing
- `GET /api/integrations/[id]/printful/products` - Get Printful products
- `POST /api/integrations/[id]/printful/orders` - Create Printful order
- `GET /api/integrations/[id]/mailchimp/lists` - Get Mailchimp lists
- `POST /api/integrations/[id]/mailchimp/campaigns` - Create Mailchimp campaign
- `GET /api/integrations/[id]/hubspot/contacts` - Get HubSpot contacts
- `POST /api/integrations/[id]/hubspot/contacts` - Create HubSpot contact
- `GET /api/integrations/[id]/hubspot/deals` - Get HubSpot deals
- `POST /api/integrations/[id]/hubspot/deals` - Create HubSpot deal
- `GET /api/integrations/sync-jobs/[id]` - Get sync job status

## Store

The integration store (`integration-store.ts`) provides:
- Integration management
- Sync job tracking
- Active sync monitoring

## Notes

- Credentials are stored encrypted in production
- OAuth flows are handled server-side
- Webhooks are supported for real-time updates
- Sync jobs run asynchronously
- All integrations support auto-sync
- Error handling and retry logic included

