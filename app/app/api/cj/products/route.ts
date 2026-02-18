import { NextRequest, NextResponse } from 'next/server';
import { CJClient } from '@/lib/cj-client';
import { logProductEvent } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const categoryId = searchParams.get('category') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const result = await CJClient.searchProducts({
      query: query || undefined,
      categoryId,
      pageNum: page,
      pageSize,
    });

    // Log search event for intelligence (non-blocking)
    const userId = req.headers.get('x-user-id');
    if (userId && query) {
      logProductEvent(userId, 'search', { search_query: query }).catch(() => {});
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('CJ products error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { productId } = await req.json();

    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 });
    }

    const product = await CJClient.getProduct(productId);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('CJ product detail error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
