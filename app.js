// Configuración: pega aquí los datos de tu proyecto Supabase.
const SUPABASE_URL = "https://rzxwpikeitiiurynkhzc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_lVRhW7VxFfztpXetK0Yxfw_Io-ja8VL";
const configured = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("PEGA_AQUI") && !SUPABASE_ANON_KEY.includes("PEGA_AQUI");
const db = configured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
let mode = "login", currentUser = null;

const $ = id => document.getElementById(id);
function say(id, msg){ $(id).textContent = msg; }
function escapeHtml(s){return String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function setMode(next){mode=next;$("loginTab").classList.toggle("active",mode==="login");$("signupTab").classList.toggle("active",mode==="signup");$("nameField").classList.toggle("hidden",mode!=="signup");$("authSubmit").textContent=mode==="login"?"Iniciar sesión":"Crear cuenta";say("authMessage","");}
$("loginTab").onclick=()=>setMode("login");$("signupTab").onclick=()=>setMode("signup");

async function refreshSession(){
  if(!db){say("authMessage","Para activar cuentas reales, primero configura Supabase siguiendo LEEME.txt.");return;}
  const {data:{session}}=await db.auth.getSession();currentUser=session?.user||null;updateView();if(currentUser)await loadWishes();
}
function updateView(){
  $("auth").classList.toggle("hidden",!!currentUser);$("account").classList.toggle("hidden",!currentUser);$("myRequests").classList.toggle("hidden",!currentUser);
  $("userBar").innerHTML=currentUser?`Sesión iniciada · ${escapeHtml(currentUser.user_metadata?.display_name||currentUser.email)} · <button id="logout" class="outline-btn">Salir</button>`:"";
  if(currentUser){$("helloName").textContent=currentUser.user_metadata?.display_name||"bienvenida/o";$("logout").onclick=async()=>{await db.auth.signOut();currentUser=null;updateView();$("wishFeed").innerHTML='<div class="empty">Inicia sesión para ver los deseos.</div>';};}
}
$("authForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!db){say("authMessage","Primero configura Supabase. Consulta LEEME.txt.");return;}
 const email=$("email").value.trim(),password=$("password").value;
 if(mode==="signup"){
  const name=$("displayName").value.trim();if(!name){say("authMessage","Escribe tu nombre o apodo.");return;}
  const {data,error}=await db.auth.signUp({email,password,options:{data:{display_name:name}}});
  if(error){say("authMessage",error.message);return;}
  say("authMessage",data.session?"¡Cuenta creada!":"Revisa tu correo para confirmar tu cuenta.");if(data.session){currentUser=data.user;updateView();await loadWishes();}
 }else{
  const {data,error}=await db.auth.signInWithPassword({email,password});if(error){say("authMessage",error.message);return;}currentUser=data.user;updateView();await loadWishes();
 }
});
$("wishForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!currentUser||!db)return;
 const {error}=await db.from("wishes").insert({user_id:currentUser.id,title:$("wishTitle").value.trim(),category:$("wishCategory").value,description:$("wishDescription").value.trim()});
 say("wishMessage",error?error.message:"Tu deseo fue publicado.");if(!error){e.target.reset();await loadWishes();}
});
async function loadWishes(){
 const {data,error}=await db.from("wishes").select("id,user_id,title,category,description,status,created_at").order("created_at",{ascending:false});
 if(error){$("wishFeed").innerHTML=`<div class="empty">${escapeHtml(error.message)}</div>`;return;}
 if(!data.length){$("wishFeed").innerHTML='<div class="empty">Todavía no hay deseos publicados. ¡Puedes iniciar la comunidad!</div>';return;}
 $("wishFeed").innerHTML=data.map(w=>`<article class="wish-card"><span class="pill">${escapeHtml(w.category)}</span><h3>${escapeHtml(w.title)}</h3><p>${escapeHtml(w.description||"Sin detalles adicionales.")}</p><div class="wish-meta">${w.status==="fulfilled"?"✓ Deseo cumplido":"Deseo pendiente"} · ${new Date(w.created_at).toLocaleDateString("es-MX")}</div><div class="wish-actions">${w.status==="fulfilled"?"":w.user_id===currentUser.id?`<button onclick="confirmFulfilled('${w.id}')">Confirmar que lo recibí</button>`:`<button onclick="offerHelp('${w.id}')" ${!currentUser?"disabled":""}>Quiero ayudar</button>`}</div></article>`).join("");
 await loadMyRequests();
}
window.offerHelp=async id=>{
 const {error}=await db.from("help_requests").insert({wish_id:id,helper_id:currentUser.id});
 alert(error?(error.code==="23505"?"Ya enviaste una solicitud para este deseo.":error.message):"Tu interés fue enviado. La persona podrá revisar tu solicitud desde su cuenta.");
};
window.confirmFulfilled=async id=>{
 if(!confirm("¿Confirmas que recibiste el objeto y que tu deseo se cumplió?"))return;
 const {error}=await db.from("wishes").update({status:"fulfilled"}).eq("id",id).eq("user_id",currentUser.id);
 alert(error?error.message:"¡Qué alegría! El deseo quedó marcado como cumplido.");await loadWishes();
};
async function loadMyRequests(){
 const {data,error}=await db.from("help_requests").select("id,status,created_at,wishes!inner(id,title,user_id)").eq("wishes.user_id",currentUser.id).order("created_at",{ascending:false});
 if(error){$("requestsFeed").innerHTML=`<div class="empty">${escapeHtml(error.message)}</div>`;return;}
 $("requestsFeed").innerHTML=data.length?data.map(r=>`<article class="wish-card"><span class="pill">Solicitud de ayuda</span><h3>${escapeHtml(r.wishes.title)}</h3><p>Una persona de la comunidad quiere ayudarte. Estado: ${escapeHtml(r.status)}.</p></article>`).join(""):'<div class="empty">Aún no hay solicitudes para tus deseos.</div>';
}
$("refresh").onclick=()=>currentUser?loadWishes():say("authMessage","Inicia sesión para cargar los deseos.");
if(db){db.auth.onAuthStateChange((_event,session)=>{currentUser=session?.user||null;updateView();if(currentUser)loadWishes();});refreshSession();}
else{$("wishFeed").innerHTML='<div class="empty">La página está lista para conectar. Configura tu proyecto Supabase siguiendo LEEME.txt para activar usuarios y deseos compartidos.</div>';}
