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
  if(path==="/api/admin/uploads/start"&&request.method==="POST"){
   const body=await readBody(request);const {key,size,contentType}=body||{};
   if(!safeUploadKey(key))return json({error:"Use a file path under question-bank/ or media/."},400);
   if(!Number.isSafeInteger(size)||size<1||size>MAX_UPLOAD_BYTES)return json({error:"File size must be between 1 byte and 500 MiB."},400);
   const upload=await env.CONTENT_BUCKET.createMultipartUpload(key,{httpMetadata:{contentType:typeof contentType==="string"&&contentType.length<=200?contentType:"application/octet-stream"}});
   return json({ok:true,uploadId:upload.uploadId,key,partSize:8*1024*1024});
  }
  if(path==="/api/admin/uploads/complete"&&request.method==="POST"){
   const body=await readBody(request);const {key,uploadId,parts}=body||{};
   if(!safeUploadKey(key)||typeof uploadId!=="string"||uploadId.length>512||!Array.isArray(parts)||parts.length<1||parts.length>100)return json({error:"Invalid upload completion request."},400);
   const clean=parts.map(p=>({partNumber:Number(p.partNumber),etag:String(p.etag||"")}));
   if(clean.some((p,i)=>!Number.isInteger(p.partNumber)||p.partNumber!==i+1||!p.etag||p.etag.length>200))return json({error:"Invalid uploaded parts list."},400);
   const upload=env.CONTENT_BUCKET.resumeMultipartUpload(key,uploadId);
   const object=await upload.complete(clean);
   return json({ok:true,key,size:object.size,etag:object.httpEtag});
  }
  if(path==="/api/admin/uploads/abort"&&request.method==="POST"){
   const body=await readBody(request);const {key,uploadId}=body||{};
   if(!safeUploadKey(key)||typeof uploadId!=="string"||uploadId.length>512)return json({error:"Invalid upload abort request."},400);
   await env.CONTENT_BUCKET.resumeMultipartUpload(key,uploadId).abort();
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
