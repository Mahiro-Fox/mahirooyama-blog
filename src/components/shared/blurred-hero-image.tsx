import { AspectRatio } from '@/components/shadcn-ui/aspect-ratio';
import {
  imageSizes,
  OptimizedImage,
} from '@/components/shared/optimized-image';

interface BlurredHeroImageProps {
  imageUrl: string;
  alt: string;
}

export function BlurredHeroImage({ imageUrl, alt }: BlurredHeroImageProps) {
  return (
    <div className="relative w-full overflow-hidden">
      <div className="absolute inset-0 h-full w-full">
        <OptimizedImage
          src={imageUrl || '/placeholder.svg'}
          alt="blurred image"
          fill
          aspectRatio={16 / 9}
          className="scale-105 blur-md brightness-50"
          priority
          aria-hidden="true"
        />
      </div>
      <div className="relative z-10 mx-auto max-w-4xl px-4 md:px-0">
        <AspectRatio ratio={16 / 9} className="overflow-hidden shadow-lg">
          <OptimizedImage
            previewable
            src={imageUrl || '/placeholder.svg'}
            alt={alt}
            fill
            aspectRatio={16 / 9}
            sizes={imageSizes.hero}
            priority
          />
        </AspectRatio>
      </div>
    </div>
  );
}
