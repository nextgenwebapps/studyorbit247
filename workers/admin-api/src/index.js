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
 const map=new Map(),codes=new Set();
 for(const item of data.questions){
  if(!item||typeof item.id!=="string"||!item.id.trim()||codes.has(item.id))return null;
  const stableId=typeof item.recordId==="string"&&item.recordId.trim()?item.recordId:item.id;
  if(map.has(stableId))return null;
  map.set(stableId,item);codes.add(item.id);
 }
 return map;
}
function validateQuestionBank(data){
 const issues=[];
 const map=questionMap(data);
 if(!Array.isArray(data?.questions))return {map:null,duplicates:0,issues:["Missing top-level questions array."]};
 if(!map)issues.push("Question IDs are missing or duplicated.");
 const seen=new Set();let duplicates=0;
 for(const [index,item] of data.questions.entries()){
  const text=String(item.prompt??item.question?.en??item.question??item.text??"").normalize("NFKC").trim().toLowerCase().replace(/\s+/g," ");
  if(!text)issues.push("Question "+(index+1)+" has no prompt.");
  if(text&&seen.has(text))duplicates++;else if(text)seen.add(text);
  const type=String(item.type||"").toLowerCase();
  if(type==="mcq"||type==="single_mcq"||type==="multiple_mcq"){
   if(!Array.isArray(item.options)||item.options.length<2)issues.push("Question "+(index+1)+" has fewer than two options.");
   const answer=item.correct??item.answer;
   if(answer==null||answer==="")issues.push("Question "+(index+1)+" has no correct answer.");
   else if(Array.isArray(item.options)&&item.options.every(x=>typeof x==="string")&&typeof answer==="string"&&!item.options.includes(answer))issues.push("Question "+(index+1)+" answer is not one of its options.");
  }
 }
 if(duplicates)issues.push(duplicates+" exact duplicate prompt(s) found.");
 return {map,duplicates,issues};
}
function changesBetween(before,after){
 const changes=[];
 if(after)for(const [id,item] of after){
  if(!before||!before.has(id))changes.push({id,questionCode:item.id,action:"created",before:null,after:item});
  else if(JSON.stringify(before.get(id))!==JSON.stringify(item))changes.push({id,questionCode:item.id,action:"updated",before:before.get(id),after:item});
 }
 if(before)for(const [id,item] of before)if(!after||!after.has(id))changes.push({id,questionCode:item.id,action:"removed",before:item,after:null});
 return changes;
}
async function recordQuestionChanges(env,changes,key,uploadId,actor,changedAt){
 for(let offset=0;offset<changes.length;offset+=100){
  const batch=changes.slice(offset,offset+100).map(item=>env.DB.prepare(
   "INSERT INTO question_change_log (id,question_id,question_code,action,object_key,upload_id,changed_by,changed_at,before_json,after_json) VALUES (?,?,?,?,?,?,?,?,?,?)"
  ).bind(crypto.randomUUID(),item.id,item.questionCode,item.action,key,uploadId,actor,changedAt,item.before?JSON.stringify(item.before):null,item.after?JSON.stringify(item.after):null));
  if(batch.length)await env.DB.batch(batch);
 }
}

function same(a,b){if(typeof a!=="string"||typeof b!=="string")return false;const x=new TextEncoder().encode(a),y=new TextEncoder().encode(b);let diff=x.length^y.length;for(let i=0;i<Math.max(x.length,y.length);i++)diff|=(x[i]||0)^(y[i]||0);return diff===0}
const ownerEmail=env=>String(env.ADMIN_EMAIL||"").trim().toLowerCase();
function isOwner(email,env){return String(email||"").trim().toLowerCase()===ownerEmail(env)}
async function passwordHash(password,saltText){
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveBits"]);
 const bits=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:fromB64url(saltText),iterations:210000},key,256);
 return b64url(bits);
}
async function getAccess(email,env){
 if(isOwner(email,env))return {isOwner:true,permissions:["*"],roles:["owner"],jobTitle:"Owner / Founder"};
 const user=await env.DB.prepare("SELECT u.id,u.email,u.display_name,j.title AS job_title FROM admin_users u JOIN admin_job_titles j ON j.code=u.job_title_code WHERE lower(u.email)=lower(?) AND u.is_active=1").bind(email).first();
 if(!user)return null;
 const {results=[]}=await env.DB.prepare("SELECT DISTINCT r.code AS role,p.code AS permission FROM admin_user_roles ur JOIN admin_access_roles r ON r.id=ur.role_id AND r.is_active=1 JOIN admin_role_permissions rp ON rp.role_id=r.id JOIN admin_permissions p ON p.code=rp.permission_code WHERE ur.user_id=?").bind(user.id).all();
 return {isOwner:false,userId:user.id,permissions:[...new Set(results.map(x=>x.permission))],roles:[...new Set(results.map(x=>x.role))],jobTitle:user.job_title,displayName:user.display_name};
}
function has(access,permission){return Boolean(access&&(access.permissions.includes("*")||access.permissions.includes(permission)))}
async function auditTeam(env,actor,action,id,email,details={}){
 await env.DB.prepare("INSERT INTO admin_audit_log (id,actor_email,action,target_user_id,target_email,details_json,created_at) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(),actor,action,id||null,email||null,JSON.stringify(details),new Date().toISOString()).run();
}
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
  const body=await readBody(request),email=String(body?.email||"").trim().toLowerCase(),password=String(body?.password||"");
  if(!body||!env.SESSION_SECRET)return json({error:"Admin authentication is not configured."},503);
  let valid=false,canonicalEmail=email;
  if(isOwner(email,env))valid=Boolean(env.ADMIN_PASSWORD&&same(password,env.ADMIN_PASSWORD)),canonicalEmail=env.ADMIN_EMAIL;
  else {
   const user=await env.DB.prepare("SELECT id,email,password_salt,password_hash FROM admin_users WHERE lower(email)=? AND is_active=1").bind(email).first();
   if(user){valid=same(await passwordHash(password,user.password_salt),user.password_hash);canonicalEmail=user.email;if(valid)await env.DB.prepare("UPDATE admin_users SET last_login_at=? WHERE id=?").bind(new Date().toISOString(),user.id).run();}
  }
  if(!valid)return json({error:"Email or password is incorrect."},401);
  const token=await issueSession(canonicalEmail,env);
  return json({ok:true,email:canonicalEmail},200,{"Set-Cookie":cookie(token,SESSION_SECONDS)});
 }
 if(path==="/api/admin/me"&&request.method==="GET"){
  const session=await getSession(request,env);if(!session)return json({error:"Authentication required."},401);
  const access=await getAccess(session.email,env);return access?json({ok:true,email:session.email,...access}):json({error:"Account is disabled or unavailable."},401);
 }
 if(path==="/api/admin/logout"&&request.method==="POST")return json({ok:true},200,{"Set-Cookie":cookie("",0)});
 const session=await getSession(request,env);if(!session)return json({error:"Authentication required."},401);
 const access=await getAccess(session.email,env);if(!access)return json({error:"Account is disabled or unavailable."},401);
 const teamPath=path==="/api/admin/team/options"||path==="/api/admin/team/users"||path.startsWith("/api/admin/team/users/");
 if(teamPath&&!has(access,"admin.team.manage"))return json({error:"You do not have permission to manage team accounts."},403);
 if(teamPath&&path==="/api/admin/team/options"&&request.method==="GET"){
  const [titles,roles]=await Promise.all([
   env.DB.prepare("SELECT code,title,hierarchy_level,category FROM admin_job_titles ORDER BY hierarchy_level,title").all(),
   env.DB.prepare("SELECT code,name,description FROM admin_access_roles WHERE is_active=1 ORDER BY hierarchy_rank,name").all()
  ]);
  return json({titles:titles.results||[],roles:roles.results||[]});
 }
 if(teamPath&&path==="/api/admin/team/users"&&request.method==="GET"){
  const {results=[]}=await env.DB.prepare("SELECT u.id,u.email,u.display_name,u.job_title_code,j.title AS job_title,u.is_active,u.created_at,u.last_login_at,group_concat(r.code, ',') AS role_codes,group_concat(r.name, ', ') AS role_names FROM admin_users u JOIN admin_job_titles j ON j.code=u.job_title_code LEFT JOIN admin_user_roles ur ON ur.user_id=u.id LEFT JOIN admin_access_roles r ON r.id=ur.role_id GROUP BY u.id ORDER BY u.created_at DESC").all();
  return json({users:results.map(u=>({...u,roles:u.role_codes?u.role_codes.split(","):[]}))});
 }
 if(teamPath&&path==="/api/admin/team/users"&&request.method==="POST"){
  const body=await readBody(request),displayName=String(body?.displayName||"").trim(),email=String(body?.email||"").trim().toLowerCase(),jobTitleCode=String(body?.jobTitleCode||""),roleCode=String(body?.roleCode||""),password=String(body?.password||"");
  if(displayName.length<2||displayName.length>100||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<12||password.length>256)return json({error:"Provide a valid name and email, and an initial password of at least 12 characters."},400);
  if(email===ownerEmail(env))return json({error:"Owner email already uses the Super Admin account."},409);
  const title=await env.DB.prepare("SELECT code FROM admin_job_titles WHERE code=?").bind(jobTitleCode).first();
  const role=await env.DB.prepare("SELECT id,code FROM admin_access_roles WHERE code=? AND is_active=1").bind(roleCode).first();
  if(!title||!role)return json({error:"Choose a listed job title and access role."},400);
  const existing=await env.DB.prepare("SELECT id FROM admin_users WHERE lower(email)=?").bind(email).first();if(existing)return json({error:"An account with this email already exists."},409);
  const id=crypto.randomUUID(),salt=b64url(crypto.getRandomValues(new Uint8Array(16))),hash=await passwordHash(password,salt),now=new Date().toISOString();
  await env.DB.batch([
   env.DB.prepare("INSERT INTO admin_users (id,email,display_name,job_title_code,password_salt,password_hash,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(id,email,displayName,jobTitleCode,salt,hash,session.email,now,now),
   env.DB.prepare("INSERT INTO admin_user_roles (user_id,role_id,assigned_by,assigned_at) VALUES (?,?,?,?)").bind(id,role.id,session.email,now),
   env.DB.prepare("INSERT INTO admin_audit_log (id,actor_email,action,target_user_id,target_email,details_json,created_at) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(),session.email,"staff_created",id,email,JSON.stringify({jobTitleCode,roleCode}),now)
  ]);
  return json({ok:true,id,email,displayName,jobTitleCode,roleCode,createdAt:now},201);
 }
 if(teamPath&&path.startsWith("/api/admin/team/users/")&&request.method==="PATCH"){
  const id=decodeURIComponent(path.slice("/api/admin/team/users/".length)),body=await readBody(request);
  const user=await env.DB.prepare("SELECT id,email FROM admin_users WHERE id=?").bind(id).first();if(!user)return json({error:"Staff account not found."},404);
  const now=new Date().toISOString();
  if(body?.action==="active"&&typeof body.active==="boolean"){
   await env.DB.prepare("UPDATE admin_users SET is_active=?,updated_at=? WHERE id=?").bind(body.active?1:0,now,id).run();
   await auditTeam(env,session.email,body.active?"staff_enabled":"staff_disabled",id,user.email);
  }else if(body?.action==="role"&&typeof body.roleCode==="string"){
   const role=await env.DB.prepare("SELECT id FROM admin_access_roles WHERE code=? AND is_active=1").bind(body.roleCode).first();if(!role)return json({error:"Choose an active access role."},400);
   await env.DB.batch([env.DB.prepare("DELETE FROM admin_user_roles WHERE user_id=?").bind(id),env.DB.prepare("INSERT INTO admin_user_roles (user_id,role_id,assigned_by,assigned_at) VALUES (?,?,?,?)").bind(id,role.id,session.email,now),env.DB.prepare("UPDATE admin_users SET updated_at=? WHERE id=?").bind(now,id)]);
   await auditTeam(env,session.email,"staff_role_changed",id,user.email,{roleCode:body.roleCode});
  }else if(body?.action==="password"&&typeof body.password==="string"&&body.password.length>=12&&body.password.length<=256){
   const salt=b64url(crypto.getRandomValues(new Uint8Array(16))),hash=await passwordHash(body.password,salt);
   await env.DB.prepare("UPDATE admin_users SET password_salt=?,password_hash=?,updated_at=? WHERE id=?").bind(salt,hash,now,id);
   await auditTeam(env,session.email,"staff_password_reset",id,user.email);
  }else return json({error:"Invalid staff account update."},400);
  return json({ok:true});
 }
 const required=path.startsWith("/api/admin/uploads/")?(path.endsWith("/history")?"audit.read":"r2.upload")
  :path==="/api/admin/taxonomy"?(request.method==="GET"?"question.read":"taxonomy.manage")
  :path==="/api/admin/questions/next-id"?"taxonomy.manage"
  :path==="/api/admin/questions/history"?"audit.read"
  :path==="/api/admin/questions/drafts"?(request.method==="GET"?"question.read":"question.write")
  :path==="/api/admin/questions/publish"?"question.review":null;
 if(required&&!has(access,required))return json({error:"You do not have permission to perform this action."},403);
 if(path.startsWith("/api/admin/uploads/")){
  if(!env.CONTENT_BUCKET)return json({error:"R2 content storage is not configured."},503);
  if(path==="/api/admin/uploads/history"&&request.method==="GET"){
    const limit=Math.min(100,Math.max(1,Number(url.searchParams.get("limit")||20)));
    const {results=[]}=await env.DB.prepare("SELECT upload_id,object_key,original_file_name,content_type,expected_size,actual_size,uploaded_by,status,question_count,added_count,updated_count,removed_count,duplicate_count,validation_issues_json,schema_version,bank_version,sha256,r2_etag,started_at,completed_at FROM content_uploads ORDER BY started_at DESC LIMIT ?").bind(limit).all();
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
   const validation=isQuestionJson?validateQuestionBank(currentData):{map:null,duplicates:0,issues:[]};
   const currentMap=validation.map;
   const changes=isQuestionJson&&currentMap?changesBetween(oldMap,currentMap):[];
   if(changes.length)await recordQuestionChanges(env,changes,key,uploadId,session.email,completedAt);
   const sha256=currentSnapshot.sha256;
   const addedCount=changes.filter(x=>x.action==="created").length;
   const updatedCount=changes.filter(x=>x.action==="updated").length;
   const removedCount=changes.filter(x=>x.action==="removed").length;
   const validQuestionJson=!isQuestionJson||currentMap!==null;
   const auditStatus=validQuestionJson?(validation.issues.length?"completed_with_issues":"completed"):"completed_unverified";
   await env.DB.prepare("UPDATE content_uploads SET status=?,actual_size=?,question_count=?,added_count=?,updated_count=?,removed_count=?,duplicate_count=?,validation_issues_json=?,schema_version=?,bank_version=?,sha256=?,r2_etag=?,completed_at=? WHERE upload_id=?").bind(auditStatus,object.size,isQuestionJson&&currentMap?currentMap.size:null,addedCount,updatedCount,removedCount,validation.duplicates,JSON.stringify(validation.issues),currentData&&currentData.schemaVersion!=null?String(currentData.schemaVersion):null,currentData&&currentData.bankVersion!=null?String(currentData.bankVersion):null,sha256,object.httpEtag,completedAt,uploadId).run();
   return json({ok:true,key,size:object.size,etag:object.httpEtag,uploadedBy:session.email,completedAt,status:auditStatus,questionCount:isQuestionJson&&currentMap?currentMap.size:null,changes:{added:addedCount,updated:updatedCount,removed:removedCount},duplicateCount:validation.duplicates,validationIssues:validation.issues,sha256});
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
 if(path==="/api/admin/taxonomy"&&request.method==="GET"){
  const {results=[]}=await env.DB.prepare("SELECT id,kind,parent_id,code,name_en,name_hi,is_active,created_at,created_by FROM question_taxonomy_nodes ORDER BY kind,parent_id,code").all();
  return json({taxonomy:results});
 }
 if(path==="/api/admin/taxonomy"&&request.method==="POST"){
  const body=await readBody(request);
  const kind=String(body?.kind||"");
  const code=String(body?.code||"").trim().toUpperCase();
  const nameEn=String(body?.nameEn||"").trim();
  const nameHi=String(body?.nameHi||"").trim();
  const requestedParentId=String(body?.parentId||"").trim();
  if(!["subject","chapter","topic"].includes(kind)||!/^[A-Z0-9]{2,8}$/.test(code)||!nameEn||nameEn.length>120||nameHi.length>120)return json({error:"Provide kind, a 2–8 character code and a valid English name."},400);
  let parentId=null;
  if(kind==="subject"&&requestedParentId)return json({error:"A subject cannot have a parent."},400);
  if(kind!=="subject"){
   const parentKind=kind==="chapter"?"subject":"chapter";
   const parent=await env.DB.prepare("SELECT id FROM question_taxonomy_nodes WHERE kind=? AND id=? AND is_active=1").bind(parentKind,requestedParentId).first();
   if(!parent)return json({error:"Choose an existing active "+parentKind+" code as parent."},400);
   parentId=parent.id;
  }
  const id=crypto.randomUUID(),createdAt=new Date().toISOString();
  await env.DB.prepare("INSERT INTO question_taxonomy_nodes (id,kind,parent_id,code,name_en,name_hi,created_at,created_by) VALUES (?,?,?,?,?,?,?,?)").bind(id,kind,parentId,code,nameEn,nameHi||null,createdAt,session.email).run();
  return json({ok:true,id,kind,code,parentId,nameEn,nameHi:nameHi||null,createdAt,createdBy:session.email},201);
 }
 if(path==="/api/admin/questions/next-id"&&request.method==="POST"){
  const body=await readBody(request);
  const subjectCode=String(body?.subjectCode||"").toUpperCase();
  const chapterCode=String(body?.chapterCode||"").toUpperCase();
  const topicCode=String(body?.topicCode||"").toUpperCase();
  const level=String(body?.level||"").toUpperCase();
  if(!["E","M","H"].includes(level))return json({error:"Level must be E, M or H."},400);
  const topic=await env.DB.prepare("SELECT s.code AS subject_code,c.code AS chapter_code,t.id AS topic_id,t.code AS topic_code FROM question_taxonomy_nodes s JOIN question_taxonomy_nodes c ON c.parent_id=s.id AND c.kind='chapter' JOIN question_taxonomy_nodes t ON t.parent_id=c.id AND t.kind='topic' WHERE s.kind='subject' AND s.code=? AND s.is_active=1 AND c.code=? AND c.is_active=1 AND t.code=? AND t.is_active=1").bind(subjectCode,chapterCode,topicCode).first();
  if(!topic)return json({error:"Subject, chapter or topic code is missing or mismatched."},400);
  const now=new Date().toISOString();
  const sequence=await env.DB.prepare("INSERT INTO question_topic_sequences (topic_id,last_number,updated_at) VALUES (?,1,?) ON CONFLICT(topic_id) DO UPDATE SET last_number=last_number+1,updated_at=excluded.updated_at WHERE last_number<999999 RETURNING last_number").bind(topic.topic_id,now).first();
  if(!sequence)return json({error:"This topic has reached its 999999 question ID limit."},409);
  const serial=String(sequence.last_number).padStart(6,"0");
  return json({recordId:crypto.randomUUID(),questionId:subjectCode+"-"+chapterCode+"-"+topicCode+"-"+level+"-"+serial,sequence:sequence.last_number,topicCode,level,createdAt:now,createdBy:session.email},201);
 }
 if(path==="/api/admin/questions/history"&&request.method==="GET"){
  const questionId=url.searchParams.get("questionId");
  const limit=Math.min(100,Math.max(1,Number(url.searchParams.get("limit")||20)));
  const query=questionId
   ?env.DB.prepare("SELECT id,question_id,question_code,action,object_key,upload_id,changed_by,changed_at,before_json,after_json FROM question_change_log WHERE question_id=? ORDER BY changed_at DESC LIMIT ?").bind(questionId,limit)
   :env.DB.prepare("SELECT id,question_id,question_code,action,object_key,upload_id,changed_by,changed_at,before_json,after_json FROM question_change_log ORDER BY changed_at DESC LIMIT ?").bind(limit);
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
