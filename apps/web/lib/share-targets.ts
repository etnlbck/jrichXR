import type { ShareTargetId } from '@jrichforms/experience';

export type ShareTarget = {
  id: ShareTargetId;
  label: string;
  href: string;
};

/** Intent URLs for secondary share affordances (no OAuth). */
export function buildShareTargets(
  url: string,
  text: string,
  ids: ShareTargetId[]
): ShareTarget[] {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  const all: Record<ShareTargetId, ShareTarget> = {
    whatsapp: {
      id: 'whatsapp',
      label: 'WhatsApp',
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    },
    x: {
      id: 'x',
      label: 'X',
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    },
    email: {
      id: 'email',
      label: 'Email',
      href: `mailto:?subject=${encodedText}&body=${encodedText}%0A%0A${encodedUrl}`,
    },
  };
  return ids.map((id) => all[id]).filter(Boolean);
}
