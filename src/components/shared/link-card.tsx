import Image from 'next/image';
import Link from 'next/link';

import { AspectRatio } from '@/components/shadcn-ui/aspect-ratio';

interface LinkCardProps {
  title: string;
  imageUrl: string;
  link: string;
  badgeText?: string;
  description?: string;
  priority?: boolean;
  variant?: 'vertical' | 'horizontal' | 'compact';
}

export function LinkCard({
  title,
  imageUrl,
  link,
  badgeText,
  priority = false,
  variant = 'vertical',
  description,
}: LinkCardProps) {
  const renderVertical = () => (
    <div className="group py-2 transition-colors duration-100 hover:text-blue-400">
      <Link href={link} aria-label={`Read more: ${title}`}>
        <div className="space-y-2">
          <LinkCardImage
            imageUrl={imageUrl}
            title={title}
            priority={priority}
            ratio={16 / 9}
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
          />
          <div>
            <LinkCardContent
              title={title}
              description={description}
              badgeText={badgeText}
            />
          </div>
        </div>
      </Link>
    </div>
  );

  const renderHorizontalDesktop = () => (
    <div className="hidden gap-4 transition-colors duration-100 hover:text-blue-400 md:flex">
      <div className="relative w-[30%]">
        <LinkCardImage
          imageUrl={imageUrl}
          title={title}
          priority={priority}
          ratio={16 / 9}
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
        />
      </div>
      <div className="w-[70%]">
        <LinkCardContent
          title={title}
          description={description}
          badgeText={badgeText}
        />
      </div>
    </div>
  );

  const renderCompactLayout = (
    containerClassName: string,
    imageWidth: string,
    contentWidth: string,
    titleSize: string,
    badgeSize: string
  ) => (
    <div className={containerClassName}>
      <div className={`relative ${imageWidth}`}>
        <LinkCardImage
          imageUrl={imageUrl}
          title={title}
          priority={priority}
          ratio={1 / 1}
          sizes="(min-width: 768px) 20vw, 30vw"
        />
      </div>
      <div className={contentWidth}>
        <LinkCardContent
          title={title}
          badgeText={badgeText}
          titleClassName={titleSize}
          badgeClassName={`text-muted-foreground ${badgeSize}`}
        />
      </div>
    </div>
  );

  const renderHorizontal = () => (
    <div className="group py-2 transition-colors duration-100 hover:text-blue-400">
      <Link href={link} aria-label={`Read more: ${title}`}>
        <div>
          {renderHorizontalDesktop()}
          {renderCompactLayout(
            'flex gap-2 md:hidden',
            'w-1/5',
            'w-4/5',
            'text-[13px]',
            'text-[11px]'
          )}
        </div>
      </Link>
    </div>
  );

  const renderCompact = () => (
    <div className="group px-1 py-0 transition-colors duration-100 hover:text-blue-400">
      <Link href={link} aria-label={`Read more: ${title}`}>
        {renderCompactLayout(
          'flex gap-2',
          'w-1/5',
          'w-4/5',
          'text-[13px]',
          'text-[11px]'
        )}
      </Link>
    </div>
  );

  const variantRenderers = {
    vertical: renderVertical,
    horizontal: renderHorizontal,
    compact: renderCompact,
  };

  return variantRenderers[variant]();
}

interface LinkCardImageProps {
  imageUrl: string;
  title: string;
  priority: boolean;
  ratio: number;
  sizes: string;
  className?: string;
}

function LinkCardImage({
  imageUrl,
  title,
  priority,
  ratio,
  sizes,
  className,
}: LinkCardImageProps) {
  return (
    <AspectRatio ratio={ratio}>
      <Image
        src={imageUrl || '/placeholder.svg'}
        alt={`${title} thumbnail image`}
        loading="eager"
        fill
        className={`rounded-lg object-cover transition-opacity ${className || ''}`}
        sizes={sizes}
        priority={priority}
      />
    </AspectRatio>
  );
}

interface LinkCardContentProps {
  title: string;
  description?: string;
  badgeText?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  badgeClassName?: string;
}

function LinkCardContent({
  title,
  description,
  badgeText,
  titleClassName,
  descriptionClassName,
  badgeClassName,
}: LinkCardContentProps) {
  return (
    <div className="space-y-1">
      <p className={`line-clamp-2 ${titleClassName || 'text-base'}`}>{title}</p>
      {description && (
        <p className={`line-clamp-2 ${descriptionClassName || 'text-xs'}`}>
          {description}
        </p>
      )}
      {badgeText && (
        <p className={`text-muted-foreground ${badgeClassName || 'text-xs'}`}>
          {badgeText}
        </p>
      )}
    </div>
  );
}
