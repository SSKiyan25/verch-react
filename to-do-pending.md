// When an org is updated, approved, or status changes:
revalidateTag("public-stores");

// When a product is published/unpublished (product_count changes):
revalidateTag("public-stores");
