import { readFileSync } from 'fs';

const buf = readFileSync('C:/Users/nieuwaccount/kenniskist/public/goed.glb');
const jsonLength = buf.readUInt32LE(12);
const json = JSON.parse(buf.toString('utf8', 20, 20 + jsonLength));

const clothingMeshIndices = [0, 1, 3, 4]; // Ajax_Broek, Ajax_Shirt, Chelsea_Broek, Chelsea_Shirt
const clothingNames = ['Ajax_Broek', 'Ajax_Shirt', 'Chelsea_Broek', 'Chelsea_Shirt'];

console.log('\n=== CLOTHING MESH ATTRIBUTES ===');
clothingMeshIndices.forEach((mi, ci) => {
  const mesh = json.meshes[mi];
  if (!mesh) return;
  mesh.primitives.forEach((prim, pi) => {
    const attrs = Object.keys(prim.attributes || {}).join(', ');
    const hasSkin = attrs.includes('JOINTS') && attrs.includes('WEIGHTS');
    console.log(`  ${clothingNames[ci]}: attributes=[${attrs}]`);
    console.log(`    → Skinning data aanwezig: ${hasSkin ? '✅ JA' : '❌ NEE'}`);
  });
});

console.log('\n=== BODY MESH (referentie) ===');
const bodyMesh = json.meshes[2];
bodyMesh?.primitives.forEach(prim => {
  const attrs = Object.keys(prim.attributes || {}).join(', ');
  console.log(`  Body: attributes=[${attrs}]`);
});
