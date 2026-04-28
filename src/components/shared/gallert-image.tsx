'use client';

import Image from 'next/image';
import Link from 'next/link';

import { GalleryImageItem } from '@/lib/public-gallery';

const GalleryImage = ({ data }: { data: GalleryImageItem }) => (
  <Link
    href={data.src}
    target="_blank"
    rel="noopener noreferrer"
    className="group relative block overflow-hidden rounded-lg"
  >
    <div className="relative w-full">
      <Image
        src={data.src}
        alt={data.alt}
        width={data.width}
        height={data.height}
        className="w-full transition-transform duration-300 group-hover:scale-105"
        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
      />
    </div>
    {/* <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
      <div className="absolute right-0 bottom-0 left-0 p-4">
        <p className="text-sm text-white">{data.filename}</p>
      </div>
    </div> */}
  </Link>
);

export default GalleryImage;
