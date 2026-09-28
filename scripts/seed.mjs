import {writeFileSync} from 'node:fs';
import {seedDocuments} from '../src/lib/pack.mjs';
const now=new Date().toISOString();
writeFileSync('seed.ndjson',seedDocuments.map(d=>JSON.stringify(d._type==='soundRecipe'?{...d,reviewedAt:now}:d)).join('\n')+'\n');
console.log(`Prepared ${seedDocuments.length} original demonstration documents.`);
