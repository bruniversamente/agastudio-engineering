import {createAgaProject,openAgaProject} from '../src/aga-project.ts';
const bytes=await createAgaProject({appVersion:'portfolio-example',name:'Container demonstrativo',projectId:'demo-001',createdAt:'2026-11-04T12:00:00Z',updatedAt:'2026-11-04T12:00:00Z',project:{note:'Container-only example; not a full AGA workspace',source:'synthetic'}});
const opened=await openAgaProject(bytes);
console.log(JSON.stringify({bytes:bytes.length,project:opened.manifest.name,version:opened.manifest.schemaVersion,restored:opened.project},null,2));
