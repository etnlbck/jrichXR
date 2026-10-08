/** Tag conventions for experience-linked merch discovery (Herondo pattern). */

export function experienceTag(slug: string): string {
  return `experience:${slug}`;
}

/** Quoted tag query for Shopify product search (handles colons in tag values). */
export function buildTagSearchQuery(tag: string): string {
  return `tag:"${tag.replace(/"/g, '\\"')}"`;
}
