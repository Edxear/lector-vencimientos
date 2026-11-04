export async function lookupOpenFoodFacts(ean) {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${ean}.json?fields=product_name,brands,quantity,image_front_small_url,categories`,
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
