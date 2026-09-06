import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const rows=[]; const failures=[];
const walk=(dir)=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):/\.(tsx|ts)$/.test(e.name)?[path.join(dir,e.name)]:[]);
const files=['mobile/app','mobile/components','mobile/lib','app','components','lib'].flatMap(d=>walk(path.join(root,d)));
for(const file of files){
 const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 const visit=(node)=>{
  const raw=ts.isJsxText(node)?node.text.trim():ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)?node.text:null;
  if(raw && (ts.isJsxText(node)||/\s/.test(raw)) && /[a-zA-Z]{3}/.test(raw) && !/[{};=]|rgba?\(|\b(?:SELECT|INSERT|UPDATE|import|export)\b/.test(raw)){
   const loc=source.getLineAndCharacterOfPosition(node.getStart(source));
   rows.push({file:path.relative(root,file),line:loc.line+1,kind:ts.SyntaxKind[node.kind],text:raw});
   // Raw JSX text is not JavaScript: backslash escapes here render literally.
   if(ts.isJsxText(node)&&/\\[rnt]/.test(raw))failures.push(`${path.relative(root,file)}:${loc.line+1}: literal escaped whitespace in JSX`);
  }
  ts.forEachChild(node,visit);
 }; visit(source);
}
if(process.argv.includes('--json')) console.log(JSON.stringify({files:files.length,strings:rows.length,rows},null,2));
else console.log(`Copy inventory: ${files.length} source files, ${rows.length} candidate strings; raw JSX escaped-whitespace defects: ${failures.length}.`);
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
