'use client';

import { motion } from 'framer-motion';
import { Marquee } from '@/components/magicui/marquee';
import { SkillsContent } from '@/config/about';
import { useT } from '@/i18n/dictionary-provider';

interface SkillsCardProps {
  content: SkillsContent;
  title?: string;
}

// 分为三组
const splitSkills = (skills: SkillsContent['skills']) => {
  const length = skills.length;
  const firstGroup = skills.slice(0, Math.ceil(length / 3));
  const secondGroup = skills.slice(
    Math.ceil(length / 3),
    Math.ceil((length * 2) / 3)
  );
  const thirdGroup = skills.slice(Math.ceil((length * 2) / 3));
  return [firstGroup, secondGroup, thirdGroup];
};

export function SkillsCard({ content, title }: SkillsCardProps) {
  const t = useT();
  const groups = splitSkills(content.skills || []);
  return (
    <motion.div
      className="bg-card border-border relative flex h-full w-full flex-col justify-between overflow-hidden rounded-2xl border p-6 shadow-lg transition-colors"
      whileHover={{ scale: 1.02 }}
    >
      {title && <h3 className="mb-4 text-xl font-bold">{t(title)}</h3>}
      {groups.map((group, index) => (
        <Marquee
          key={index}
          reverse={index % 2 === 1}
          duration={group.length * 3}
        >
          {group.map((skill, index) => (
            <div
              key={`${skill.name}-${index}`}
              className="bg-surface hover:bg-accent border-border flex cursor-pointer flex-col items-center justify-center rounded-xl border p-3 transition-all hover:scale-110 hover:rotate-3"
            >
              <skill.icon className="mb-1.5 h-7 w-7 text-[var(--primary)]" />
              <span className="text-foreground text-center text-xs font-medium">
                {t(skill.name)}
              </span>
            </div>
          ))}
        </Marquee>
      ))}
    </motion.div>
  );
}
