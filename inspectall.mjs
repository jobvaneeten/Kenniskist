import { readFileSync } from 'fs';

const files = ['Lichaam', 'Shirt', 'Broek', 'Schoenen', 'Sokken'];

for (const name of files) {
  try {
    const buf = readFileSync(`C:/Users/nieuwaccount/kenniskist/public/${name}.glb`);
    const jsonLen = buf.readUInt32LE(12);
    const json = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));

    const meshCount = json.meshes?.length ?? 0;
    const nodeCount = json.nodes?.length ?? 0;
    const skinCount = json.skins?.length ?? 0;
    const animCount = json.animations?.length ?? 0;

    // Bounding box from accessors (first mesh, first primitive, POSITION accessor)
    let bbox = '-';
    try {
      const acc = json.accessors?.find(a => a.type === 'VEC3' && a.min && a.max);
      if (acc) bbox = `min(${acc.min.map(v=>v.toFixed(2)).join(',')}) max(${acc.max.map(v=>v.toFixed(2)).join(',')})`;
    } catch {}

    console.log(`\n=== ${name}.glb ===`);
    console.log(`  meshes: ${meshCount}, nodes: ${nodeCount}, skins: ${skinCount}, animations: ${animCount}`);
    console.log(`  first POSITION range: ${bbox}`);

    // Root scene nodes
    const roots = (json.scenes?.[0]?.nodes ?? []).map(i => `"${json.nodes[i]?.name}"`).join(', ');
    console.log(`  scene root nodes: ${roots}`);
  } catch(e) {
    console.log(`\n=== ${name}.glb === ERROR: ${e.message}`);
  }
}
