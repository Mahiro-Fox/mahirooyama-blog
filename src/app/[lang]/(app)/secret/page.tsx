import { Metadata } from 'next';

// import { SecretClient } from './secret-client';

export const metadata: Metadata = {
  title: 'Secret - mahiro',
  description: '一些不为人知的秘密',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SecretPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-4xl font-bold">Secret</h1>
      </div>
      <p>
        &nbsp;&nbsp;&nbsp;&nbsp;现实中独自一人，妄想在虚拟世界寻求慰藉，但遇见的人，都被我伤害，所有的一切都在离我而去，我抓不住任何东西，留不住想留的人。想要得到对方的爱，但却不知道如何去爱对方，到最后只会给别人带去痛苦，也给自己带去痛苦。每当看见幸福的场景，我的心都会剧痛，真的好羡慕好羡慕好羡慕。为什么为什么为什么为什么我这么自私，真的真的真的好想去死，好想解脱，好想结束这一切，让我去地狱赎罪吧。
        <br />
        <br />
        &nbsp;&nbsp;&nbsp;&nbsp;从始至终都感觉自己的人生好失败，从小到大一直都是一个人在迷雾中寻找方向，所有的苦，所有的痛也只有自己一个人体会，真的好想在某个人的怀里大哭一场。但不知从什么时候开始，我流不出一滴眼泪。犹如史蒂芬金的小说迷雾一样，一个人在迷雾中……好冷，好害怕，好无助，仿佛下一刻就会被隐藏于迷雾中的怪物拖走。
      </p>
    </div>
  );
}
