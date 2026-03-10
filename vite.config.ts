import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'yyawf',
        namespace: 'https://github.com/tiansh',
        version: '0.0.11',
        description: 'Under construction',
        author: '田生 http://weibo.com/tsh90',
        license: 'MPL-2.0',
        match: ['*://*.weibo.com/*'],
        noframes: true,
        'run-at': 'document-start',
        connect: ['miaopai.com', 'sina.cn', 'sina.com.cn', 'sinaimg.cn', 'sinajs.cn', 't.cn', 'weibo.com'],
      },
      build: {
        externalGlobals: {},
      },
    }),
  ],
});
