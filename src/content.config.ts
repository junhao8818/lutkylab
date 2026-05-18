import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const amazonProductSchema = z.object({
  asin: z.string(),
  title: z.string(),
  ctaText: z.string().default('Check Price on Amazon'),
});

const faqSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

const postSchema = z.object({
  title: z.string().max(60),
  description: z.string().min(140).max(160),
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  heroImage: z.string(),
  heroImageAlt: z.string(),
  category: z.enum(['review', 'tutorial', 'comparison', 'guide']),
  tags: z.array(z.string()),
  author: z.string().default('LUTkyLab'),
  featured: z.boolean().default(false),
  amazonProducts: z.array(amazonProductSchema).optional().default([]),
  faq: z.array(faqSchema).optional().default([]),
  rating: z.number().min(1).max(5).optional(),
});

const reviews = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/reviews' }),
  schema: postSchema,
});

const tutorials = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/tutorials' }),
  schema: postSchema,
});

const comparisons = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/comparisons' }),
  schema: postSchema,
});

const guides = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/guides' }),
  schema: postSchema,
});

const luts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/luts' }),
  schema: postSchema,
});

export const collections = { reviews, tutorials, comparisons, guides, luts };
