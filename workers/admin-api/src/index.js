const COOKIE="so_admin_session";
const SESSION_SECONDS=60*60*8;
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...headers}});
const cors=(request,env)=>{const origin=request.headers.get("Origin")||"";const allowed=env.ADMIN_ORIGIN||"";if(!allowed||origin!==allowed)return {};return {"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Credentials":"true","Access-Control-Allow-Headers":"Content-Type","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Vary":"Origin"};};
const b64url=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const fromB64url=s=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")+"===".slice((s.length+3)%4)),c=>c.charCodeAt(0));
async function sign(value,secret){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return b64url(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(value)));}
async function issueSession(email,env){const payload=b64url(new TextEncoder().encode(JSON.stringify({email,exp:Math.floor(Date.now()/1000)+SESSION_SECONDS})));return payload+"."+await sign(payload,env.SESSION_SECRET);}
async function getSession(request,env){const raw=request.headers.get("Cookie")||"";const token=raw.split(";").map(x=>x.trim()).find(x=>x.startsWith(COOKIE+"="))?.slice(COOKIE.length+1);if(!token||!env.SESSION_SECRET)return null;const parts=token.split(".");if(parts.length!==2)return null;const [payload,signature]=parts;const expected=await sign(payload,env.SESSION_SECRET);if(signature!==expected)return null;try{const data=JSON.parse(new TextDecoder().decode(fromB64url(payload)));return data.exp>Date.now()/1000?data:null}catch{return null}}
const cookie=(value,maxAge)=>COOKIE+"="+value+"; Path=/api/admin; HttpOnly; Secure; SameSite=None; Max-Age="+maxAge;
const readBody=async request=>{try{return await request.json()}catch{return null}};
function same(a,b){if(typeof a!=="string"||typeof b!=="string")return false;const x=new TextEncoder().encode(a),y=new TextEncoder().encode(b);let diff=x.length^y.length;for(let i=0;i<Math.max(x.length,y.length);i++)diff|=(x[i]||0)^(y[i]||0);return diff===0}
async function route(request,env){
 const url=new URL(request.url),path=url.pathname.replace(/\/$/,"");
 if(request.method==="OPTIONS")return new Response(null,{status:204});
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
