'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { config } from '@/lib/config';
import styles from './shop.module.css';

interface ProductVariant {
  id: string;
  title: string;
  priceV2: { amount: string; currencyCode: string };
  availableForSale: boolean;
  selectedOptions: Array<{ name: string; value: string }>;
}

interface Product {
  id: string;
  title: string;
  handle: string;
  description: string;
  priceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
  };
  images: { edges: Array<{ node: { url: string; altText: string | null } }> };
  variants?: { edges: Array<{ node: ProductVariant }> };
  availableForSale: boolean;
}

type LoadState = 'loading' | 'ready' | 'unavailable' | 'empty';

function formatPrice(amount: string, currency: string) {
  const num = Number.parseFloat(amount);
  if (Number.isNaN(num)) return amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(num);
}

function ProductCard({ product }: { product: Product }) {
  const variants = product.variants?.edges?.map((e) => e.node) ?? [];
  const firstAvailable =
    variants.find((v) => v.availableForSale) ?? variants[0] ?? null;

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    firstAvailable?.id ?? null
  );
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedVariant =
    variants.find((v) => v.id === selectedVariantId) ?? firstAvailable;

  const image = product.images?.edges?.[0]?.node;
  const price =
    selectedVariant?.priceV2?.amount ??
    product.priceRange.minVariantPrice.amount;
  const currency =
    selectedVariant?.priceV2?.currencyCode ??
    product.priceRange.minVariantPrice.currencyCode;

  const available =
    product.availableForSale && (selectedVariant?.availableForSale ?? false);
  const isMultiVariant = variants.length > 1;

  const handleBuy = useCallback(async () => {
    if (!selectedVariantId || !available) return;
    setBuying(true);
    setError(null);
    try {
      const res = await fetch('/api/shop/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchandiseId: selectedVariantId, quantity: 1 }),
      });
      const data = await res.json();
      if (!data.success || !data.checkoutUrl) {
        throw new Error(data.error || 'Checkout unavailable');
      }
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not start checkout'
      );
      setBuying(false);
    }
  }, [selectedVariantId, available]);

  return (
    <article className={styles.card}>
      <div className={styles.imageWrap}>
        {image?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt={image.altText || product.title}
            className={styles.image}
          />
        ) : (
          <div className={styles.imagePlaceholder} aria-hidden />
        )}
      </div>

      <div className={styles.cardBody}>
        <h2 className={styles.productTitle}>{product.title}</h2>

        <p className={styles.price}>{formatPrice(price, currency)}</p>

        {product.description && (
          <p className={styles.description}>{product.description}</p>
        )}

        {isMultiVariant && (
          <div className={styles.variantField}>
            <label htmlFor={`variant-${product.id}`} className={styles.label}>
              Options
            </label>
            <select
              id={`variant-${product.id}`}
              value={selectedVariantId ?? ''}
              onChange={(e) => setSelectedVariantId(e.target.value)}
              className={styles.select}
            >
              {variants.map((variant) => (
                <option
                  key={variant.id}
                  value={variant.id}
                  disabled={!variant.availableForSale}
                >
                  {variant.title}
                  {variant.availableForSale ? '' : ' (Sold out)'}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="button"
          onClick={handleBuy}
          disabled={!available || !selectedVariantId || buying}
          className={styles.buyBtn}
        >
          {buying ? 'Redirecting…' : available ? 'Buy now' : 'Sold out'}
        </button>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <p className={styles.checkoutNote}>Secure checkout powered by Shopify</p>
      </div>
    </article>
  );
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/shop/products');
        const data = await res.json();

        setConfigured(data.configured !== false);

        if (!data.success) {
          setMessage(data.message || 'Shop is unavailable');
          setState('unavailable');
          return;
        }

        if (!data.products?.length) {
          setState('empty');
          return;
        }

        setProducts(data.products);
        setState('ready');
      } catch (err) {
        setMessage(
          err instanceof Error ? err.message : 'Failed to load products'
        );
        setState('unavailable');
      }
    };

    void load();
  }, []);

  const pieceTitle = config.piece.title;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>
          ← Back to AR
        </Link>
        <h1 className={styles.title}>Shop {pieceTitle}</h1>
        <p className={styles.subtitle}>
          Pieces and prints related to this sculpture.
        </p>
      </header>

      {state === 'loading' && (
        <p className={styles.status}>Loading products…</p>
      )}

      {state === 'unavailable' && (
        <div className={styles.emptyState}>
          <h2>Shop unavailable</h2>
          <p>
            {message ||
              (configured
                ? 'We could not load products right now. Please try again later.'
                : 'The store is not configured yet.')}
          </p>
          {!configured && config.piece.acquireUrl && (
            <a
              href={config.piece.acquireUrl}
              className={styles.fallbackLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              Inquire to acquire
            </a>
          )}
        </div>
      )}

      {state === 'empty' && (
        <div className={styles.emptyState}>
          <h2>Nothing listed yet</h2>
          <p>
            Products tagged for this piece will appear here once they are
            published in Shopify.
          </p>
          {config.piece.acquireUrl && (
            <a
              href={config.piece.acquireUrl}
              className={styles.fallbackLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              Inquire to acquire
            </a>
          )}
        </div>
      )}

      {state === 'ready' && (
        <div className={styles.grid}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}
