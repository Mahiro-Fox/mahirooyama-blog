import { Link } from '@/components/shared/link';
import { OptimizedImage } from '@/components/shared/optimized-image';

interface AuthorProps {
  name: string;
  imageUrl: string;
  twitterId: string;
}

export function Author({ name, imageUrl, twitterId }: AuthorProps) {
  return (
    <Link
      href={`https://x.com/${twitterId}`}
      className="flex items-center gap-3 text-sm"
    >
      <OptimizedImage
        src={imageUrl}
        alt={name}
        width={42}
        height={42}
        className="rounded-full"
        containerClassName="bg-muted rounded-full"
        priority
      />
      <div className="flex-1 text-left leading-tight">
        <p className="font-medium">{name}</p>
        <p className="text-muted-foreground text-xs">@{twitterId}</p>
      </div>
    </Link>
  );
}
