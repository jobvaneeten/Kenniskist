import { readFileSync } from 'fs';

const buf = readFileSync('C:/Users/nieuwaccount/kenniskist/public/Body.glb');

// Parse GLB header
const magic = buf.readUInt32LE(0);
if (magic !== 0x46546C67) { console.log('Not a GLB file'); process.exit(1); }

const jsonLength = buf.readUInt32LE(12);
const jsonStr = buf.toString('utf8', 20, 20 + jsonLength);
const json = JSON.parse(jsonStr);

console.log('\n=== NODES ===');
(json.nodes || []).forEach((n, i) => {
  console.log(`  [${i}] name="${n.name}" mesh=${n.mesh ?? '-'}`);
});

console.log('\n=== MESHES ===');
(json.meshes || []).forEach((m, i) => {
  console.log(`  [${i}] name="${m.name}" primitives=${m.primitives?.length}`);
});

console.log('\n=== MATERIALS ===');
(json.materials || []).forEach((m, i) => {
  console.log(`  [${i}] name="${m.name}" alphaMode=${m.alphaMode ?? 'OPAQUE'} doubleSided=${m.doubleSided ?? false}`);
});
