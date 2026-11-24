import { BookOpen, Layers } from 'lucide-react';
import { useState } from 'react';
import { isSafeUrl } from '../utils/format';

interface ProductCover3DProps {
  src?: string | null;
  alt: string;
  title: string;
  isBook?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ProductCover3D({
  src,
  alt,
  title,
  isBook = true,
  size = 'md',
}: ProductCover3DProps) {
  const [imgError, setImgError] = useState(false);
  const validSrc = isSafeUrl(src) && !imgError ? src! : '';

  const sizeClass =
    size === 'sm'
      ? isBook
        ? 'w-16 h-24'
        : 'w-20 h-16'
      : size === 'lg'
        ? isBook
          ? 'w-56 sm:w-64 aspect-[2/3]'
          : 'w-full max-w-[400px] aspect-[4/3]'
        : isBook
          ? 'w-36 sm:w-40 aspect-[2/3]'
          : 'w-full max-w-[240px] aspect-[4/3]';

  if (isBook) {
    return (
      <div className="book-3d-stage flex items-center justify-center py-2 px-3">
        <div className={`book-3d-wrapper ${sizeClass} shrink-0`}>
          <div className="book-3d-spine" aria-hidden="true" />
          <div className="book-3d-pages" aria-hidden="true" />
          <div className="book-3d-cover w-full h-full border border-[#345477]/15 flex items-center justify-center">
            {validSrc ? (
              <img
                src={validSrc}
                alt={alt}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-contain bg-white"
              />
            ) : (
              <div className="w-full h-full bg-[#345477] text-white p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-[#D6B36A]/40 pb-2">
                  <span className="text-[10px] tracking-widest uppercase text-[#D6B36A] font-semibold">
                    NusaKlik
                  </span>
                  <BookOpen className="w-3.5 h-3.5 text-[#D6B36A]" />
                </div>
                <p className="font-display text-sm font-semibold leading-snug line-clamp-4 text-white">
                  {title}
                </p>
                <div className="h-0.5 w-8 bg-[#D6B36A]" />
              </div>
            )}
            <div className="book-3d-sheen" aria-hidden="true" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-2 px-2 w-full">
      <div
        className={`${sizeClass} relative rounded-lg border border-[#345477]/15 bg-white shadow-[0_8px_22px_-8px_rgba(38,54,74,0.16)] overflow-hidden flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-1`}
      >
        {validSrc ? (
          <img
            src={validSrc}
            alt={alt}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-contain bg-white"
          />
        ) : (
          <div className="w-full h-full bg-white border border-[#345477]/10 p-4 flex flex-col items-center justify-center text-center gap-2">
            <Layers className="w-7 h-7 text-[#345477]" />
            <p className="text-xs font-semibold text-[#26364A] line-clamp-2">{title}</p>
          </div>
        )}
      </div>
    </div>
  );
}
