import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { getExperienceProducts, isShopifyConfigured } from '@/lib/shopify';

export async function GET() {
  if (!isShopifyConfigured()) {
    return NextResponse.json(
      {
        success: false,
        configured: false,
        message: 'Shopify not configured',
        products: [],
      },
      { status: 503 }
    );
  }

  try {
    const slug = config.piece.shopifyExperienceSlug;
    const { products, source } = await getExperienceProducts(slug);

    return NextResponse.json({
      success: true,
      configured: true,
      pieceTitle: config.piece.title,
      experienceSlug: slug,
      source,
      products,
    });
  } catch (error) {
    console.error('Error fetching shop products:', error);
    return NextResponse.json(
      {
        success: false,
        configured: true,
        message:
          error instanceof Error ? error.message : 'Failed to fetch products',
        products: [],
      },
      { status: 500 }
    );
  }
}
