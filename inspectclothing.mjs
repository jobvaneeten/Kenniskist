import { readFileSync } from 'fs';
const buf = readFileSync('C:/Users/nieuwaccount/kenniskist/public/goed.glb');
const json = JSON.parse(buf.toString('utf8', 20, 20 + buf.readUInt32LE(12)));

const targets = ['Ajax_Shirt', 'Chelsea_Shirt', 'Ajax_Broek', 'Chelsea_Broek'];

console.log('=== CLOTHING NODES ===');
json.nodes.forEach((n, i) => {
  if (!targets.includes(n.name)) return;
  console.log(`\n[${i}] "${n.name}"`);
  if (n.rotation)    console.log(`  rotation: ${n.rotation.map(v=>v.toFixed(4)).join(', ')}`);
  if (n.translation) console.log(`  translation: ${n.translation.map(v=>v.toFixed(4)).join(', ')}`);
  if (n.scale)       console.log(`  scale: ${n.scale.map(v=>v.toFixed(4)).join(', ')}`);
  if (n.mesh !== undefined) console.log(`  mesh: ${n.mesh}`);
  if (n.skin !== undefined)  console.log(`  skin: ${n.skin}`);
  if (n.children)    console.log(`  children: ${n.children}`);

  // Find parent
  const parent = json.nodes.find((p, pi) => p.children && p.children.includes(i));
  if (parent) console.log(`  parent: "${parent.name}"`);
  else console.log(`  parent: (scene root or none found)`);
});

console.log('\n=== SCENE ROOT NODES ===');
(json.scenes?.[0]?.nodes ?? []).forEach(idx => {
  console.log(`  scene node [${idx}] = "${json.nodes[idx].name}"`);
});
