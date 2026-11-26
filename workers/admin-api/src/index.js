const COOKIE="so_admin_session";
const SESSION_SECONDS=60*60*8;
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...headers}});
const cors=(request,env)=>{const origin=request.headers.get("Origin")||"";const allowed=[env.ADMIN_ORIGIN,env.PUBLIC_ORIGIN].filter(Boolean);if(!allowed.includes(origin))return {};return {"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Credentials":origin===env.ADMIN_ORIGIN?"true":"false","Access-Control-Allow-Headers":"Content-Type,Range","Access-Control-Allow-Methods":"GET,HEAD,POST,PUT,OPTIONS","Vary":"Origin"};};
const b64url=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const fromB64url=s=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")+"===".slice((s.length+3)%4)),c=>c.charCodeAt(0));
async function sign(value,secret){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return b64url(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(value)));}
async function issueSession(email,env){const payload=b64url(new TextEncoder().encode(JSON.stringify({email,exp:Math.floor(Date.now()/1000)+SESSION_SECONDS})));return payload+"."+await sign(payload,env.SESSION_SECRET);}
async function getSession(request,env){const raw=request.headers.get("Cookie")||"";const token=raw.split(";").map(x=>x.trim()).find(x=>x.startsWith(COOKIE+"="))?.slice(COOKIE.length+1);if(!token||!env.SESSION_SECRET)return null;const parts=token.split(".");if(parts.length!==2)return null;const [payload,signature]=parts;const expected=await sign(payload,env.SESSION_SECRET);if(signature!==expected)return null;try{const data=JSON.parse(new TextDecoder().decode(fromB64url(payload)));return data.exp>Date.now()/1000?data:null}catch{return null}}
const cookie=(value,maxAge)=>COOKIE+"="+value+"; Path=/api/admin; HttpOnly; Secure; SameSite=None; Max-Age="+maxAge;
const readBody=async request=>{try{return await request.json()}catch{return null}};
const safeUploadKey=key=>typeof key==="string"&&key.length<=1024&&(key.startsWith("question-bank/")||key.startsWith("media/"))&&!key.includes(String.fromCharCode(92))&&key.split("/").every(part=>part&&part!=="."&&part!==".."&&[...part].every(char=>char.charCodeAt(0)>=32&&char.charCodeAt(0)!==127));
const MAX_UPLOAD_BYTES=500*1024*1024;
const MAX_AUDIT_JSON_BYTES=10*1024*1024;
async function readSmallObject(object,parseJson=false){
 if(!object||object.size>MAX_AUDIT_JSON_BYTES)return {data:null,sha256:null};
 const bytes=await object.arrayBuffer();
 const sha256=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))).map(x=>x.toString(16).padStart(2,"0")).join("");
 let data=null;
 if(parseJson){try{data=JSON.parse(new TextDecoder().decode(bytes))}catch{}}
 return {data,sha256};
}
function questionMap(data){
 if(!Array.isArray(data?.questions))return null;
 const map=new Map();
 for(const item of data.questions){
  if(!item||typeof item.id!=="string"||!item.id.trim()||map.has(item.id))return null;
  map.set(item.id,item);
 }
 return map;
}
function changesBetween(before,after){
 const changes=[];
 if(after)for(const [id,item] of after){
  if(!before||!before.has(id))changes.push({id,action:"created",before:null,after:item});
  else if(JSON.stringify(before.get(id))!==JSON.stringify(item))changes.push({id,action:"updated",before:before.get(id),after:item});
 }
 if(before)for(const [id,item] of before)if(!after||!after.has(id))changes.push({id,action:"removed",before:item,after:null});
 return changes;
}
async function recordQuestionChanges(env,changes,key,uploadId,actor,changedAt){
 for(let offset=0;offset<changes.length;offset+=100){
  const batch=changes.slice(offset,offset+100).map(item=>env.DB.prepare(
   "INSERT INTO question_change_log (id,question_id,action,object_key,upload_id,changed_by,changed_at,before_json,after_json) VALUES (?,?,?,?,?,?,?,?,?)"
  ).bind(crypto.randomUUID(),item.id,item.action,key,uploadId,actor,changedAt,item.before?JSON.stringify(item.before):null,item.after?JSON.stringify(item.after):null));
  if(batch.length)await env.DB.batch(batch);
 }
}

function same(a,b){if(typeof a!=="string"||typeof b!=="string")return false;const x=new TextEncoder().encode(a),y=new TextEncoder().encode(b);let diff=x.length^y.length;for(let i=0;i<Math.max(x.length,y.length);i++)diff|=(x[i]||0)^(y[i]||0);return diff===0}
async function route(request,env){
 const url=new URL(request.url),path=url.pathname.replace(/\/$/,"");
 if(request.method==="OPTIONS")return new Response(null,{status:204});
 // Public, read-only access to published question-bank files and media in R2.
 if(path.startsWith("/api/content/")&&(request.method==="GET"||request.method==="HEAD")){
  if(!env.CONTENT_BUCKET)return json({error:"R2 content storage is not configured."},503);
  let key;try{key=decodeURIComponent(path.slice("/api/content/".length))}catch{return json({error:"Invalid object key."},400)}
  if(!key||key.split("/").some(part=>!part||part==="."||part==="..")||!(/^(question-bank|media)\//.test(key)))return json({error:"Content not found."},404);
  const object=request.method==="HEAD"?await env.CONTENT_BUCKET.head(key):await env.CONTENT_BUCKET.get(key);
  if(!object)return json({error:"Content not found."},404);
  const headers=new Headers();object.writeHttpMetadata(headers);headers.set("ETag",object.httpEtag);
  headers.set("Cache-Control","public, max-age=300, s-maxage=3600");
  if(request.method==="HEAD")return new Response(null,{headers});
  return new Response(object.body,{headers});
 }
 if(path==="/api/admin/login"&&request.method==="POST"){
  const body=await readBody(request);
  if(!body||!env.ADMIN_EMAIL||!env.ADMIN_PASSWORD||!env.SESSION_SECRET)return json({error:"Admin authentication is not configured."},503);
  if(!same(String(body.email||"").trim().toLowerCase(),env.ADMIN_EMAIL.trim().toLowerCase())||!same(String(body.password||""),env.ADMIN_PASSWORD))return json({error:"Email or password is incorrect."},401);
  const token=await issueSession(env.ADMIN_EMAIL,env);
  return json({ok:true,email:env.ADMIN_EMAIL},200,{"Set-Cookie":cookie(token,SESSION_SECONDS)});
 }
 if(path==="/api/admin/me"&&request.method==="GET"){const session=await getSession(request,env);return session?json({ok:true,email:session.email}):json({error:"Authentication required."},401)}
 if(path==="/api/admin/logout"&&request.method==="POST")return json({ok:true},200,{"Set-Cookie":cookie("",0)});
 const session=await getSession(request,env);if(!session)return json({error:"Authentication required."},401);
 if(path.startsWith("/api/admin/uploads/")){
  if(!env.CONTENT_BUCKET)return json({error:"R2 content storage is not configured."},503);
  if(path==="/api/admin/uploads/history"&&request.method==="GET"){
    const limit=Math.min(100,Math.max(1,Number(url.searchParams.get("limit")||20)));
    const {results=[]}=await env.DB.prepare("SELECT upload_id,object_key,original_file_name,content_type,expected_size,actual_size,uploaded_by,status,question_count,added_count,updated_count,removed_count,schema_version,bank_version,sha256,r2_etag,started_at,completed_at FROM content_uploads ORDER BY started_at DESC LIMIT ?").bind(limit).all();
    return json({uploads:results});
  }
  if(path==="/api/admin/uploads/start"&&request.method==="POST"){
   const body=await readBody(request);const {key,size,contentType,fileName}=body||{};
   if(!safeUploadKey(key))return json({error:"Use a file path under question-bank/ or media/."},400);
   if(!Number.isSafeInteger(size)||size<1||size>MAX_UPLOAD_BYTES)return json({error:"File size must be between 1 byte and 500 MiB."},400);
   const upload=await env.CONTENT_BUCKET.createMultipartUpload(key,{httpMetadata:{contentType:typeof contentType==="string"&&contentType.length<=200?contentType:"application/octet-stream"}});
   const startedAt=new Date().toISOString();
   try{
    await env.DB.prepare("INSERT INTO content_uploads (upload_id,object_key,original_file_name,content_type,expected_size,uploaded_by,status,started_at) VALUES (?,?,?,?,?,?,'uploading',?)").bind(upload.uploadId,key,typeof fileName==="string"&&fileName.length<=255?fileName:key.split("/").pop(),typeof contentType==="string"?contentType:"application/octet-stream",size,session.email,startedAt).run();
   }catch(error){
    try{await upload.abort()}catch{}
    throw error;
   }
   return json({ok:true,uploadId:upload.uploadId,key,partSize:8*1024*1024,startedAt});
  }
  if(path==="/api/admin/uploads/complete"&&request.method==="POST"){
   const body=await readBody(request);const {key,uploadId,parts}=body||{};
   if(!safeUploadKey(key)||typeof uploadId!=="string"||uploadId.length>512||!Array.isArray(parts)||parts.length<1||parts.length>100)return json({error:"Invalid upload completion request."},400);
   const clean=parts.map(p=>({partNumber:Number(p.partNumber),etag:String(p.etag||"")}));
   if(clean.some((p,i)=>!Number.isInteger(p.partNumber)||p.partNumber!==i+1||!p.etag||p.etag.length>200))return json({error:"Invalid uploaded parts list."},400);
   const oldObject=await env.CONTENT_BUCKET.get(key);
   const isQuestionJson=key.startsWith("question-bank/")&&key.toLowerCase().endsWith(".json");
   const oldSnapshot=oldObject?await readSmallObject(oldObject,isQuestionJson):{data:null,sha256:null};
   const oldData=oldSnapshot.data;
   const oldMap=questionMap(oldData);
   const upload=env.CONTENT_BUCKET.resumeMultipartUpload(key,uploadId);
   const object=await upload.complete(clean);
   const completedAt=new Date().toISOString();
   const currentObject=await env.CONTENT_BUCKET.get(key);
   const currentSnapshot=currentObject?await readSmallObject(currentObject,isQuestionJson):{data:null,sha256:null};
   const currentData=currentSnapshot.data;
   const currentMap=questionMap(currentData);
   const changes=isQuestionJson&&currentMap?changesBetween(oldMap,currentMap):[];
   if(changes.length)await recordQuestionChanges(env,changes,key,uploadId,session.email,completedAt);
   const sha256=currentSnapshot.sha256;
   const addedCount=changes.filter(x=>x.action==="created").length;
   const updatedCount=changes.filter(x=>x.action==="updated").length;
   const removedCount=changes.filter(x=>x.action==="removed").length;
   const validQuestionJson=!isQuestionJson||currentMap!==null;
   await env.DB.prepare("UPDATE content_uploads SET status=?,actual_size=?,question_count=?,added_count=?,updated_count=?,removed_count=?,schema_version=?,bank_version=?,sha256=?,r2_etag=?,completed_at=? WHERE upload_id=?").bind(validQuestionJson?"completed":"completed_unverified",object.size,isQuestionJson&&currentMap?currentMap.size:null,addedCount,updatedCount,removedCount,currentData&&currentData.schemaVersion!=null?String(currentData.schemaVersion):null,currentData&&currentData.bankVersion!=null?String(currentData.bankVersion):null,sha256,object.httpEtag,completedAt,uploadId).run();
   return json({ok:true,key,size:object.size,etag:object.httpEtag,uploadedBy:session.email,completedAt,status:validQuestionJson?"completed":"completed_unverified",questionCount:isQuestionJson&&currentMap?currentMap.size:null,changes:{added:addedCount,updated:updatedCount,removed:removedCount},sha256});
  }
  if(path==="/api/admin/uploads/abort"&&request.method==="POST"){
   const body=await readBody(request);const {key,uploadId}=body||{};
   if(!safeUploadKey(key)||typeof uploadId!=="string"||uploadId.length>512)return json({error:"Invalid upload abort request."},400);
   await env.CONTENT_BUCKET.resumeMultipartUpload(key,uploadId).abort();
   await env.DB.prepare("UPDATE content_uploads SET status='aborted',completed_at=? WHERE upload_id=? AND status='uploading'").bind(new Date().toISOString(),uploadId).run();
   return json({ok:true});
  }
  const partPieces=path.split("/");
  if(partPieces.length===7&&partPieces[1]==="api"&&partPieces[2]==="admin"&&partPieces[3]==="uploads"&&partPieces[5]==="parts"&&request.method==="PUT"){
   let uploadId;try{uploadId=decodeURIComponent(partPieces[4])}catch{return json({error:"Invalid upload ID."},400)}
   const partNumber=Number(partPieces[6]);const key=url.searchParams.get("key");
   if(!safeUploadKey(key)||!uploadId||uploadId.length>512||!Number.isInteger(partNumber)||partNumber<1||partNumber>100)return json({error:"Invalid upload part request."},400);
   if(!request.body)return json({error:"Upload part is empty."},400);
   const result=await env.CONTENT_BUCKET.resumeMultipartUpload(key,uploadId).uploadPart(partNumber,request.body);
   return json({ok:true,partNumber:result.partNumber,etag:result.etag});
  }
  return json({error:"Not found."},404);
 }
 if(path==="/api/admin/questions/history"&&request.method==="GET"){
  const questionId=url.searchParams.get("questionId");
  const limit=Math.min(100,Math.max(1,Number(url.searchParams.get("limit")||20)));
  const query=questionId
   ?env.DB.prepare("SELECT id,question_id,action,object_key,upload_id,changed_by,changed_at,before_json,after_json FROM question_change_log WHERE question_id=? ORDER BY changed_at DESC LIMIT ?").bind(questionId,limit)
   :env.DB.prepare("SELECT id,question_id,action,object_key,upload_id,changed_by,changed_at,before_json,after_json FROM question_change_log ORDER BY changed_at DESC LIMIT ?").bind(limit);
  const {results=[]}=await query.all();
  return json({changes:results});
 }
 if(path==="/api/admin/questions/drafts"&&request.method==="GET"){
  const {results=[]}=await env.DB.prepare("SELECT id,status,question_type,subject,exam,payload_json,created_at,updated_at FROM questions WHERE status!='published' ORDER BY updated_at DESC LIMIT 1000").all();
  return json({questions:results.map(r=>({...JSON.parse(r.payload_json),status:r.status}))});
 }
 if(path==="/api/admin/questions/drafts"&&request.method==="POST"){
  const body=await readBody(request);if(!Array.isArray(body?.questions)||body.questions.length>1000)return json({error:"Send between 1 and 1000 questions."},400);
  const now=new Date().toISOString();
  const statements=body.questions.map(q=>env.DB.prepare("INSERT INTO questions (id,status,question_type,subject,exam,payload_json,created_at,updated_at) VALUES (?,'draft',?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET question_type=excluded.question_type,subject=excluded.subject,exam=excluded.exam,payload_json=excluded.payload_json,updated_at=excluded.updated_at WHERE questions.status!='published'").bind(String(q.id||crypto.randomUUID()),String(q.type||"other"),String(q.subject||""),String(q.exam||""),JSON.stringify(q),now,now));
  await env.DB.batch(statements);return json({ok:true,saved:statements.length});
 }
 if(path==="/api/admin/questions/publish"&&request.method==="POST"){
  const body=await readBody(request);if(!Array.isArray(body?.ids)||!body.ids.length)return json({error:"Select at least one question."},400);if(body.ids.length>500)return json({error:"Publish up to 500 questions per batch."},400);
  const now=new Date().toISOString();const statements=body.ids.map(id=>env.DB.prepare("UPDATE questions SET status='published',published_at=?,updated_at=? WHERE id=? AND status IN ('draft','ready')").bind(now,now,String(id)));
  const results=await env.DB.batch(statements);return json({ok:true,updated:results.reduce((n,r)=>n+(r.meta?.changes||0),0),note:"Stored as published in the admin database. Connect the student question-bank read API before questions appear to learners."});
 }
 return json({error:"Not found."},404);
}
export default {async fetch(request,env){const headers=cors(request,env);try{const response=await route(request,env);const merged=new Headers(response.headers);for(const [k,v] of Object.entries(headers))merged.set(k,v);return new Response(response.body,{status:response.status,headers:merged})}catch(error){return json({error:"Server error.",detail:env.ENVIRONMENT==="development"?String(error):undefined},500)}}};
