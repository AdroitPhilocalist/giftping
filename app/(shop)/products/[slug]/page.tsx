import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Gift, RotateCcw, ShieldCheck, Star, Store, Truck } from "lucide-react";
import { DiaryBand } from "@/components/home/DiaryBand";
import { SectionHeading } from "@/components/home/SectionHeading";
import { PersonalizationPreviewProvider } from "@/components/shop/PersonalizationPreview";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { ProductBuyBox } from "@/components/shop/ProductBuyBox";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { ProductTabs } from "@/components/shop/ProductTabs";
import { EditReviewButton } from "@/components/shop/ReviewDialogs";
import { ReviewList } from "@/components/shop/ReviewList";
import { VendorLogo } from "@/components/shop/VendorLogo";
import { WishlistButton } from "@/components/shop/WishlistButton";
import { Badge } from "@/components/ui/Badge";
import { getProductBySlug, getRelatedProducts } from "@/lib/db/products";
import { getActiveProductAttributes, getActiveProductTypes } from "@/lib/db/product-types";
import { getMyReviewForProduct, getProductReviews } from "@/lib/db/reviews";
import { getServerUser } from "@/lib/auth/session";
import { getWishlistProductIds } from "@/lib/db/wishlists";
import { getCommerceSettings } from "@/lib/commerce/settings";
import { getReturnWindowDays } from "@/lib/commerce/returns";
import { resolveProductSpecifications } from "@/lib/catalog/product-attributes";
import { labelForTag } from "@/lib/catalog/tags";
import { formatCurrency } from "@/lib/utils/format";
import { parsePersonalizationOptions } from "@/lib/personalization/engraving";
import { baseOpenGraph } from "@/lib/seo/site";
import { breadcrumbJsonLd, jsonLdScript, productJsonLd } from "@/lib/seo/structured-data";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  // Same fallback convention as every other page type (categories, vendors, fixed pages): a custom meta_title is
  // used exactly as written, but the default is suffixed with the brand — found missing here during a technical
  // SEO audit (11 Oct), product pages were the one template silently shipping a bare, brandless title.
  const title = product.meta_title || `${product.name} — GiftPing`;
  const description = product.meta_description || product.short_description || undefined;
  const path = `/products/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    // the product's own photo when it has one, so a shared link shows the actual gift rather than the generic mall picture
    openGraph: { ...baseOpenGraph(), title, description, url: path, ...(product.thumbnail_url ? { images: [{ url: product.thumbnail_url, alt: product.name }] } : {}) },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // None of these depend on each other — fetch them alongside instead of after.
  const [product, user, productTypes, productAttributes] = await Promise.all([
    getProductBySlug(slug),
    getServerUser(),
    getActiveProductTypes(),
    getActiveProductAttributes(),
  ]);
  if (!product) notFound();

  // Type-specific details (Flavor, Metal, Scent...) already stored for filtering on /shop/... — the same answers
  // are useful to a shopper on the product itself. Cached product-type/attribute lists resolve the labels.
  const specifications = resolveProductSpecifications(product.product_type_id, productTypes, productAttributes, product.attribute_values);

  const [related, { reviews, total: reviewTotal }, ownReview, wishlistIds, settings, returnDays] = await Promise.all([
    getRelatedProducts(product.id, product.category_id),
    getProductReviews(product.id),
    user ? getMyReviewForProduct(product.id, user.id) : Promise.resolve(null),
    user ? getWishlistProductIds(user.id) : Promise.resolve(new Set<string>()),
    getCommerceSettings(),
    getReturnWindowDays(),
  ]);

  // Live engraving: the boutique's own setup for this product (null for most products). Parsed defensively — the stored JSON is vendor-editable.
  const engraving = parsePersonalizationOptions(product.personalization_options);
  const images = product.images.length > 0
    ? [...product.images].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.sort_order - b.sort_order)
    : product.thumbnail_url
      ? [{ url: product.thumbnail_url, alt_text: product.name }]
      : [];

  const breadcrumbItems = [
    { name: "Home", path: "/" },
    ...(product.category ? [{ name: product.category.name, path: `/categories/${product.category.slug}` }] : []),
    { name: product.name, path: `/products/${product.slug}` },
  ];
  const productSchema = productJsonLd(product, { deliveryCharge: settings.deliveryCharge, freeDeliveryThreshold: settings.freeDeliveryThreshold, returnWindowDays: returnDays });
  const breadcrumbSchema = breadcrumbJsonLd(breadcrumbItems);

  const tags = [...product.occasion_tags, ...product.recipient_tags];
  const benefits = [
    { icon: ShieldCheck, title: "Secure payment", text: "Pay safely by UPI, card or netbanking." },
    { icon: RotateCcw, title: returnDays > 0 ? `${returnDays}-day returns` : "Returns", text: returnDays > 0 ? "If it isn't right, tell us within the window." : "See the returns policy." },
    ...(product.is_giftwrap_available ? [{ icon: Gift, title: "Gift wrap", text: "Add wrapping at checkout." }] : []),
    { icon: Store, title: product.is_in_house ? "By GiftPing" : "Sold by a boutique", text: product.is_in_house ? "One of our own Originals." : product.vendor?.business_name ?? "A partner boutique." },
  ];

  const about = (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div>
        {product.description ? (
          <p className="whitespace-pre-line leading-relaxed text-brand-dark/75">{product.description}</p>
        ) : (
          <p className="text-brand-dark/55">{product.short_description ?? "More details are coming soon."}</p>
        )}
        {tags.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {tags.map((tag) => <Badge key={tag} variant="neutral">{labelForTag(tag)}</Badge>)}
          </div>
        ) : null}
      </div>
      <dl className="space-y-3 rounded-card border border-brand-dark/10 bg-brand-surface p-5 text-sm">
        {product.category ? <div className="flex justify-between gap-4"><dt className="text-brand-dark/55">Category</dt><dd className="text-right"><Link href={`/categories/${product.category.slug}`} className="text-brand-dark hover:underline">{product.category.name}</Link></dd></div> : null}
        {product.weight_grams ? <div className="flex justify-between gap-4"><dt className="text-brand-dark/55">Weight</dt><dd>{product.weight_grams} g</dd></div> : null}
        {product.care_instructions ? <div><dt className="text-brand-dark/55">Care</dt><dd className="mt-1 text-brand-dark/80">{product.care_instructions}</dd></div> : null}
        {product.sku ? <div className="flex justify-between gap-4"><dt className="text-brand-dark/55">Code</dt><dd>{product.sku}</dd></div> : null}
      </dl>
    </div>
  );

  const specificationsPanel = specifications.length > 0 ? (
    <div className="max-w-3xl">
      <dl className="divide-y divide-brand-dark/10 overflow-hidden rounded-card border border-brand-dark/10 bg-brand-surface px-5 text-sm">
        {specifications.map((specification) => (
          <div key={specification.attributeId} className="flex items-start justify-between gap-6 py-3">
            <dt className="text-brand-dark/55">{specification.label}</dt>
            <dd className="text-right text-brand-dark">{specification.values.join(", ")}</dd>
          </div>
        ))}
      </dl>
    </div>
  ) : null;

  const delivery = (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-card border border-brand-dark/10 bg-brand-surface p-6">
        <h3 className="flex items-center gap-2 font-heading text-lg text-brand-dark"><Truck className="h-5 w-5 text-brand-secondary" aria-hidden="true" /> Delivery</h3>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-brand-dark/70">
          <li>Delivery is {formatCurrency(settings.deliveryCharge)} per boutique, and free once that boutique&apos;s items come to {formatCurrency(settings.freeDeliveryThreshold)} or more.</li>
          <li>Each boutique ships its own items, so an order from more than one may arrive in separate parcels.</li>
          <li>Enter your pincode above to see whether we deliver to you and roughly how long it takes.</li>
        </ul>
      </div>
      <div className="rounded-card border border-brand-dark/10 bg-brand-surface p-6">
        <h3 className="flex items-center gap-2 font-heading text-lg text-brand-dark"><RotateCcw className="h-5 w-5 text-brand-secondary" aria-hidden="true" /> Returns &amp; refunds</h3>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-brand-dark/70">
          <li>{returnDays > 0 ? `You can ask for a return within ${returnDays} days of delivery, from your order page.` : "Returns are handled case by case — contact us from your order page."}</li>
          <li>Refunds go back to the way you paid, and only for what you paid for that item.</li>
          {product.is_giftwrap_available ? <li>Gift wrap ({formatCurrency(settings.giftWrapCharge)}) can be added at checkout.</li> : null}
        </ul>
      </div>
    </div>
  );

  // The list below shows the first page of reviews. Keep the edit action reachable even when the
  // viewer's own review is older than that page; when it is visible, the action sits on the card instead.
  const ownReviewVisible = ownReview ? reviews.some((review) => review.id === ownReview.id) : false;
  const reviewsPanel = (
    <div className="max-w-3xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {product.review_count > 0 ? (
          <p className="flex items-center gap-2 text-brand-dark/70">
            <Star className="h-5 w-5 fill-brand-secondary text-brand-secondary" aria-hidden="true" />
            <span className="font-heading text-2xl text-brand-dark">{product.average_rating.toFixed(1)}</span> from {product.review_count} {product.review_count === 1 ? "review" : "reviews"}
          </p>
        ) : <span />}
        {ownReview && !ownReviewVisible ? (
          <EditReviewButton
            reviewId={ownReview.id}
            productName={product.name}
            rating={ownReview.rating}
            title={ownReview.title}
            body={ownReview.body ?? ""}
          />
        ) : null}
      </div>
      <ReviewList reviews={reviews} total={reviewTotal} productName={product.name} ownReview={ownReview} />
    </div>
  );

  return (
    <div>
      {/* Google rich results (E12): price/rating/stock on the product, and the breadcrumb trail this page already shows — see lib/seo/structured-data.ts. */}
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: jsonLdScript(productSchema) }} />
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbSchema) }} />
      <div className="mx-auto max-w-7xl px-4 pb-4 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-brand-dark/55">
          <Link href="/" className="hover:text-brand-dark hover:underline">Home</Link>
          {product.category ? (
            <>
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
              <Link href={`/categories/${product.category.slug}`} className="hover:text-brand-dark hover:underline">{product.category.name}</Link>
            </>
          ) : null}
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <span className="text-brand-dark" aria-current="page">{product.name}</span>
        </nav>

        <PersonalizationPreviewProvider>
        <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <ProductGallery images={images} productName={product.name} engraving={engraving} />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              {product.is_in_house ? <Badge variant="gold">GiftPing Original</Badge> : null}
              {product.category ? <Badge variant="neutral">{product.category.name}</Badge> : null}
            </div>
            <div className="mt-3 flex items-start justify-between gap-4">
              <h1 className="font-heading text-3xl leading-tight text-brand-dark sm:text-4xl">{product.name}</h1>
              <WishlistButton productId={product.id} initialWishlisted={wishlistIds.has(product.id)} className="static shrink-0 shadow-none" />
            </div>
            {product.short_description ? <p className="mt-2 text-brand-dark/65">{product.short_description}</p> : null}

            {product.review_count > 0 ? (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-brand-dark/60">
                <Star className="h-4 w-4 fill-brand-secondary text-brand-secondary" aria-hidden="true" />
                <span className="font-medium text-brand-dark">{product.average_rating.toFixed(1)}</span>
                <span>({product.review_count} {product.review_count === 1 ? "review" : "reviews"})</span>
                {product.total_sold > 0 ? <span>· {product.total_sold} sold</span> : null}
              </p>
            ) : null}

            <div className="mt-6 border-t border-brand-dark/10 pt-6">
              <ProductBuyBox
                engraving={engraving}
                productId={product.id}
                productSlug={product.slug}
                productName={product.name}
                imageUrl={product.thumbnail_url}
                basePrice={product.base_price}
                salePrice={product.sale_price}
                stockQuantity={product.stock_quantity}
                variants={product.variants}
              />
            </div>

            {product.vendor ? (
              <Link href={`/vendors/${product.vendor.slug}`} className="group mt-6 flex items-center gap-4 rounded-card border border-brand-dark/10 bg-brand-surface p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card">
                <VendorLogo url={product.vendor.logo_url} name={product.vendor.business_name} sizeClass="h-12 w-12" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-brand-dark/50">Sold by</p>
                  <p className="font-heading text-base text-brand-dark">{product.vendor.business_name}</p>
                  {product.vendor.short_description ? <p className="truncate text-xs text-brand-dark/60">{product.vendor.short_description}</p> : null}
                </div>
                {product.vendor.review_count > 0 ? (
                  <Badge variant="gold" className="shrink-0 gap-1"><Star className="h-3 w-3 fill-current" />{product.vendor.average_rating.toFixed(1)}</Badge>
                ) : null}
                <ChevronRight className="h-4 w-4 shrink-0 text-brand-dark/40 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </div>
        </PersonalizationPreviewProvider>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <ul className="grid grid-cols-2 gap-4 rounded-card border border-brand-dark/10 bg-brand-surface p-5 lg:grid-cols-4">
          {benefits.map((b) => (
            <li key={b.title} className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-accent text-brand-secondary-dark"><b.icon className="h-5 w-5" aria-hidden="true" /></span>
              <span className="min-w-0"><span className="block text-sm font-medium text-brand-dark">{b.title}</span><span className="block text-xs leading-snug text-brand-dark/60">{b.text}</span></span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ProductTabs about={about} specifications={specificationsPanel} delivery={delivery} reviews={reviewsPanel} reviewCount={reviewTotal} />
      </div>

      {related.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Keep browsing" title="You may also like" />
          <ProductGrid className="mt-8 lg:grid-cols-4">
            {related.map((item) => <ProductCard key={item.id} product={item} isWishlisted={wishlistIds.has(item.id)} />)}
          </ProductGrid>
        </section>
      ) : null}

      <DiaryBand />
    </div>
  );
}
