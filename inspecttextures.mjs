import { readFileSync } from 'fs';

const buf     = readFileSync('C:/Users/nieuwaccount/kenniskist/public/Poppetje.glb');
const jsonLen = buf.readUInt32LE(12);
const json    = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));

console.log('=== Materials ===');
json.materials?.forEach((mat, i) => {
  const tex = mat.pbrMetallicRoughness?.baseColorTexture;
  console.log(`[${i}] "${mat.name}" — texture: ${tex ? 'JA (index ' + tex.index + ')' : 'nee (alleen kleur)'}`);
  if (mat.pbrMetallicRoughness?.baseColorFactor) {
    const f = mat.pbrMetallicRoughness.baseColorFactor.map(v => Math.round(v*255));
    console.log(`     baseColor RGBA: ${f}`);
  }
});

console.log('\n=== Images/Textures in GLB ===');
if (!json.images?.length) {
  console.log('Geen afbeeldingen gevonden in dit GLB-bestand.');
} else {
  json.images.forEach((img, i) => console.log(`[${i}] ${img.name || img.uri || '(embedded)'}`));
}

// Find which material belongs to Shirt mesh
console.log('\n=== Shirt mesh material ===');
const shirtNode = json.nodes?.find(n => n.name === 'Shirt');
if (shirtNode?.mesh !== undefined) {
  const mesh = json.meshes[shirtNode.mesh];
  const matIdx = mesh?.primitives?.[0]?.material;
  console.log(`Shirt gebruikt material [${matIdx}]: "${json.materials?.[matIdx]?.name}"`);
}
