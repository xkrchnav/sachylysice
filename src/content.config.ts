import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const kronika = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/kronika' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      intro: z.string(),
      photo: image(),
    }),
});

export const collections = { kronika };
