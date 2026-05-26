import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.robohatch.in';

async function fetchDynamicPaths() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.API_BACKEND_URL;

  if (!apiBase) {
    return { products: [], categories: [] };
  }

  try {
    const [productsRes, categoriesRes] = await Promise.all([
      fetch(`${apiBase}/api/products/all`, { next: { revalidate: 3600 } }),
      fetch(`${apiBase}/api/categories`, { next: { revalidate: 3600 } }),
    ]);

    const productsJson = productsRes.ok ? await productsRes.json() : null;
    const categoriesJson = categoriesRes.ok ? await categoriesRes.json() : null;

    return {
      products: Array.isArray(productsJson?.data)
        ? productsJson.data.map((product: any) => `/product/${product.id}`)
        : [],
      categories: Array.isArray(categoriesJson?.data)
        ? categoriesJson.data.map((category: any) => `/products?category=${category.id}`)
        : [],
    };
  } catch {
    return { products: [], categories: [] };
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products, categories } = await fetchDynamicPaths();

  const staticPages: MetadataRoute.Sitemap = [
    '',
    '/products',
    '/upload-3d-file',
    '/about',
    '/contact',
    '/faq',
    '/shipping',
    '/refund',
    '/privacy',
    '/terms',
    '/cart',
    '/checkout/address',
    '/checkout/payment',
  ].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : 0.7,
  }));

  return [
    ...staticPages,
    ...categories.map((url) => ({
      url: `${siteUrl}${url}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.65,
    })),
    ...products.map((url) => ({
      url: `${siteUrl}${url}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
