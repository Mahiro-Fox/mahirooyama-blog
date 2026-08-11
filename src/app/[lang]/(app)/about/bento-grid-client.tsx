'use client';

import { m } from 'framer-motion';
import { TextAnimate } from '@/components/magicui/text-animate';
import { OptimizedImage } from '@/components/shared/optimized-image';
import {
  aboutConfig,
  type BadgeContent,
  type BentoCard,
  type MapContent,
  type MarqueeContent,
  type MediaContent,
  type ProfileContent,
  type PursuitContent,
  type SkillsContent,
} from '@/config/about';
import { useT } from '@/i18n/dictionary-provider';
import { BadgeCard } from './_components/badge-card';
import { MapCard } from './_components/map-card';
import { MarqueeCard } from './_components/marquee-card';
import { MediaCard } from './_components/media-card';
import { ProfileCard } from './_components/profile-card';
import { PursuitCard } from './_components/pursuit-card';
import { SkillsCard } from './_components/skills-card';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
};

const renderCard = (card: BentoCard) => {
  switch (card.type) {
    case 'profile':
      return <ProfileCard content={card.content as ProfileContent} />;
    case 'pursuit':
      return <PursuitCard content={card.content as PursuitContent} />;
    case 'marquee':
      return <MarqueeCard content={card.content as MarqueeContent} />;
    case 'skills':
      return (
        <SkillsCard
          content={card.content as SkillsContent}
          title={card.title}
        />
      );
    case 'map':
      return <MapCard content={card.content as MapContent} />;
    case 'badge':
      return (
        <BadgeCard content={card.content as BadgeContent} title={card.title} />
      );
    case 'media':
      return <MediaCard content={card.content as MediaContent} />;
    default:
      return null;
  }
};

export function BentoGridClient() {
  const t = useT();

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="overflow-hidden rounded-full">
        <OptimizedImage
          src={aboutConfig.avatar}
          alt="头像"
          width={128}
          height={128}
        />
      </div>
      <TextAnimate once className="text-3xl font-bold" animation="blurInUp">
        {aboutConfig.name}
      </TextAnimate>
      <TextAnimate once className="text-lg" by="character" animation="blurInUp">
        {t(aboutConfig.bio)}
      </TextAnimate>
      <m.div
        className="grid auto-rows-[180px] grid-cols-1 gap-4 md:grid-cols-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {aboutConfig.cards.map((card) => (
          <m.div key={card.id} className={card.size} variants={itemVariants}>
            {renderCard(card)}
          </m.div>
        ))}
      </m.div>
    </div>
  );
}
