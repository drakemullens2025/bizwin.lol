import { NextResponse } from 'next/server';
import { CJClient } from '@/lib/cj-client';

export async function GET() {
  try {
    const categories = await CJClient.getCategories();
    return NextResponse.json({ categories });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('CJ categories error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
