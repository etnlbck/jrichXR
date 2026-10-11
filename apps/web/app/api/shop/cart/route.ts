import { NextResponse } from 'next/server';
import { createCart, isShopifyConfigured } from '@/lib/shopify';

export async function POST(request: Request) {
  if (!isShopifyConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Shopify not configured' },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      merchandiseId?: string;
      quantity?: number;
    };

    const merchandiseId = String(body.merchandiseId ?? '');
    const quantity =
      Number(body.quantity) > 0 ? Math.floor(Number(body.quantity)) : 1;

    if (!merchandiseId) {
      return NextResponse.json(
        { success: false, error: 'merchandiseId is required' },
        { status: 400 }
      );
    }

    const cart = await createCart([{ merchandiseId, quantity }]);

    return NextResponse.json({
      success: true,
      checkoutUrl: cart.checkoutUrl,
      cartId: cart.id,
    });
  } catch (error) {
    console.error('Error creating cart:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create cart',
      },
      { status: 500 }
    );
  }
}
