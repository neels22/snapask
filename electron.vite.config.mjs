import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin(),
      {
        name: 'copy-main-files',
        closeBundle() {
          // Copy all files from src/main to out/main preserving structure
          const srcDir = resolve(__dirname, 'src/main');
          const outDir = resolve(__dirname, 'out/main');
          
          function copyRecursive(src, dest) {
            const entries = readdirSync(src, { withFileTypes: true });
            for (const entry of entries) {
              const srcPath = join(src, entry.name);
              const destPath = join(dest, entry.name);
              
              if (entry.isDirectory()) {
                mkdirSync(destPath, { recursive: true });
                copyRecursive(srcPath, destPath);
              } else if (entry.isFile() && entry.name.endsWith('.js')) {
                mkdirSync(dirname(destPath), { recursive: true });
                copyFileSync(srcPath, destPath);
              }
            }
          }
          
          try {
            copyRecursive(srcDir, outDir);
          } catch (error) {
            console.error('Error copying main files:', error);
          }
        }
      }
    ],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.js')
        },
        output: {
          format: 'cjs',
          preserveModules: true,
          preserveModulesRoot: 'src/main',
          entryFileNames: '[name].js',
          dir: 'out/main'
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          preload: resolve(__dirname, 'src/renderer/shared/preload/preload.js')
        }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    build: {
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'src/renderer/popup/index.html'),
          app: resolve(__dirname, 'src/renderer/app/index.html'),
          onboarding: resolve(__dirname, 'src/renderer/onboarding/index.html')
        }
      }
    },
    plugins: [react()]
  }
});

