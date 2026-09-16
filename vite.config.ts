import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { compression } from 'vite-plugin-compression2';

function normalizePublicAssetUrls(assetBase: string, electronBuild: boolean, devServer: boolean): Plugin {
  const scriptAssetBase = electronBuild ? './assets/' : assetBase;
  const stylesheetAssetBase = electronBuild ? './' : assetBase;
  const publicAssetUrl = /\/(?:game\/)?assets\//g;

  return {
    name: 'normalize-public-asset-urls',
    transform(code, id) {
      if (!devServer || !/\.(?:[cm]?[jt]sx?|css)$/.test(id)) return null;
      const normalized = code.replace(publicAssetUrl, assetBase);
      return normalized === code ? null : { code: normalized, map: null };
    },
    transformIndexHtml(html) {
      if (!devServer) return html;
      return html.replace(publicAssetUrl, assetBase);
    },
    generateBundle(_, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type === 'chunk') {
          output.code = output.code.replace(publicAssetUrl, scriptAssetBase);
          continue;
        }
        if (typeof output.source !== 'string') continue;
        if (output.fileName.endsWith('.css')) {
          output.source = output.source
            .replace(/url\(\/(?:game\/)?assets\//g, `url(${stylesheetAssetBase}`)
            .replace(/url\("\/(?:game\/)?assets\//g, `url("${stylesheetAssetBase}`)
            .replace(/url\('\/(?:game\/)?assets\//g, `url('${stylesheetAssetBase}`);
          continue;
        }
        output.source = output.source.replace(publicAssetUrl, scriptAssetBase);
      }
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const electronBuild = mode === 'electron';
  const assetBase = electronBuild ? './assets/' : '/assets/';

  return {
    base: electronBuild ? './' : '/',
    plugins: [
      react(),
      normalizePublicAssetUrls(assetBase, electronBuild, command === 'serve'),
      // 预压缩 JS/CSS/JSON 等文本产物为 .gz/.br（配合 nginx gzip_static/brotli_static），
      // 免去运行时压缩的 CPU 开销。大体积二进制（png/mp3）不参与。
      compression({ threshold: 1024, include: [/\.(js|mjs|css|json|svg|html)$/], algorithms: ['gzip', 'brotliCompress'] }),
    ],
    server: {
      proxy: {
        "/api/cloud": {
          target: "http://127.0.0.1:3210",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/cloud/, ""),
        },
        "/api/platform": {
          target: "http://127.0.0.1:3211",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/platform/, ""),
        },
        "/api/match": {
          target: "http://127.0.0.1:3212",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/match/, ""),
        },
        "/api/social": {
          target: "http://127.0.0.1:3213",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/social/, ""),
        },
      },
    },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // 拆分 vendor chunk，利用浏览器长缓存
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'pixi-vendor': ['pixi.js', '@pixi/filter-advanced-bloom', '@pixi/particle-emitter'],
        },
      },
    },
  },
  };
});
