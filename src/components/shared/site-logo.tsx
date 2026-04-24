import { OptimizedImage } from '@/components/shared/optimized-image';

export const SiteLogo = (props: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div {...props}>
      <OptimizedImage
        src="/images/avatar/mahirooyama.webp"
        alt="Logo"
        width={32}
        height={32}
        priority
      />
    </div>
  );
};
