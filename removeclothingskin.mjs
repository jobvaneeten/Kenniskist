import { readFileSync, writeFileSync } from 'fs';

const src  = 'C:/Users/nieuwaccount/kenniskist/public/goed.glb';
const dest = 'C:/Users/nieuwaccount/kenniskist/public/goed.glb';

const buf     = readFileSync(src);
const jsonLen = buf.readUInt32LE(12);
const json    = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));

const toUnskin = ['Ajax_Broek', 'Ajax_Shirt', 'Chelsea_Broek', 'Chelsea_Shirt'];

let patched = 0;
json.nodes.forEach((node, i) => {
  if (toUnskin.includes(node.name) && node.skin !== undefined) {
    delete node.skin;
    console.log(`  Removed skin from node [${i}] "${node.name}"`);
    patched++;
  }
});

if (patched === 0) {
  console.log('Nothing to do — clothing nodes already have no skin reference.');
  process.exit(0);
}

let newJson = JSON.stringify(json);
const pad   = (4 - (newJson.length % 4)) % 4;
newJson    += ' '.repeat(pad);
const newJsonBuf = Buffer.from(newJson, 'utf8');

const binaryChunkStart = 20 + jsonLen;
const binaryChunk      = buf.slice(binaryChunkStart);

const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546C67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + newJsonBuf.length + binaryChunk.length, 8);

const jsonChunkHeader = Buffer.alloc(8);
jsonChunkHeader.writeUInt32LE(newJsonBuf.length, 0);
jsonChunkHeader.writeUInt32LE(0x4E4F534A, 4);

const newGlb = Buffer.concat([header, jsonChunkHeader, newJsonBuf, binaryChunk]);
writeFileSync(dest, newGlb);
console.log(`\nGeschreven: ${dest} (${(newGlb.length / 1024 / 1024).toFixed(1)} MB)`);
