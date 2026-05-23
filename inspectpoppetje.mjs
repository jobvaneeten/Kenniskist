import { readFileSync } from 'fs';

const buf     = readFileSync('C:/Users/nieuwaccount/kenniskist/public/Poppetje.glb');
const jsonLen = buf.readUInt32LE(12);
const json    = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));

console.log('=== Poppetje.glb ===');
console.log(`  meshes:     ${json.meshes?.length ?? 0}`);
console.log(`  nodes:      ${json.nodes?.length ?? 0}`);
console.log(`  skins:      ${json.skins?.length ?? 0}`);
console.log(`  animations: ${json.animations?.length ?? 0}`);

if (json.skins?.length) {
  json.skins.forEach((skin, i) => {
    console.log(`\n  Skin [${i}]: "${skin.name}" — ${skin.joints?.length ?? 0} joints`);
  });
}

console.log('\n=== Scene root nodes ===');
(json.scenes?.[0]?.nodes ?? []).forEach(idx => {
  const n = json.nodes[idx];
  console.log(`  [${idx}] "${n?.name}" (children: ${n?.children?.length ?? 0})`);
});

console.log('\n=== All node names ===');
json.nodes?.forEach((n, i) => {
  const hasMesh = n.mesh !== undefined;
  const hasSkin = n.skin !== undefined;
  const tag = [hasMesh ? 'mesh' : '', hasSkin ? 'skin' : ''].filter(Boolean).join('+');
  console.log(`  [${i}] "${n.name}" ${tag ? `(${tag})` : ''}`);
});
