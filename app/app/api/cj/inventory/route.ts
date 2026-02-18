import { NextRequest, NextResponse } from 'next/server';
import { CJClient } from '@/lib/cj-client';

export async function POST(req: NextRequest) {
  try {
    const { vid, sku } = await req.json();

    if (!vid && !sku) {
      return NextResponse.json({ error: 'vid (variant ID) or sku required' }, { status: 400 });
    }

    const inventory = sku
      ? await CJClient.checkInventoryBySku(sku)
      : await CJClient.checkInventory(vid);

    return NextResponse.json({ inventory });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('CJ inventory error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
