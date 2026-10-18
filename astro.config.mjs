import { defineConfig } from 'astro/config';
import frontmanAi from '@frontman-ai/astro';
// https://astro.build/config
export default defineConfig({
  integrations: [frontmanAi()]
});