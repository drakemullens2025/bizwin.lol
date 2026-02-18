import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { CJClient } from '@/lib/cj-client';

// GET /api/intelligence/shipping — check inventory and shipping estimates
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const productId = req.nextUrl.searchParams.get('product_id');
    const cjProductId = req.nextUrl.searchParams.get('cj_product_id');

    if (!productId && !cjProductId) {
      return NextResponse.json(
        { error: 'product_id or cj_product_id query parameter is required' },
        { status: 400 },
      );
    }

    let variantId: string | null = null;
    let resolvedCjProductId = cjProductId;

    // If product_id was given, look up the store_product to get cj_variant_id
    if (productId) {
      const svc = getServiceClient();
      const { data: product } = await svc
        .from('store_products')
        .select('cj_product_id, cj_variant_id')
        .eq('id', productId)
        .single();

      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      variantId = product.cj_variant_id || null;
      resolvedCjProductId = product.cj_product_id;
    }

    // If no variant ID, fetch variants for this product and use the first one
    if (!variantId && resolvedCjProductId) {
      const variants = await CJClient.getVariants(resolvedCjProductId) as Array<{ vid: string }>;
      if (variants && variants.length > 0) {
        variantId = variants[0].vid;
      }
    }

    if (!variantId) {
      return NextResponse.json({
        warehouses: [],
        in_stock: false,
        estimated_days: { us: 0, intl: 0 },
        message: 'Could not resolve a variant ID to check inventory',
      });
    }

    // Check inventory using CJ client
    const inventoryData = await CJClient.checkInventory(variantId);
    const inventoryList = Array.isArray(inventoryData) ? inventoryData : [inventoryData];

    // Parse warehouse info
    const warehouses: string[] = [];
    let inStock = false;

    for (const item of inventoryList as Array<{
      warehouseName?: string;
      warehouseCode?: string;
      stock?: number;
      quantity?: number;
    }>) {
      if (item.warehouseName || item.warehouseCode) {
        warehouses.push(item.warehouseName || item.warehouseCode || 'Unknown');
      }
      if ((item.stock || item.quantity || 0) > 0) {
        inStock = true;
      }
    }

    // Estimate shipping days based on warehouses
    const hasUsWarehouse = warehouses.some(w =>
      w.toLowerCase().includes('us') ||
      w.toLowerCase().includes('america') ||
      w.toLowerCase().includes('la') ||
      w.toLowerCase().includes('nj'),
    );

    const hasCnWarehouse = warehouses.some(w =>
      w.toLowerCase().includes('cn') ||
      w.toLowerCase().includes('china') ||
      w.toLowerCase().includes('shenzhen') ||
      w.toLowerCase().includes('guangzhou') ||
      w.toLowerCase().includes('yiwu'),
    );

    let usDays = 15;
    let intlDays = 25;

    if (hasUsWarehouse) {
      usDays = 5;
      intlDays = 15;
    } else if (hasCnWarehouse) {
      usDays = 12;
      intlDays = 20;
    }

    return NextResponse.json({
      warehouses: [...new Set(warehouses)],
      in_stock: inStock,
      estimated_days: {
        us: usDays,
        intl: intlDays,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/intelligence/shipping:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
