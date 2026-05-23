import { readFileSync, writeFileSync } from 'fs';

const src  = 'C:/Users/nieuwaccount/kenniskist/public/goed.glb';
const dest = 'C:/Users/nieuwaccount/kenniskist/public/goed.glb';

const buf        = readFileSync(src);
const jsonLen    = buf.readUInt32LE(12);
const json       = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));

// Nodes that have skinning vertex data but no skin reference
const toSkin = ['Ajax_Broek', 'Ajax_Shirt', 'Chelsea_Broek', 'Chelsea_Shirt'];

let patched = 0;
json.nodes.forEach((node, i) => {
  if (toSkin.includes(node.name) && node.skin === undefined) {
    node.skin = 0;  // point to Skeleton.001
    console.log(`  ✅ Patched node [${i}] "${node.name}" → skin=0`);
    patched++;
  }
});

if (patched === 0) {
  console.log('Nothing to patch — all nodes already have skin references.');
  process.exit(0);
}

// Re-serialize + pad JSON to 4-byte boundary
let newJson     = JSON.stringify(json);
const pad       = (4 - (newJson.length % 4)) % 4;
newJson        += ' '.repeat(pad);
const newJsonBuf = Buffer.from(newJson, 'utf8');

// Binary chunk (everything after the original JSON chunk)
const binaryChunkStart = 20 + jsonLen;
const binaryChunk      = buf.slice(binaryChunkStart);

// Assemble new GLB
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546C67, 0);  // magic "glTF"
header.writeUInt32LE(2, 4);           // version
header.writeUInt32LE(12 + 8 + newJsonBuf.length + binaryChunk.length, 8); // total length

const jsonChunkHeader = Buffer.alloc(8);
jsonChunkHeader.writeUInt32LE(newJsonBuf.length, 0);  // chunk length
jsonChunkHeader.writeUInt32LE(0x4E4F534A, 4);          // chunk type "JSON"

const newGlb = Buffer.concat([header, jsonChunkHeader, newJsonBuf, binaryChunk]);
writeFileSync(dest, newGlb);
console.log(`\nGeschreven: ${dest} (${(newGlb.length / 1024 / 1024).toFixed(1)} MB)`);
