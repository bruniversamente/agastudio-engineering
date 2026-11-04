import test from 'node:test';
import assert from 'node:assert/strict';
import {createAgaProject,openAgaProject} from '../src/aga-project.ts';
import {strToU8,strFromU8,unzipSync,zipSync} from '../vendor/fflate.js';
import {createProjectContentMarker,projectContentMarkerChanged,sameProjectContentMarker} from '../src/project-content-marker.ts';

const options=()=>({appVersion:'portfolio-example',createdAt:'2026-11-04T12:00:00Z',updatedAt:'2026-11-04T12:00:00Z',projectId:'demo-container-001',name:'Estudo demonstrativo',
  project:{example:'Container-only fixture; not a complete AGA workspace',vertices:[{id:'V1',base:27,top:37.5}],runId:'demo-run-001'},
  attachments:[{id:'input-1',name:'pontos de origem.csv',mediaType:'text/csv',data:strToU8('id;base;topo\nV1;27;37.5\n')}]});
async function altered(change:(files:Record<string,Uint8Array>)=>void,rehash=false){
  const files=unzipSync(await createAgaProject(options()));change(files);
  if(rehash){const hashes={};for(const [path,bytes] of Object.entries(files)){if(path==='checksums.json')continue;const sum=await crypto.subtle.digest('SHA-256',bytes);hashes[path]=Buffer.from(sum).toString('hex');}files['checksums.json']=strToU8(JSON.stringify(hashes));}
  return zipSync(files);
}
test('round-trip preserves project data, attachment bytes and identity',async()=>{const source=options();const opened=await openAgaProject(await createAgaProject(source));assert.deepEqual(opened.project,source.project);assert.equal(opened.manifest.projectId,source.projectId);assert.deepEqual(opened.attachments.get('input-1')?.data,source.attachments[0].data);});
test('creation rejects duplicate attachment identities',async()=>{const input=options();input.attachments.push({...input.attachments[0]});await assert.rejects(()=>createAgaProject(input),/identificadores únicos/);});
test('modified project payload is refused by checksum validation',async()=>{await assert.rejects(()=>altered(files=>files['project.json']=strToU8('{"changed":true}')).then(openAgaProject),/corrompido/);});
test('missing attachment is refused before restoring the project',async()=>{await assert.rejects(()=>altered(files=>delete files['attachments/001-pontos-de-origem.csv']).then(openAgaProject),/incompleta|corrompido/);});
test('unknown schema is refused even with valid hashes',async()=>{const bytes=await altered(files=>{const m=JSON.parse(strFromU8(files['manifest.json']));m.schemaVersion=999;files['manifest.json']=strToU8(JSON.stringify(m));},true);await assert.rejects(()=>openAgaProject(bytes),/não é compatível/);});
test('invalid attachment path is refused even with valid hashes',async()=>{const bytes=await altered(files=>{const m=JSON.parse(strFromU8(files['manifest.json']));m.attachments[0].path='attachments/../outside';files['manifest.json']=strToU8(JSON.stringify(m));},true);await assert.rejects(()=>openAgaProject(bytes),/anexos.*inválida/);});
test('empty package is refused',async()=>{await assert.rejects(()=>openAgaProject(new Uint8Array()),/vazio/);});
test('arbitrary bytes are refused as an invalid package',async()=>{await assert.rejects(()=>openAgaProject(strToU8('not-a-zip')),/válido/);});
const marker=()=>({fingerprint:'input-a',revision:1,heliportFingerprint:'heli-a',heliportRevision:1,heliportDraftRevision:1});
test('content marker snapshot is independent of future edits',()=>{const input=marker();const copy=createProjectContentMarker(input);input.revision=2;assert.equal(copy.revision,1);assert.equal(projectContentMarkerChanged(copy,input),true);});
test('unchanged project content is recognized',()=>{assert.equal(sameProjectContentMarker(marker(),marker()),true);});
test('a changed input fingerprint invalidates content equality',()=>{assert.equal(sameProjectContentMarker(marker(),{...marker(),fingerprint:'input-b'}),false);});
test('a changed heliport draft invalidates content equality',()=>{assert.equal(projectContentMarkerChanged(marker(),{...marker(),heliportDraftRevision:2}),true);});
