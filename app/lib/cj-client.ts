import { getCachedProduct, cacheProduct } from './supabase';
import * as fs from 'fs';
import * as path from 'path';

const CJ_BASE_URL = 'https://developers.cjdropshipping.com/api2.0/v1';

// --- Token lifecycle management ---
// CJ auth endpoint is rate-limited to 1 call per 300 seconds (5 minutes).
// Tokens must survive Next.js HMR reloads and full server restarts.
// Strategy: globalThis for HMR, file cache for cold restarts.

interface CJTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;  // unix ms
  refreshTokenExpiresAt: number; // unix ms
}

// Persist across HMR reloads (Next.js dev wipes module scope on hot reload)
const globalAny = globalThis as unknown as { __cjTokenCache?: CJTokens; __cjTokenPromise?: Promise<CJTokens> };

// File path for persisting tokens across full server restarts
const TOKEN_FILE = path.join(process.cwd(), '.cj-token.json');

function loadTokenFromFile(): CJTokens | null {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
      if (data.accessToken && data.accessTokenExpiresAt > Date.now()) {
        return data as CJTokens;
      }
    }
  } catch {
    // Corrupted file, ignore
  }
  return null;
}

function saveTokenToFile(tokens: CJTokens) {
  try {
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
  } catch {
    // Non-critical, token still in memory
  }
}

function getTokenCache(): CJTokens | null {
  // Check globalThis first (survives HMR), then file (survives restart)
  if (globalAny.__cjTokenCache) return globalAny.__cjTokenCache;
  const fromFile = loadTokenFromFile();
  if (fromFile) {
    globalAny.__cjTokenCache = fromFile;
    return fromFile;
  }
  return null;
}

function setTokenCache(tokens: CJTokens) {
  globalAny.__cjTokenCache = tokens;
  saveTokenToFile(tokens);
}

async function fetchAccessToken(): Promise<CJTokens> {
  const apiKey = process.env.CJ_API_KEY;
  if (!apiKey) throw new Error('CJ_API_KEY not configured in .env.local');

  const res = await fetch(`${CJ_BASE_URL}/authentication/getAccessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  });

  const json = await res.json();

  // Rate limited — don't throw, just surface a clear message
  if (json.code === 1600200 || res.status === 429) {
    throw new Error(
      'CJ token rate-limited (1 per 5 min). Token will be reused from cache on next request. ' +
      'If this persists, wait 5 minutes and reload.'
    );
  }

  if (!res.ok) {
    throw new Error(`CJ auth failed (${res.status}): ${JSON.stringify(json)}`);
  }

  if (json.code && json.code !== 200) {
    throw new Error(`CJ auth error ${json.code}: ${json.message || 'Unknown'}`);
  }

  const d = json.data;
  const tokens: CJTokens = {
    accessToken: d.accessToken,
    refreshToken: d.refreshToken,
    accessTokenExpiresAt: new Date(d.accessTokenExpiryDate).getTime(),
    refreshTokenExpiresAt: new Date(d.refreshTokenExpiryDate).getTime(),
  };

  setTokenCache(tokens);
  return tokens;
}

async function refreshAccessTokenFn(refreshToken: string): Promise<CJTokens> {
  const res = await fetch(`${CJ_BASE_URL}/authentication/refreshAccessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  const json = await res.json();

  if (json.code === 1600200 || res.status === 429) {
    throw new Error('CJ refresh rate-limited. Using existing token.');
  }

  if (!res.ok) {
    throw new Error(`CJ token refresh failed (${res.status}): ${JSON.stringify(json)}`);
  }

  if (json.code && json.code !== 200) {
    throw new Error(`CJ refresh error ${json.code}: ${json.message || 'Unknown'}`);
  }

  const d = json.data;
  const tokens: CJTokens = {
    accessToken: d.accessToken,
    refreshToken: d.refreshToken,
    accessTokenExpiresAt: new Date(d.accessTokenExpiryDate).getTime(),
    refreshTokenExpiresAt: new Date(d.refreshTokenExpiryDate).getTime(),
  };

  setTokenCache(tokens);
  return tokens;
}

// Refresh 1 hour before expiry
const REFRESH_BUFFER_MS = 60 * 60 * 1000;

async function getValidToken(): Promise<string> {
  const now = Date.now();
  const cached = getTokenCache();

  // Token is still fresh
  if (cached && now < cached.accessTokenExpiresAt - REFRESH_BUFFER_MS) {
    return cached.accessToken;
  }

  // Token expired but refresh token is still good
  if (cached && now < cached.refreshTokenExpiresAt - REFRESH_BUFFER_MS) {
    if (!globalAny.__cjTokenPromise) {
      globalAny.__cjTokenPromise = refreshAccessTokenFn(cached.refreshToken)
        .then(tokens => { globalAny.__cjTokenPromise = undefined; return tokens; })
        .catch(err => {
          globalAny.__cjTokenPromise = undefined;
          // If refresh fails but access token hasn't hard-expired yet, use it anyway
          if (cached && now < cached.accessTokenExpiresAt) return cached;
          throw err;
        });
    }
    const tokens = await globalAny.__cjTokenPromise;
    return tokens.accessToken;
  }

  // No token at all — must fetch fresh
  if (!globalAny.__cjTokenPromise) {
    globalAny.__cjTokenPromise = fetchAccessToken()
      .then(tokens => { globalAny.__cjTokenPromise = undefined; return tokens; })
      .catch(err => { globalAny.__cjTokenPromise = undefined; throw err; });
  }
  const tokens = await globalAny.__cjTokenPromise;
  return tokens.accessToken;
}

// --- Rate limiter: max 25 concurrent requests ---
let requestQueue: Array<() => void> = [];
let activeRequests = 0;
const MAX_CONCURRENT = 25;

function enqueueRequest(): Promise<void> {
  return new Promise((resolve) => {
    if (activeRequests < MAX_CONCURRENT) {
      activeRequests++;
      resolve();
    } else {
      requestQueue.push(() => {
        activeRequests++;
        resolve();
      });
    }
  });
}

function releaseRequest() {
  activeRequests--;
  if (requestQueue.length > 0) {
    const next = requestQueue.shift()!;
    next();
  }
}

function parseResponse(data: Record<string, unknown>) {
  if (data.code && data.code !== 200) {
    throw new Error(`CJ API error code ${data.code}: ${(data.message as string) || 'Unknown error'}`);
  }
  return data;
}

// CJ enforces 1 req/sec. Retry 429s with backoff (up to 3 attempts).
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1100; // just over 1 second

async function cjRequest(
  method: 'GET' | 'POST',
  endpoint: string,
  options?: { params?: Record<string, string | number | undefined>; body?: Record<string, unknown> }
) {
  const token = await getValidToken();

  const url = new URL(`${CJ_BASE_URL}${endpoint}`);
  if (options?.params) {
    for (const [key, val] of Object.entries(options.params)) {
      if (val !== undefined && val !== '') url.searchParams.set(key, String(val));
    }
  }

  const headers: Record<string, string> = { 'CJ-Access-Token': token };
  if (method === 'POST') headers['Content-Type'] = 'application/json';

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    await enqueueRequest();
    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: options?.body ? JSON.stringify(options.body) : undefined,
      });

      // Retry on 429 rate limit
      if (response.status === 429 && attempt < MAX_RETRIES - 1) {
        releaseRequest();
        await new Promise(r => setTimeout(r, RETRY_BASE_MS * (attempt + 1)));
        continue;
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`CJ API error ${response.status}: ${text}`);
      }

      const data = await response.json();

      // CJ sometimes returns 200 HTTP but an error code in the body
      if (data.code === 1600200 && attempt < MAX_RETRIES - 1) {
        releaseRequest();
        await new Promise(r => setTimeout(r, RETRY_BASE_MS * (attempt + 1)));
        continue;
      }

      return parseResponse(data);
    } finally {
      releaseRequest();
    }
  }

  throw new Error('CJ API: max retries exceeded');
}

async function cjGet(endpoint: string, params?: Record<string, string | number | undefined>) {
  return cjRequest('GET', endpoint, { params });
}

async function cjPost(endpoint: string, body?: Record<string, unknown>) {
  return cjRequest('POST', endpoint, { body });
}

// Cached categories (refreshed every 7 days in memory)
let categoriesCache: { data: unknown; fetchedAt: number } | null = null;
const CATEGORIES_TTL = 7 * 24 * 60 * 60 * 1000;

// CJ returns sellPrice as a string, sometimes a range like "2.50 -- 5.00"
// We take the lower bound as the base cost.
function parseSellPrice(price: string | number | null | undefined): number {
  if (typeof price === 'number') return price;
  if (!price) return 0;
  const first = price.split('--')[0].trim();
  return parseFloat(first) || 0;
}

export const CJClient = {
  /**
   * Search products from CJ catalog
   * GET /product/listV2 — params: keyWord, categoryId, page, size, startSellPrice, endSellPrice
   * Response: { data: { content: [{ productList: [...] }], totalRecords, pageNumber, pageSize } }
   * Product fields: id, nameEn, sku, bigImage, sellPrice (string, may be range "2.50 -- 5.00"), categoryId
   * We normalize to a consistent shape for the frontend.
   */
  async searchProducts(params: {
    query?: string;
    categoryId?: string;
    pageNum?: number;
    pageSize?: number;
    minPrice?: number;
    maxPrice?: number;
  }) {
    const { query, categoryId, pageNum = 1, pageSize = 20, minPrice, maxPrice } = params;

    const result = await cjGet('/product/listV2', {
      keyWord: query,
      categoryId,
      page: pageNum,
      size: Math.min(pageSize, 200),
      startSellPrice: minPrice,
      endSellPrice: maxPrice,
    });

    // Flatten the nested content[].productList[] structure
    const content = (result.data as Record<string, unknown>)?.content as Array<{ productList: Array<Record<string, unknown>> }> || [];
    const rawProducts = content.flatMap(group => group.productList || []);

    // Normalize to the shape the frontend expects
    const products = rawProducts.map(p => ({
      pid: p.id as string,
      productNameEn: p.nameEn as string,
      productImage: p.bigImage as string,
      sellPrice: parseSellPrice(p.sellPrice as string),
      categoryName: (p.threeCategoryName || p.twoCategoryName || p.oneCategoryName || '') as string,
      productSku: p.sku as string,
    }));

    return {
      products,
      total: (result.data as Record<string, unknown>)?.totalRecords || 0,
      pageNum,
      pageSize,
    };
  },

  /**
   * Get product details by CJ product ID
   * GET /product/query?pid=xxx
   * Checks Supabase cache first (24hr TTL)
   */
  async getProduct(productId: string) {
    try {
      const cached = await getCachedProduct(productId);
      if (cached) return cached.data;
    } catch {
      // Supabase not configured yet - skip cache
    }

    const result = await cjGet('/product/query', { pid: productId });
    const product = result.data;

    if (product) {
      try {
        await cacheProduct(
          productId,
          product,
          (product as Record<string, unknown>).productImage || [],
          (product as Record<string, unknown>).variants || [],
          ((product as Record<string, unknown>).categoryName as string) || ''
        );
      } catch {
        // Supabase not configured yet - skip cache write
      }
    }

    return product;
  },

  /**
   * Get all CJ product categories (3-level hierarchy)
   * GET /product/getCategory
   * Response: array of { categoryFirstId, categoryFirstName, categoryFirstList: [{ categorySecondId, ... }] }
   * We normalize top-level categories to { categoryId, categoryName } for the frontend.
   * Cached in memory for 7 days.
   */
  async getCategories() {
    if (categoriesCache && Date.now() - categoriesCache.fetchedAt < CATEGORIES_TTL) {
      return categoriesCache.data;
    }

    const result = await cjGet('/product/getCategory');
    const raw = (result.data || []) as Array<{
      categoryFirstId: string;
      categoryFirstName: string;
    }>;

    // Normalize to { categoryId, categoryName } for frontend consumption
    const categories = raw.map(c => ({
      categoryId: c.categoryFirstId,
      categoryName: c.categoryFirstName,
    }));

    categoriesCache = { data: categories, fetchedAt: Date.now() };
    return categoriesCache.data;
  },

  /**
   * Get all variants for a product
   * GET /product/variant/query?pid=xxx
   */
  async getVariants(productId: string) {
    const result = await cjGet('/product/variant/query', { pid: productId });
    return result.data || [];
  },

  /**
   * Check real-time inventory by variant ID (NEVER cached)
   * GET /product/stock/queryByVid?vid=xxx
   */
  async checkInventory(vid: string) {
    const result = await cjGet('/product/stock/queryByVid', { vid });
    return result.data || [];
  },

  /**
   * Check inventory by SKU
   * GET /product/stock/queryBySku?sku=xxx
   */
  async checkInventoryBySku(sku: string) {
    const result = await cjGet('/product/stock/queryBySku', { sku });
    return result.data || [];
  },

  /**
   * Create an order with CJ for fulfillment
   * POST /shopping/order/createOrderV2
   */
  async createOrder(orderData: {
    orderNumber: string;
    shippingZip: string;
    shippingCountryCode: string;
    shippingProvince: string;
    shippingCity: string;
    shippingAddress: string;
    shippingCustomerName: string;
    shippingPhone?: string;
    products: Array<{
      vid: string;
      quantity: number;
    }>;
  }) {
    const result = await cjPost('/shopping/order/createOrderV2', orderData);
    return result.data;
  },

  /**
   * Get order status from CJ
   * GET /shopping/order/getOrderDetail?orderId=xxx
   */
  async getOrderStatus(orderId: string) {
    const result = await cjGet('/shopping/order/getOrderDetail', { orderId });
    return result.data;
  },

  /**
   * List orders from CJ
   * GET /shopping/order/list?page=x&size=x
   */
  async listOrders(page = 1, size = 20) {
    const result = await cjGet('/shopping/order/list', { page, size });
    return result.data || [];
  },
};
