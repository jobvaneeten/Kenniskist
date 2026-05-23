import { readFileSync } from 'fs';

const buf = readFileSync('C:/Users/nieuwaccount/kenniskist/public/Body.glb');
const jsonLength = buf.readUInt32LE(12);
const json = JSON.parse(buf.toString('utf8', 20, 20 + jsonLength));

console.log('\n=== ANIMATIONS ===');
if (json.animations?.length) {
  json.animations.forEach((a, i) => {
    const channels = a.channels?.length ?? 0;
    console.log(`  [${i}] name="${a.name}" channels=${channels}`);
  });
} else {
  console.log('  (geen animaties gevonden)');
}

console.log('\n=== SKINS / ARMATURE ===');
if (json.skins?.length) {
  json.skins.forEach((s, i) => {
    console.log(`  [${i}] name="${s.name}" joints=${s.joints?.length}`);
  });
} else {
  console.log('  (geen skins gevonden)');
}

console.log('\n=== MESH → NODE PARENT CHAIN ===');
const clothingNodes = ['Ajax_Broek','Ajax_Shirt','Chelsea_Broek','Chelsea_Shirt','Body'];
const nodeMap = {};
(json.nodes || []).forEach((n, i) => nodeMap[i] = n);

clothingNodes.forEach(name => {
  const idx = (json.nodes || []).findIndex(n => n.name === name);
  if (idx < 0) { console.log(`  ${name}: niet gevonden`); return; }
  const n = json.nodes[idx];
  const skin = n.skin ?? '-';
  const pos = n.translation ? n.translation.map(v => v.toFixed(3)).join(', ') : 'geen';
  console.log(`  ${name}: skin=${skin} translation=[${pos}]`);
});
