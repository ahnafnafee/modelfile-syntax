import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

const sharedOptions = {
  bundle: true,
  external: ['vscode'],
  format: 'cjs',
  sourcemap: true,
  minify: !watch,
  logLevel: 'info'
};

const desktopBuild = {
  ...sharedOptions,
  entryPoints: ['src/extension.ts'],
  outfile: 'dist/extension.js',
  platform: 'node',
  target: 'node22'
};

const webBuild = {
  ...sharedOptions,
  entryPoints: ['src/extension.ts'],
  outfile: 'dist/web/extension.js',
  platform: 'browser',
  target: 'es2022',
  define: { global: 'globalThis' }
};

if (watch) {
  const desktopCtx = await esbuild.context(desktopBuild);
  const webCtx = await esbuild.context(webBuild);
  await Promise.all([desktopCtx.watch(), webCtx.watch()]);
  console.log('[esbuild] watching for changes...');
} else {
  await Promise.all([esbuild.build(desktopBuild), esbuild.build(webBuild)]);
}
