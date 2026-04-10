import Image from 'next/image';

export const SiteLogo = (props: React.HTMLAttributes<HTMLImageElement>) => {
  return (
    <Image
      src="/images/avatars/mahirooyama.webp"
      alt="Logo"
      width={42}
      height={42}
      {...props}
    />
  );
};
