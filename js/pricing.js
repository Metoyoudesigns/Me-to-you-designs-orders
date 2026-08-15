import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://critutqwakaepgxgpkml.supabase.co";
const SUPABASE_KEY = "sb_publishable_KtXAtIRgtZADPODLn7inRw_vC6rBPFb";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = id => document.getElementById(id);
let session = null;
let materials = [];
let templates = [];
let settings = { hourly_rate: 12, waste_percent: 5, profit_margin: 45, minimum_profit: 5, packaging_cost: 0 };

const money = n => `£${(Number(n)||0).toFixed(2)}`;
const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

function showMessage(text, type="success"){
    const el = $("message"); if(!el) return;
    el.textContent = text; el.className = `message show ${type}`;
    clearTimeout(showMessage.timer); showMessage.timer = setTimeout(()=>el.className="message",3500);
}

function openMenu(){ $("sideMenu")?.classList.add("active"); $("overlay")?.classList.add("active"); }
function closeMenu(){ $("sideMenu")?.classList.remove("active"); $("overlay")?.classList.remove("active"); }
$("menuButton")?.addEventListener("click", openMenu);
$("overlay")?.addEventListener("click", closeMenu);
$("logoutButton")?.addEventListener("click", async e => { e.preventDefault(); await supabase.auth.signOut(); location.href="index.html"; });

async function requireLogin(){
    const {data,error}=await supabase.auth.getSession();
    if(error || !data.session){ location.href="index.html"; return false; }
    session=data.session; return true;
}

document.querySelectorAll(".tab").forEach(btn=>{
    btn.addEventListener("click",()=>{
        document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
        document.querySelectorAll(".tabPanel").forEach(x=>x.classList.remove("active"));
        btn.classList.add("active"); $(`${btn.dataset.tab}Tab`).classList.add("active");
        if(btn.dataset.tab==="materials") renderMaterials();
        if(btn.dataset.tab==="templates") renderTemplates();
    });
});

function updateSettingsInputs(){
    $("hourlyRate").value=settings.hourly_rate;
    $("wastePercent").value=settings.waste_percent;
    $("profitMargin").value=settings.profit_margin;
    $("packagingCost").value=settings.packaging_cost;
    $("settingHourlyRate").value=settings.hourly_rate;
    $("settingWaste").value=settings.waste_percent;
    $("settingMargin").value=settings.profit_margin;
    $("settingMinProfit").value=settings.minimum_profit;
    $("settingPackaging").value=settings.packaging_cost;
}

async function loadSettings(){
    const {data,error}=await supabase.from("pricing_settings").select("*").eq("user_id",session.user.id).maybeSingle();
    if(error){ showMessage(error.message,"error"); return; }
    if(data) settings={...settings,...data};
    updateSettingsInputs();
}

async function saveSettings(){
    const payload={
        user_id:session.user.id,
        hourly_rate:num($("settingHourlyRate").value),
        waste_percent:num($("settingWaste").value),
        profit_margin:num($("settingMargin").value),
        minimum_profit:num($("settingMinProfit").value),
        packaging_cost:num($("settingPackaging").value),
        updated_at:new Date().toISOString()
    };
    const {error}=await supabase.from("pricing_settings").upsert(payload,{onConflict:"user_id"});
    if(error){showMessage(error.message,"error");return;}
    settings={...settings,...payload}; updateSettingsInputs(); calculate(); showMessage("Pricing settings saved.");
}
$("saveSettings")?.addEventListener("click",saveSettings);

async function loadMaterials(){
    const {data,error}=await supabase.from("pricing_materials").select("*").eq("user_id",session.user.id).order("name");
    if(error){showMessage(error.message,"error");return;}
    materials=data||[]; renderMaterials(); refreshMaterialSelects();
}
function unitCost(m){return num(m.pack_price)/Math.max(num(m.pack_quantity),0.000001);}
function renderMaterials(){
    const list=$("materialsList"); if(!list)return;
    const q=($("materialSearch")?.value||"").toLowerCase().trim();
    const rows=materials.filter(m=>`${m.name} ${m.category} ${m.supplier||""}`.toLowerCase().includes(q));
    if(!rows.length){list.innerHTML='<div class="empty">No materials saved yet.<br>Tap ＋ Add to create your first one.</div>';return;}
    list.innerHTML=rows.map(m=>`
      <div class="savedItem">
        <div><h3>${escapeHtml(m.name)}</h3><p>${escapeHtml(m.category)}${m.supplier?` • ${escapeHtml(m.supplier)}`:""} • ${money(unitCost(m))} per ${escapeHtml(m.unit)}</p></div>
        <div class="itemActions"><button class="iconBtn" data-edit-material="${m.id}">✏️</button><button class="iconBtn" data-delete-material="${m.id}">🗑️</button></div>
      </div>`).join("");
    list.querySelectorAll("[data-edit-material]").forEach(b=>b.onclick=()=>openMaterial(b.dataset.editMaterial));
    list.querySelectorAll("[data-delete-material]").forEach(b=>b.onclick=()=>deleteMaterial(b.dataset.deleteMaterial));
}
$("materialSearch")?.addEventListener("input",renderMaterials);

function refreshMaterialSelects(){
    document.querySelectorAll(".materialSelect").forEach(sel=>{
        const current=sel.value;
        sel.innerHTML='<option value="">Choose material...</option>'+materials.map(m=>`<option value="${m.id}">${escapeHtml(m.name)} — ${money(unitCost(m))}/${escapeHtml(m.unit)}</option>`).join("");
        sel.value=current;
    });
    calculate();
}
function addMaterialLine(materialId=""){
    const wrap=$("calcMaterials");
    const row=document.createElement("div"); row.className="materialLine";
    row.innerHTML=`
      <select class="materialSelect"><option value="">Choose material...</option></select>
      <input class="materialQty" type="number" min="0" step="0.01" value="1" title="Quantity">
      <div class="lineCost">£0.00</div>
      <button class="removeLine" type="button">×</button>`;
    wrap.appendChild(row); refreshMaterialSelects();
    if(materialId) row.querySelector(".materialSelect").value=materialId;
    row.querySelectorAll("select,input").forEach(x=>x.addEventListener("input",calculate));
    row.querySelector(".removeLine").onclick=()=>{row.remove();calculate();};
    calculate();
}
$("addMaterialLine")?.addEventListener("click",()=>addMaterialLine());

function getMaterialRows(){
    return [...document.querySelectorAll(".materialLine")].map(row=>{
        const id=row.querySelector(".materialSelect")?.value;
        const qty=num(row.querySelector(".materialQty")?.value);
        const material=materials.find(m=>String(m.id)===String(id));
        return material?{id:material.id,name:material.name,unit:material.unit,qty,cost:unitCost(material)*qty}:null;
    }).filter(Boolean);
}

function calculate(){
    const rows=getMaterialRows();
    const baseMaterials=rows.reduce((s,x)=>s+x.cost,0);
    const waste=baseMaterials*(num($("wastePercent")?.value)/100);
    const labour=num($("labourMinutes")?.value)/60*num($("hourlyRate")?.value);
    const other=num($("packagingCost")?.value)+num($("otherCost")?.value);
    const cost=baseMaterials+waste+labour+other;
    const margin=Math.min(95,Math.max(0,num($("profitMargin")?.value)));
    const recommended=cost/(1-margin/100);
    const minimum=Math.max(cost+num(settings.minimum_profit),cost*1.15);
    const premium=recommended*1.15;
    $("resultMaterials").textContent=money(baseMaterials);
    $("resultWaste").textContent=money(waste);
    $("resultLabour").textContent=money(labour);
    $("resultOther").textContent=money(other);
    $("resultCost").textContent=money(cost);
    $("resultRecommended").textContent=money(recommended);
    $("resultMinimum").textContent=money(minimum);
    $("resultRecommended2").textContent=money(recommended);
    $("resultPremium").textContent=money(premium);
    const charge=num($("customerPrice")?.value);
    const profit=charge-cost;
    const chargeMargin=charge>0?(profit/charge*100):0;
    $("chargeProfit").textContent=money(profit);
    $("chargeMargin").textContent=`${chargeMargin.toFixed(1)}%`;
    const warning=$("underchargeWarning");
    if(charge>0 && charge<minimum){
        warning.classList.remove("hidden");
        warning.textContent=`⚠️ You're below your suggested minimum. Your cost is ${money(cost)} and your suggested minimum is ${money(minimum)}.`;
    }else if(charge>0 && charge<recommended){
        warning.classList.remove("hidden");
        warning.textContent=`💡 You could be undercharging. Your recommended price is ${money(recommended)}.`;
    }else{
        warning.classList.add("hidden"); warning.textContent="";
    }
    document.querySelectorAll(".materialLine").forEach(row=>{
        const id=row.querySelector(".materialSelect")?.value, qty=num(row.querySelector(".materialQty")?.value);
        const m=materials.find(x=>String(x.id)===String(id));
        if(row.querySelector(".lineCost")) row.querySelector(".lineCost").textContent=money(m?unitCost(m)*qty:0);
    });
    return {rows,baseMaterials,waste,labour,other,cost,recommended,minimum,premium,charge,profit,chargeMargin};
}
document.querySelectorAll("#calculatorTab input,#calculatorTab select").forEach(x=>x.addEventListener("input",calculate));
$("customerPrice")?.addEventListener("input",calculate);

function resetCalculator(){
    $("calcName").value=""; $("calcCategory").value="custom"; $("calcMaterials").innerHTML="";
    $("packagingCost").value=settings.packaging_cost; $("otherCost").value=0; $("labourMinutes").value=0;
    $("hourlyRate").value=settings.hourly_rate; $("wastePercent").value=settings.waste_percent; $("profitMargin").value=settings.profit_margin;
    $("customerPrice").value=""; addMaterialLine(); calculate();
}
$("clearCalculator")?.addEventListener("click",resetCalculator);

async function saveCalculation(){
    const c=calculate();
    if(!$("calcName").value.trim()){showMessage("Give this calculation a name first.","error");$("calcName").focus();return;}
    const payload={
        user_id:session.user.id,name:$("calcName").value.trim(),category:$("calcCategory").value,
        materials:c.rows,packaging_cost:num($("packagingCost").value),other_cost:num($("otherCost").value),
        labour_minutes:num($("labourMinutes").value),hourly_rate:num($("hourlyRate").value),
        waste_percent:num($("wastePercent").value),profit_margin:num($("profitMargin").value),
        total_cost:c.cost,recommended_price:c.recommended,customer_price:c.charge,profit:c.profit,
        margin:c.chargeMargin
    };
    const {error}=await supabase.from("pricing_calculations").insert(payload);
    if(error){showMessage(error.message,"error");return;}
    showMessage("Calculation saved to your private pricing history.");
}
$("saveCalculation")?.addEventListener("click",saveCalculation);

function openModal(id){$(id)?.classList.add("active");$(id)?.setAttribute("aria-hidden","false");}
function closeModal(id){$(id)?.classList.remove("active");$(id)?.setAttribute("aria-hidden","true");}
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>closeModal(b.dataset.close)));

function openMaterial(id=null){
    const m=id?materials.find(x=>String(x.id)===String(id)):null;
    $("materialModalTitle").textContent=m?"Edit Material":"Add Material";
    $("materialId").value=m?.id||"";
    $("materialName").value=m?.name||"";
    $("materialCategory").value=m?.category||"other";
    $("materialPackPrice").value=m?.pack_price??"";
    $("materialPackQty").value=m?.pack_quantity??"";
    $("materialUnit").value=m?.unit||"each";
    $("materialSupplier").value=m?.supplier||"";
    updateUnitCost();openModal("materialModal");
}
function updateUnitCost(){$("materialUnitCost").textContent=money(num($("materialPackPrice").value)/Math.max(num($("materialPackQty").value),0.000001));}
$("materialPackPrice")?.addEventListener("input",updateUnitCost);$("materialPackQty")?.addEventListener("input",updateUnitCost);
$("addMaterial")?.addEventListener("click",()=>openMaterial());

async function saveMaterial(){
    const name=$("materialName").value.trim(), pack=num($("materialPackPrice").value), qty=num($("materialPackQty").value);
    if(!name||pack<=0||qty<=0){showMessage("Enter a material name, pack price and pack quantity.","error");return;}
    const payload={user_id:session.user.id,name,category:$("materialCategory").value,pack_price:pack,pack_quantity:qty,unit:$("materialUnit").value,supplier:$("materialSupplier").value.trim(),updated_at:new Date().toISOString()};
    const id=$("materialId").value;
    const result=id?await supabase.from("pricing_materials").update(payload).eq("id",id).eq("user_id",session.user.id):await supabase.from("pricing_materials").insert(payload);
    if(result.error){showMessage(result.error.message,"error");return;}
    closeModal("materialModal");await loadMaterials();showMessage(id?"Material updated.":"Material saved.");
}
$("saveMaterial")?.addEventListener("click",saveMaterial);

async function deleteMaterial(id){
    if(!confirm("Delete this material?"))return;
    const {error}=await supabase.from("pricing_materials").delete().eq("id",id).eq("user_id",session.user.id);
    if(error){showMessage(error.message,"error");return;}
    await loadMaterials();showMessage("Material deleted.");
}

async function loadTemplates(){
    const {data,error}=await supabase.from("pricing_templates").select("*").eq("user_id",session.user.id).order("name");
    if(error){showMessage(error.message,"error");return;}
    templates=data||[];renderTemplates();
}
function renderTemplates(){
    const list=$("templatesList");if(!list)return;
    if(!templates.length){list.innerHTML='<div class="empty">No saved templates yet.<br>Use ＋ New to create one.</div>';return;}
    list.innerHTML=templates.map(t=>`<div class="savedItem"><div><h3>${escapeHtml(t.name)}</h3><p>${escapeHtml(t.category)} • Saved template</p></div><div class="itemActions"><button class="iconBtn" data-use-template="${t.id}">▶️</button><button class="iconBtn" data-delete-template="${t.id}">🗑️</button></div></div>`).join("");
    list.querySelectorAll("[data-use-template]").forEach(b=>b.onclick=()=>useTemplate(b.dataset.useTemplate));
    list.querySelectorAll("[data-delete-template]").forEach(b=>b.onclick=()=>deleteTemplate(b.dataset.deleteTemplate));
}
$("newTemplate")?.addEventListener("click",()=>{ $("templateId").value="";$("templateName").value="";$("templateCategory").value="custom";$("templateModalTitle").textContent="New Price Template";openModal("templateModal");});

async function saveTemplate(){
    const name=$("templateName").value.trim();if(!name){showMessage("Give the template a name.","error");return;}
    const c=calculate();
    const payload={user_id:session.user.id,name,category:$("templateCategory").value,calculator_data:{
        materials:c.rows.map(x=>({material_id:x.id,qty:x.qty})),
        packaging_cost:num($("packagingCost").value),other_cost:num($("otherCost").value),
        labour_minutes:num($("labourMinutes").value),hourly_rate:num($("hourlyRate").value),
        waste_percent:num($("wastePercent").value),profit_margin:num($("profitMargin").value)
    },updated_at:new Date().toISOString()};
    const id=$("templateId").value;
    const result=id?await supabase.from("pricing_templates").update(payload).eq("id",id).eq("user_id",session.user.id):await supabase.from("pricing_templates").insert(payload);
    if(result.error){showMessage(result.error.message,"error");return;}
    closeModal("templateModal");await loadTemplates();showMessage("Template saved.");
}
$("saveTemplate")?.addEventListener("click",saveTemplate);

function useTemplate(id){
    const t=templates.find(x=>String(x.id)===String(id));if(!t)return;
    const d=t.calculator_data||{};
    $("calcName").value=t.name;$("calcCategory").value=t.category||"custom";
    $("packagingCost").value=d.packaging_cost??settings.packaging_cost;$("otherCost").value=d.other_cost??0;
    $("labourMinutes").value=d.labour_minutes??0;$("hourlyRate").value=d.hourly_rate??settings.hourly_rate;
    $("wastePercent").value=d.waste_percent??settings.waste_percent;$("profitMargin").value=d.profit_margin??settings.profit_margin;
    $("calcMaterials").innerHTML="";
    (d.materials||[]).forEach(x=>addMaterialLine(x.material_id));
    if(!(d.materials||[]).length)addMaterialLine();
    document.querySelector('[data-tab="calculator"]').click();calculate();
    showMessage("Template loaded into the calculator.");
}
async function deleteTemplate(id){
    if(!confirm("Delete this template?"))return;
    const {error}=await supabase.from("pricing_templates").delete().eq("id",id).eq("user_id",session.user.id);
    if(error){showMessage(error.message,"error");return;}
    await loadTemplates();showMessage("Template deleted.");
}

function escapeHtml(value){
    return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

(async()=>{
    if(!(await requireLogin()))return;
    await loadSettings();
    await loadMaterials();
    await loadTemplates();
    resetCalculator();
})();
