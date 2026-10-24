import { packager } from '@electron/packager';

const paths = await packager({
  dir: '.', name: 'Deskkeep', platform: 'win32', arch: 'x64', out: 'release', overwrite: true,
  asar: { unpack: '**/*.node' }, prune: true, ignore: [/^\/release($|\/)/, /^\/test-results($|\/)/, /^\/outputs($|\/)/, /^\/\.git($|\/)/]
});
console.log(JSON.stringify({ packaged: paths }, null, 2));
