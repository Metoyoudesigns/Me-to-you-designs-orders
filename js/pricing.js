import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL="https://critutqwakaepgxgpkml.supabase.co";
const SUPABASE_KEY="sb_publishable_KtXAtIRgtZADPODLn7inRw_vC6rBPFb";
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
const money=n=>`£${(Number(n)||0).toFixed(2)}`;
const n=v=>Number.isFinite(Number(v))?Number(v):0;
let session=null, materials=[], savedPrices=[];
let hourlyRate=12;

function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function msg(text,type="success"){const x=$("message");x.textContent=text;x.className=`message show ${type}`;clearTimeout(msg.t);msg.t=setTimeout(()=>x.className="message",3500);}
function openMenu(){$("sideMenu").classList.add("active");$("overlay").classList.add("active")}
function closeMenu(){$("sideMenu").classList.remove("active");$("overlay").classList.remove("active")}
$("menuButton").onclick=openMenu;$("overlay").onclick=closeMenu;
$("logoutButton").onclick=async e=>{e.preventDefault();await supabase.auth.signOut();location.href="index.html"};

async function login(){
 const {data,error}=await supabase.auth.getSession();
 if(error||!data.session){location.href="index.html";return false}
 session=data.session;return true;
}

document.querySelectorAll(".mainTab").forEach(b=>b.onclick=()=>{
 document.querySelectorAll(".mainTab").forEach(x=>x.classList.remove("active"));
 document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));
 b.classList.add("active");$(b.dataset.screen).classList.add("active");
 if(b.dataset.screen==="materialsScreen")renderMaterials();
 if(b.dataset.screen==="savedScreen")renderSaved();
});

async function loadSettings(){
 const {data}=await supabase.from("pricing_settings").select("*").eq("user_id",session.user.id).maybeSingle();
 if(data)hourlyRate=n(data.hourly_rate)||12;
 $("hourlyRate").value=hourlyRate;
}

function unitCost(m){return n(m.pack_price)/Math.max(n(m.pack_quantity),.000001)}

async function loadMaterials(){
 const {data,error}=await supabase.from("pricing_materials").select("*").eq("user_id",session.user.id).order("name");
 if(error){msg(error.message,"error");return}
 materials=data||[];renderMaterials();refreshSelects();
}
function renderMaterials(){
 const q=($("materialSearch").value||"").toLowerCase();
 const rows=materials.filter(m=>`${m.name} ${m.category} ${m.supplier||""}`.toLowerCase().includes(q));
 const box=$("materialsList");
 if(!rows.length){box.innerHTML='<div class="empty">No materials yet.<br><br>Tap ＋ Add and enter what you paid and how many you got.</div>';return}
 box.innerHTML=rows.map(m=>`<div class="savedItem">
 <div><h3>${esc(m.name)}</h3><p>${esc(m.category)}${m.supplier?` • ${esc(m.supplier)}`:""} • ${money(unitCost(m))} per ${esc(m.unit)}</p></div>
 <div class="itemActions"><strong>${money(unitCost(m))}</strong><button class="iconBtn" data-edit="${m.id}">✏️</button><button class="iconBtn" data-del="${m.id}">🗑️</button></div>
 </div>`).join("");
 box.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openMaterial(b.dataset.edit));
 box.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>deleteMaterial(b.dataset.del));
}
$("materialSearch").oninput=renderMaterials;

function refreshSelects(){
 document.querySelectorAll(".materialSelect").forEach(s=>{
  const old=s.value;
  s.innerHTML='<option value="">Choose material...</option>'+materials.map(m=>`<option value="${m.id}">${esc(m.name)} — ${money(unitCost(m))}/${esc(m.unit)}</option>`).join("");
  s.value=old;
 });
 calculate();
}
function addLine(materialId=""){
 const row=document.createElement("div");row.className="calcLine";
 row.innerHTML=`<select class="materialSelect"><option value="">Choose material...</option></select>
 <input class="calcQty" type="number" min="0" step="0.01" value="1">
 <div class="lineCost">£0.00</div><button class="removeLine">×</button>`;
 $("calcLines").appendChild(row);refreshSelects();
 if(materialId)row.querySelector(".materialSelect").value=materialId;
 row.querySelector(".materialSelect").onchange=calculate;row.querySelector(".calcQty").oninput=calculate;
 row.querySelector(".removeLine").onclick=()=>{row.remove();calculate()};
 calculate();
}
$("addLineBtn").onclick=()=>addLine();

function calculation(){
 let materialTotal=0;
 const rows=[...document.querySelectorAll(".calcLine")].map(r=>{
  const id=r.querySelector(".materialSelect").value,qty=n(r.querySelector(".calcQty").value),m=materials.find(x=>String(x.id)===String(id));
  const cost=m?unitCost(m)*qty:0;materialTotal+=cost;
  r.querySelector(".lineCost").textContent=money(cost);
  return m?{material_id:m.id,name:m.name,qty,cost}:null;
 }).filter(Boolean);
 const waste=materialTotal*(n($("waste").value)/100);
 const labour=n($("minutes").value)/60*n($("hourlyRate").value);
 const extras=n($("extras").value);
 const total=materialTotal+waste+labour+extras;
 // Simple guidance: minimum covers cost + 15%; suggested targets a 40% margin;
 // premium adds 15% to suggested. These are starting points, not a mandatory price.
 const minimum=Math.max(total*1.15,total+5);
 const suggested=total>0?total/(1-.40):0;
 const premium=suggested*1.15;
 const charge=n($("chargePrice").value),profit=charge-total,margin=charge?profit/charge*100:0;
 return {rows,materialTotal,waste,labour,extras,total,minimum,suggested,premium,charge,profit,margin};
}
function calculate(){
 const c=calculation();
 $("materialsCost").textContent=money(c.materialTotal);$("wasteCost").textContent=money(c.waste);
 $("labourCost").textContent=money(c.labour);$("extrasCost").textContent=money(c.extras);$("trueCost").textContent=money(c.total);
 $("minimumPrice").textContent=money(c.minimum);$("suggestedPrice").textContent=money(c.suggested);$("premiumPrice").textContent=money(c.premium);
 $("profit").textContent=money(c.profit);$("margin").textContent=`${c.margin.toFixed(1)}%`;
 const pm=$("pricingMessage");
 if(!c.charge){pm.textContent="Enter the price you are thinking of charging to see your actual profit.";pm.className="pricingMessage"}
 else if(c.charge<c.minimum){pm.textContent=`⚠️ That is below the suggested minimum. Your costs are ${money(c.total)}.`;pm.className="pricingMessage warning"}
 else if(c.charge<c.suggested){pm.textContent=`💡 You can charge that, but it's below the suggested price of ${money(c.suggested)}.`;pm.className="pricingMessage warning"}
 else{pm.textContent=`❤️ At ${money(c.charge)} you'd make ${money(c.profit)} after your estimated costs.`;pm.className="pricingMessage good"}
 return c;
}
document.querySelectorAll("#calculatorScreen input").forEach(x=>x.addEventListener("input",calculate));

function clearCalc(){
 $("jobName").value="";$("calcLines").innerHTML="";$("minutes").value=0;$("hourlyRate").value=hourlyRate;$("extras").value=0;$("waste").value=0;$("chargePrice").value="";addLine();calculate();
}
$("clearCalcBtn").onclick=clearCalc;

function open(id){$(id).classList.add("active");$(id).setAttribute("aria-hidden","false")}
function close(id){$(id).classList.remove("active");$(id).setAttribute("aria-hidden","true")}
document.querySelectorAll("[data-close]").forEach(x=>x.onclick=()=>close(x.dataset.close));

function unitLabel(){const u=$("materialUnit").value;return u==="each"?"items":u}
$("materialUnit").onchange=()=>{$("qtyUnitLabel").textContent=unitLabel();$("resultUnit").textContent=$("materialUnit").value;unitPreview()};
function unitPreview(){$("unitCost").textContent=money(n($("packPrice").value)/Math.max(n($("packQty").value),.000001))}
$("packPrice").oninput=unitPreview;$("packQty").oninput=unitPreview;

function openMaterial(id=null){
 const m=id?materials.find(x=>String(x.id)===String(id)):null;
 $("materialModalTitle").textContent=m?"Edit Material":"Add Material";$("editMaterialId").value=m?.id||"";
 $("materialName").value=m?.name||"";$("packPrice").value=m?.pack_price??"";$("packQty").value=m?.pack_quantity??"";
 $("materialUnit").value=m?.unit||"each";$("materialCategory").value=m?.category||"Other";$("supplier").value=m?.supplier||"";
 $("qtyUnitLabel").textContent=unitLabel();$("resultUnit").textContent=$("materialUnit").value;unitPreview();open("materialModal");
}
$("addMaterialBtn").onclick=()=>openMaterial();

async function saveMaterial(){
 const name=$("materialName").value.trim(),price=n($("packPrice").value),qty=n($("packQty").value);
 if(!name||price<=0||qty<=0){msg("Please enter the material name, what you paid and how many you got.","error");return}
 const payload={user_id:session.user.id,name,pack_price:price,pack_quantity:qty,unit:$("materialUnit").value,category:$("materialCategory").value,supplier:$("supplier").value.trim(),updated_at:new Date().toISOString()};
 const id=$("editMaterialId").value;
 const result=id?await supabase.from("pricing_materials").update(payload).eq("id",id).eq("user_id",session.user.id):await supabase.from("pricing_materials").insert(payload);
 if(result.error){msg(result.error.message,"error");return}
 close("materialModal");await loadMaterials();msg(id?"Material updated.":"Material saved.");
}
$("saveMaterialBtn").onclick=saveMaterial;

async function deleteMaterial(id){
 if(!confirm("Delete this material?"))return;
 const {error}=await supabase.from("pricing_materials").delete().eq("id",id).eq("user_id",session.user.id);
 if(error){msg(error.message,"error");return}
 await loadMaterials();msg("Material deleted.");
}

function openSavePrice(){if(!$("jobName").value.trim()){msg("Give the job a name first.","error");return}open("savePriceModal");$("savedPriceName").value=$("jobName").value.trim()}
$("savePriceBtn").onclick=openSavePrice;

async function confirmSave(){
 const name=$("savedPriceName").value.trim();if(!name){msg("Give the saved price a name.","error");return}
 const c=calculate();
 const payload={user_id:session.user.id,name,category:"custom",calculator_data:{materials:c.rows.map(x=>({material_id:x.material_id,qty:x.qty})),minutes:n($("minutes").value),hourly_rate:n($("hourlyRate").value),extras:n($("extras").value),waste:n($("waste").value)}};
 const {error}=await supabase.from("pricing_templates").insert(payload);
 if(error){msg(error.message,"error");return}
 close("savePriceModal");await loadSaved();msg("Saved price added.");
}
$("confirmSavePrice").onclick=confirmSave;

async function loadSaved(){
 const {data,error}=await supabase.from("pricing_templates").select("*").eq("user_id",session.user.id).order("name");
 if(error){msg(error.message,"error");return}savedPrices=data||[];renderSaved();
}
function renderSaved(){
 const q=($("savedSearch").value||"").toLowerCase(),box=$("savedList");
 const rows=savedPrices.filter(x=>x.name.toLowerCase().includes(q));
 if(!rows.length){box.innerHTML='<div class="empty">No saved prices yet.<br><br>Work out a price, then tap “Save This Price”.</div>';return}
 box.innerHTML=rows.map(x=>`<div class="savedItem"><div><h3>${esc(x.name)}</h3><p>Saved pricing setup</p></div><div class="itemActions"><button class="iconBtn" data-load="${x.id}">▶️</button><button class="iconBtn" data-remove="${x.id}">🗑️</button></div></div>`).join("");
 box.querySelectorAll("[data-load]").forEach(b=>b.onclick=()=>loadSavedPrice(b.dataset.load));
 box.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>deleteSaved(b.dataset.remove));
}
$("savedSearch").oninput=renderSaved;

function loadSavedPrice(id){
 const x=savedPrices.find(s=>String(s.id)===String(id));if(!x)return;
 const d=x.calculator_data||{};$("jobName").value=x.name;$("minutes").value=d.minutes||0;$("hourlyRate").value=d.hourly_rate||hourlyRate;$("extras").value=d.extras||0;$("waste").value=d.waste||0;$("chargePrice").value="";
 $("calcLines").innerHTML="";const rows=d.materials||[];rows.forEach(r=>addLine(r.material_id));if(!rows.length)addLine();
 document.querySelector('[data-screen="calculatorScreen"]').click();calculate();msg("Saved price loaded into the calculator.");
}
async function deleteSaved(id){
 if(!confirm("Delete this saved price?"))return;
 const {error}=await supabase.from("pricing_templates").delete().eq("id",id).eq("user_id",session.user.id);
 if(error){msg(error.message,"error");return}await loadSaved();msg("Saved price deleted.");
}

(async()=>{
 if(!(await login()))return;
 await loadSettings();await loadMaterials();await loadSaved();clearCalc();
})();
