/**
 * Shopify Storefront API client (server-only).
 * Adapted from herondo-glitch headless commerce integration.
 */

import { buildTagSearchQuery, experienceTag } from './shopify-tags';

function resolveStoreDomain(): string {
  return process.env.SHOPIFY_STORE_DOMAIN?.trim() ?? '';
}

function resolveStorefrontToken(): string {
  return process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN?.trim() ?? '';
}

function resolveApiVersion(): string {
  return process.env.SHOPIFY_API_VERSION?.trim() ?? '2024-01';
}

function getShopifyGraphqlUrl(): string {
  const domain = resolveStoreDomain();
  const version = resolveApiVersion();
  return `https://${domain}/api/${version}/graphql.json`;
}

export function isShopifyConfigured(): boolean {
  const token = resolveStorefrontToken();
  if (!resolveStoreDomain() || !token) return false;
  // Admin tokens (shpat_) do not work on the Storefront API
  return !token.startsWith('shpat_');
}

interface ShopifyResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

async function shopifyFetch<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(getShopifyGraphqlUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': resolveStorefrontToken(),
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.statusText}`);
  }

  const json = (await response.json()) as ShopifyResponse<T>;

  if (json.errors?.length) {
    throw new Error(
      `GraphQL errors: ${json.errors.map((e) => e.message).join(', ')}`
    );
  }

  if (!json.data) {
    throw new Error('No data returned from Shopify');
  }

  return json.data;
}

export interface ShopifyProductImage {
  url: string;
  altText: string | null;
}

export interface ShopifyProductVariant {
  id: string;
  title: string;
  priceV2: { amount: string; currencyCode: string };
  availableForSale: boolean;
  quantityAvailable: number | null;
  selectedOptions: Array<{ name: string; value: string }>;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  descriptionHtml?: string;
  priceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
  };
  images: { edges: Array<{ node: ShopifyProductImage }> };
  variants?: { edges: Array<{ node: ShopifyProductVariant }> };
  availableForSale: boolean;
}

const PRODUCT_LIST_FIELDS = `
  id
  title
  handle
  description
  priceRange {
    minVariantPrice { amount currencyCode }
  }
  images(first: 5) {
    edges {
      node { url altText }
    }
  }
  variants(first: 20) {
    edges {
      node {
        id
        title
        priceV2 { amount currencyCode }
        availableForSale
        quantityAvailable
        selectedOptions { name value }
      }
    }
  }
  availableForSale
`;

async function getCollection(handle: string, first = 20) {
  const query = `
    query GetCollection($handle: String!, $first: Int!) {
      collection(handle: $handle) {
        id
        title
        handle
        products(first: $first) {
          edges {
            node { ${PRODUCT_LIST_FIELDS} }
          }
        }
      }
    }
  `;

  return shopifyFetch<{
    collection: {
      products: { edges: Array<{ node: ShopifyProduct }> };
    } | null;
  }>(query, { handle, first });
}

async function searchProducts(searchQuery: string, first = 20) {
  const query = `
    query SearchProducts($query: String!, $first: Int!) {
      products(first: $first, query: $query) {
        edges {
          node { ${PRODUCT_LIST_FIELDS} }
        }
      }
    }
  `;

  return shopifyFetch<{
    products: { edges: Array<{ node: ShopifyProduct }> };
  }>(query, { query: searchQuery, first });
}

export type ExperienceProductsSource = 'collection' | 'search';

export interface ExperienceProductsResult {
  products: ShopifyProduct[];
  source: ExperienceProductsSource;
}

/** Resolve products for an AR experience: collection handle first, then tag search. */
export async function getExperienceProducts(
  experienceSlug: string,
  first = 20
): Promise<ExperienceProductsResult> {
  try {
    const data = await getCollection(experienceSlug, first);
    const edges = data.collection?.products.edges ?? [];
    if (edges.length > 0) {
      return {
        products: edges.map((e) => e.node),
        source: 'collection',
      };
    }
  } catch {
    // Fall through to tag search
  }

  const data = await searchProducts(
    buildTagSearchQuery(experienceTag(experienceSlug)),
    first
  );

  return {
    products: data.products.edges.map((e) => e.node),
    source: 'search',
  };
}

const CART_FIELDS = `
  id
  checkoutUrl
  totalQuantity
`;

export interface CartLineInput {
  merchandiseId: string;
  quantity: number;
}

export interface ShopifyCart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
}

export async function createCart(
  lines: CartLineInput[] = []
): Promise<ShopifyCart> {
  const query = `
    mutation CartCreate($lines: [CartLineInput!]) {
      cartCreate(input: { lines: $lines }) {
        cart { ${CART_FIELDS} }
        userErrors { field message }
      }
    }
  `;

  const data = await shopifyFetch<{
    cartCreate: {
      cart: ShopifyCart | null;
      userErrors: Array<{ field?: string[]; message: string }>;
    };
  }>(query, { lines });

  const result = data.cartCreate;

  if (result.userErrors?.length) {
    throw new Error(result.userErrors[0].message);
  }

  if (!result.cart) {
    throw new Error('Failed to create cart');
  }

  return result.cart;
}
