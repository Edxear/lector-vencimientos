const LOOKUP_TIMEOUT_MS = 8000

export async function lookupOpenFoodFacts(ean, { signal } = {}) {
  const timeout = AbortSignal.timeout(LOOKUP_TIMEOUT_MS)
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${ean}.json?fields=product_name,brands,quantity,image_front_small_url,categories`,
      { signal: signal ? AbortSignal.any([signal, timeout]) : timeout },
    )
    if (!res.ok) return null
    const data = await res.json()
    if (data.status !== 1) return null
    const p = data.product
    return {
      ean,
      name: p.product_name || '',
      brand: p.brands || '',
      content: p.quantity || '',
      imageUrl: p.image_front_small_url || '',
      category: (p.categories || '').split(',')[0] || '',
      source: 'openfoodfacts',
    }
  } catch {
    return null
  }
}
