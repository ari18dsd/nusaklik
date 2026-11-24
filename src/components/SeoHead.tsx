import { useEffect } from 'react';

interface SeoHeadProps {
  title: string;
  description?: string;
  jsonLd?: Record<string, unknown> | null;
}

export function SeoHead({ title, description, jsonLd }: SeoHeadProps) {
  useEffect(() => {
    const fullTitle = title.includes('NusaKlik') ? title : `${title} — NusaKlik`;
    document.title = fullTitle;

    if (description) {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', description);
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', description);
    }

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', fullTitle);
  }, [title, description]);

  if (!jsonLd) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
