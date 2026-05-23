import { readFileSync } from 'fs';
const buf = readFileSync('C:/Users/nieuwaccount/kenniskist/public/goed.glb');
const json = JSON.parse(buf.toString('utf8', 20, 20 + buf.readUInt32LE(12)));

console.log('=== ROOT SCENE NODES ===');
const rootNodes = json.scenes?.[0]?.nodes ?? [];
rootNodes.forEach(idx => {
  const n = json.nodes[idx];
  console.log(`[${idx}] "${n.name}"`);
  if (n.rotation)    console.log(`  rotation (quat): ${n.rotation.map(v=>v.toFixed(4)).join(', ')}`);
  if (n.translation) console.log(`  translation: ${n.translation.map(v=>v.toFixed(4)).join(', ')}`);
  if (n.scale)       console.log(`  scale: ${n.scale.map(v=>v.toFixed(4)).join(', ')}`);
});

console.log('\n=== SKELETON ROOT (Hips) ===');
const hips = json.nodes.find(n => n.name === 'Hips');
if (hips) {
  console.log(`  rotation: ${(hips.rotation ?? []).map(v=>v.toFixed(4)).join(', ')}`);
  console.log(`  translation: ${(hips.translation ?? []).map(v=>v.toFixed(4)).join(', ')}`);
}

console.log('\n=== ALL TOP-LEVEL NODES ===');
json.nodes.slice(0,6).forEach((n,i) => {
  const r = n.rotation ? n.rotation.map(v=>v.toFixed(3)).join(',') : '-';
  const t = n.translation ? n.translation.map(v=>v.toFixed(3)).join(',') : '-';
  console.log(`  [${i}] "${n.name}" rot=[${r}] trans=[${t}]`);
});
