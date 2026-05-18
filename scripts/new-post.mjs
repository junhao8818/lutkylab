#!/usr/bin/env node
/**
 * Usage: npm run new-post
 * Scaffolds a new MDX file with frontmatter template.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

const today = new Date().toISOString().split('T')[0];

async function main() {
  console.log('\n🎬 Pocket3Lab — New Post Scaffolder\n');

  const categoryRaw = await ask('Category (review/tutorial/comparison/guide): ');
  const category = categoryRaw.trim().toLowerCase();

  if (!['review', 'tutorial', 'comparison', 'guide'].includes(category)) {
    console.error('Invalid category. Must be: review, tutorial, comparison, or guide');
    process.exit(1);
  }

  const title = await ask('Post title (max 60 chars): ');
  const slug = await ask('URL slug (e.g. dji-pocket-3-vs-insta360): ');
  const description = await ask('Meta description (140-160 chars): ');

  rl.close();

  const collectionFolder = `${category}s`;
  const filePath = join(root, 'src', 'content', collectionFolder, `${slug}.mdx`);

  const template = `---
title: "${title.trim()}"
description: "${description.trim()}"
pubDate: ${today}
# updatedDate: ${today}
heroImage: "/images/${slug}-hero.jpg"
heroImageAlt: "TODO: describe the hero image for accessibility and SEO"
category: "${category}"
tags: ["dji-pocket-3", "TODO-add-more-tags"]
author: "Jun Hao"
featured: false
amazonProducts:
  - asin: "BXXXXXXXXXX"
    title: "Product Name"
    ctaText: "Check Price on Amazon"
# rating: 4.5  # Uncomment for reviews
faq:
  - question: "Common question about this topic?"
    answer: "Clear, concise answer that will appear in FAQ schema and at the bottom of the post."
---

import AffiliateBox from '../../components/AffiliateBox.astro';
import Pros from '../../components/Pros.astro';
import Cons from '../../components/Cons.astro';
import SpecTable from '../../components/SpecTable.astro';
import AdSlot from '../../components/AdSlot.astro';

TODO: Write your introduction here. First person, real experience, tell the reader what they will get from this post.

## First H2

Content goes here.

<AdSlot slot="between-section" />

## Second H2

<AffiliateBox
  asin="BXXXXXXXXXX"
  title="Product Name"
  ctaText="Check Price on Amazon"
  price="~$XX"
/>

## Pros and Cons

<Pros items={[
  "First pro",
  "Second pro",
]} />

<Cons items={[
  "First con",
  "Second con",
]} />

---

*Internal links: [DJI Pocket 3 Review](/reviews/dji-pocket-3-honest-review) · [D-Log M Tutorial](/tutorials/d-log-m-color-grading-davinci)*
`;

  try {
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, template);
    console.log(`\n✅ Created: src/content/${collectionFolder}/${slug}.mdx`);
    console.log(`\nNext steps:`);
    console.log(`  1. Add a hero image to public/images/${slug}-hero.jpg`);
    console.log(`  2. Update the frontmatter (ASIN, tags, etc.)`);
    console.log(`  3. Write your content`);
    console.log(`  4. Run: npm run dev\n`);
  } catch (err) {
    console.error('Failed to create file:', err.message);
    process.exit(1);
  }
}

main();
