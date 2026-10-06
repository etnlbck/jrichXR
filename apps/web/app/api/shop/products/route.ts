import { NextResponse } from 'next/server';
import { DEFAULT_EXPERIENCE_ID } from '@/lib/config';
import { parseExperienceId } from '@/lib/experience-id';
import {
  ExperienceNotFoundError,
  loadExperience,
} from '@/lib/load-experience';
import { getExperienceProducts, isShopifyConfigured } from '@/lib/shopify';

export async function GET(request: Request) {
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

  const raw = new URL(request.url).searchParams.get('id');
  const id = raw ? parseExperienceId(raw) : DEFAULT_EXPERIENCE_ID;
  if (!id) {
    return NextResponse.json(
      { success: false, configured: true, message: 'Invalid experience', products: [] },
      { status: 400 }
    );
  }

  try {
    const { config } = await loadExperience(id);
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
    if (error instanceof ExperienceNotFoundError) {
      return NextResponse.json(
        {
          success: false,
          configured: true,
          message: 'Experience not found',
          products: [],
        },
        { status: 404 }
      );
    }
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
