import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://plinthwick-sample.example',
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
});
