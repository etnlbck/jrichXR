#!/usr/bin/env node
/**
 * Convert a Meshy OBJ (+ MTL/PNG) into content/.../assets/models/finished.glb
 * Requires: npx obj2gltf (pulled on demand).
 *
 * Usage:
 *   npm run convert-meshy -- [path/to/model.obj]
 *
 * Does not create raw.glb — export a second aligned mesh for the morph pair.
 */
import { spawnSync } from 'child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
} from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const root = join(fileURLToPath(import.meta.url), '../..');
const defaultObjDir = join(
  root,
  'Meshy_AI_Ebon_Flow_0912182439_texture_obj'
);

const argObj = process.argv[2];
let objPath = argObj ? resolve(argObj) : null;

if (!objPath) {
  if (!existsSync(defaultObjDir)) {
    console.error('No OBJ path given and default Meshy folder missing.');
    process.exit(1);
  }
  const obj = readdirSync(defaultObjDir).find((f) => f.endsWith('.obj'));
  if (!obj) {
    console.error('No .obj in', defaultObjDir);
    process.exit(1);
  }
  objPath = join(defaultObjDir, obj);
}

const outDir = join(root, 'content/untitled-no-7/assets/models');
mkdirSync(outDir, { recursive: true });
const outGlb = join(outDir, 'finished.glb');

console.log('Converting', objPath, '→', outGlb);
const result = spawnSync(
  'npx',
  ['--yes', 'obj2gltf', '-i', objPath, '-o', outGlb],
  { stdio: 'inherit', cwd: root }
);

if (result.status !== 0) {
  console.error('obj2gltf failed');
  process.exit(result.status ?? 1);
}

const publicDir = join(root, 'public/assets/models');
mkdirSync(publicDir, { recursive: true });
copyFileSync(outGlb, join(publicDir, 'finished.glb'));
console.log('Also copied to public/assets/models/finished.glb');
console.log(
  'Next: add aligned raw.glb, set gallery.usePlaceholderCube=false in experience.json'
);
