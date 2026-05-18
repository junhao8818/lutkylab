import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const reviews = await getCollection('reviews');
  const tutorials = await getCollection('tutorials');
  const comparisons = await getCollection('comparisons');
  const guides = await getCollection('guides');

  const allPosts = [...reviews, ...tutorials, ...comparisons, ...guides]
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());

  return rss({
    title: 'LUTkyLab',
    description: 'Real-world reviews, tutorials, and buying guides for DJI Pocket 3 creators.',
    site: context.site ?? 'https://lutkylab.com',
    items: allPosts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/${post.collection}/${post.id}/`,
    })),
    customData: `<language>en-us</language>`,
  });
}
