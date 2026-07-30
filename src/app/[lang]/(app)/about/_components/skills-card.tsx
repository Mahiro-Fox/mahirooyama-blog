'use client';

import { motion } from 'framer-motion';
import { Marquee } from '@/components/shadcn-ui/marquee';
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
      className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 p-6 shadow-lg transition-colors dark:from-gray-900 dark:to-gray-800"
      whileHover={{ scale: 1.02 }}
    >
      {title && (
        <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
          {t(title)}
        </h3>
      )}
      {groups.map((group, index) => (
        <Marquee
          key={index}
          reverse={index % 2 === 1}
          duration={group.length * 3}
        >
          {group.map((skill, index) => (
            <div
              key={`${skill.name}-${index}`}
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl bg-white/80 p-3 transition-all hover:scale-110 hover:rotate-3 dark:bg-gray-800/80"
            >
              <skill.icon className="mb-1.5 h-7 w-7 text-blue-600 dark:text-blue-400" />
              <span className="text-center text-xs font-medium text-gray-700 dark:text-gray-300">
                {t(skill.name)}
              </span>
            </div>
          ))}
        </Marquee>
      ))}
    </motion.div>
  );
}
