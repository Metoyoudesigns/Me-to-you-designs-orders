import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://critutqwakaepgxgpkml.supabase.co";
const SUPABASE_KEY = "sb_publishable_KtXAtIRgtZADPODLn7inRw_vC6rBPFb";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

"use strict";

// MENU
const menuButton = document.getElementById("menuButton");
const sideMenu = document.getElementById("sideMenu");
const overlay = document.getElementById("overlay");

function openMenu(){
    sideMenu?.classList.add("active");
    overlay?.classList.add("active");
}

function closeMenu(){
    sideMenu?.classList.remove("active");
    overlay?.classList.remove("active");
}

menuButton?.addEventListener("click", openMenu);
overlay?.addEventListener("click", closeMenu);

// DATE
const todayDate = document.getElementById("todayDate");

if(todayDate){
    todayDate.textContent = new Date().toLocaleDateString("en-GB", {
        weekday:"long",
        day:"numeric",
        month:"long",
        year:"numeric"
    });
}

// AUTH
document.getElementById("logoutButton")?.addEventListener("click", async e => {
    e.preventDefault();
    await supabase.auth.signOut();
    location.href = "index.html";
});

async function checkLogin(){
    const {data,error} = await supabase.auth.getSession();

    if(error || !data.session){
        location.href = "index.html";
        return false;
    }

    return true;
}

// LOCAL DASHBOARD DATA
let orders = [];
let jobs = JSON.parse(localStorage.getItem("todayJobs")) || [];
let notes = JSON.parse(localStorage.getItem("notes")) || [];

// LOAD ORDERS
async function loadOrders(){
    const {data,error} = await supabase
        .from("orders")
        .select("*");

    if(error){
        console.error("Could not load orders:", error);
        orders = [];
        updateDashboard();
        return;
    }

    orders = data || [];
    updateDashboard();
}

// REALTIME + FALLBACK
function subscribeToOrders(){
    supabase
        .channel("dashboard-orders")
        .on(
            "postgres_changes",
            {
                event:"*",
                schema:"public",
                table:"orders"
            },
            () => loadOrders()
        )
        .subscribe(status => {
            console.log("Order realtime status:", status);
        });
}

setInterval(loadOrders,10000);

// JOBS
const jobsList = document.getElementById("jobsList");
const addJobButton = document.getElementById("addJobButton");

addJobButton?.addEventListener("click",() => openEntryModal({
    type:"job",
    title:"Add Today's Job",
    subtitle:"Add a job you need to complete today.",
    placeholder:"e.g. Finish McKenzie's pyjamas"
}));

function addJob(v){
    if(!v?.trim()) return;

    jobs.push(v.trim());
    saveJobs();
}

function saveJobs(){
    localStorage.setItem("todayJobs",JSON.stringify(jobs));
    loadJobs();
}

function loadJobs(){
    if(!jobsList) return;

    jobsList.innerHTML = "";

    jobs.forEach((job,index) => {
        const li = document.createElement("li");

        li.innerHTML = `
            <span></span>
            <div>
                <button class="completeButton" title="Complete">✅</button>
                <button class="deleteButton" title="Delete">🗑️</button>
            </div>
        `;

        li.querySelector("span").textContent = job;

        li.querySelector(".completeButton").onclick = () => {
            jobs.splice(index,1);
            saveJobs();
        };

        li.querySelector(".deleteButton").onclick = () => {
            if(confirm("Delete this job?")){
                jobs.splice(index,1);
                saveJobs();
            }
        };

        jobsList.appendChild(li);
    });
}

loadJobs();

// NOTES
const notesList = document.getElementById("notesList");
const addNoteButton = document.getElementById("addNoteButton");

addNoteButton?.addEventListener("click",() => openEntryModal({
    type:"note",
    title:"Add Note",
    subtitle:"Add a note for your business dashboard.",
    placeholder:"Type your note here..."
}));

function addNote(v){
    if(!v?.trim()) return;

    notes.push(v.trim());
    saveNotes();
}

function saveNotes(){
    localStorage.setItem("notes",JSON.stringify(notes));
    loadNotes();
}

function loadNotes(){
    if(!notesList) return;

    notesList.innerHTML = "";

    notes.forEach((note,index) => {
        const li = document.createElement("li");

        li.innerHTML = `
            <span></span>
            <div>
                <button class="editButton" title="Edit">✏️</button>
                <button class="deleteButton" title="Delete">🗑️</button>
            </div>
        `;

        li.querySelector("span").textContent = note;

        li.querySelector(".editButton").onclick = () => openEntryModal({
            type:"edit-note",
            title:"Edit Note",
            subtitle:"Update your note below.",
            placeholder:"Type your note here...",
            value:notes[index],
            onSave:updated => {
                if(!updated.trim()){
                    notes.splice(index,1);
                }else{
                    notes[index] = updated.trim();
                }

                saveNotes();
            }
        });

        li.querySelector(".deleteButton").onclick = () => {
            if(confirm("Delete this note?")){
                notes.splice(index,1);
                saveNotes();
            }
        };

        notesList.appendChild(li);
    });
}

loadNotes();

// COLLAPSIBLE CARDS
document.querySelectorAll(".toggleButton").forEach(button => {
    const card = button.closest(".dashboardCard");
    const content = card?.querySelector(".cardContent");

    if(!content) return;

    content.style.display = "none";
    button.textContent = "▶";

    button.onclick = () => {
        const closed = content.style.display === "none";

        content.style.display = closed ? "block" : "none";
        button.textContent = closed ? "▼" : "▶";
    };
});

// DATE HELPERS
function parseDate(value){

    if(!value) return null;

    if(value instanceof Date){
        return Number.isNaN(value.getTime()) ? null : value;
    }

    if(typeof value === "string"){

        // YYYY-MM-DD
        if(/^\d{4}-\d{2}-\d{2}$/.test(value)){
            const [y,m,d] = value.split("-").map(Number);
            return new Date(y,m-1,d);
        }

        // DD/MM/YYYY
        if(/^\d{2}\/\d{2}\/\d{4}$/.test(value)){
            const [d,m,y] = value.split("/").map(Number);
            return new Date(y,m-1,d);
        }

        // DD-MM-YYYY
        if(/^\d{2}-\d{2}-\d{4}$/.test(value)){
            const [d,m,y] = value.split("-").map(Number);
            return new Date(y,m-1,d);
        }
    }

    const d = new Date(value);

    return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(date){
    const d = new Date(date);
    d.setHours(0,0,0,0);
    return d;
}

function startOfWeek(date){
    const d = startOfDay(date);
    const day = d.getDay();

    d.setDate(
        d.getDate() + (day === 0 ? -6 : 1 - day)
    );

    return d;
}

function startOfMonth(date){
    const d = startOfDay(date);
    d.setDate(1);
    return d;
}

// IMPORTANT: these match the actual Supabase columns used by the order form.
function getDateNeeded(order){
    return parseDate(
        order.date_needed ??
        order.dateNeeded ??
        order.neededBy ??
        order.date_needed_by
    );
}

function getOrderDate(order){
    return parseDate(
        order.order_date ??
        order.orderDate ??
        order.created_at ??
        order.createdAt ??
        order.date ??
        order.orderDateCreated
    );
}

// REVENUE AMOUNT
function getOrderTotal(order){

    const possibleValues = [
        order.order_total,
        order.orderTotal,
        order.total,
        order.total_amount,
        order.total_price,
        order.price,
        order.amount
    ];

    for(const value of possibleValues){

        if(
            value !== undefined &&
            value !== null &&
            value !== ""
        ){

            const n = Number(
                String(value)
                    .replace(/[£,\s]/g,"")
            );

            if(Number.isFinite(n)){
                return n;
            }
        }
    }

    return 0;
}

function getDeposit(order){

    const value =
        order.deposit ??
        order.deposit_amount ??
        order.depositAmount ??
        0;

    const n = Number(
        String(value)
            .replace(/[£,\s]/g,"")
    );

    return Number.isFinite(n) ? n : 0;
}

function getBalance(order){

    const explicit =
        order.remaining_balance ??
        order.balance ??
        order.remainingBalance;

    if(
        explicit !== undefined &&
        explicit !== null &&
        explicit !== ""
    ){

        const n = Number(
            String(explicit)
                .replace(/[£,\s]/g,"")
        );

        if(Number.isFinite(n)){
            return Math.max(0,n);
        }
    }

    return Math.max(
        0,
        getOrderTotal(order) - getDeposit(order)
    );
}

// DASHBOARD
function updateDashboard(){

    updateStats();

    // DO NOT CHANGE THESE
    calculateDueDates();

    loadNextOrder();
    loadOutstandingPayments();

    // REVENUE
    calculateRevenue();
}

function isActive(order){

    const s = String(
        order.order_status ??
        order.orderStatus ??
        ""
    ).toLowerCase();

    return (
        s !== "completed" &&
        s !== "cancelled"
    );
}

function updateStats(){

    const total =
        document.getElementById("totalOrders");

    const pending =
        document.getElementById("pendingOrders");

    if(total){
        total.textContent = orders.length;
    }

    if(pending){
        pending.textContent =
            orders.filter(isActive).length;
    }
}

// DUE DATES
// CURRENT MONDAY-SUNDAY WEEK ONLY
function calculateDueDates(){

    const today = startOfDay(new Date());

    const weekStart = startOfWeek(today);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(
        weekEnd.getDate() + 7
    );

    const monthStart = startOfMonth(today);

    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(
        monthEnd.getMonth() + 1
    );

    let week = 0;
    let month = 0;

    orders.forEach(order => {

        if(!isActive(order)) return;

        const due = getDateNeeded(order);

        if(!due) return;

        const d = startOfDay(due);

        if(
            d >= weekStart &&
            d < weekEnd
        ){
            week++;
        }

        if(
            d >= monthStart &&
            d < monthEnd
        ){
            month++;
        }
    });

    const dueWeek =
        document.getElementById("dueWeek");

    const dueMonth =
        document.getElementById("dueMonth");

    if(dueWeek){
        dueWeek.textContent = week;
    }

    if(dueMonth){
        dueMonth.textContent = month;
    }
}

// NEXT ORDER
function loadNextOrder(){

    const box =
        document.getElementById("nextOrderCard");

    if(!box) return;

    const active = orders
        .map(order => ({
            order,
            due:getDateNeeded(order)
        }))
        .filter(x =>
            x.due &&
            isActive(x.order)
        )
        .sort((a,b) =>
            a.due - b.due
        );

    if(!active.length){
        box.innerHTML =
            "<p>No upcoming orders.</p>";
        return;
    }

    const {order,due} = active[0];

    const today =
        startOfDay(new Date());

    const dueDay =
        startOfDay(due);

    const days =
        Math.round(
            (dueDay - today) / 86400000
        );

    let dueText =
        days < 0
            ? `⚠️ ${Math.abs(days)} day(s) overdue`
            : days === 0
                ? "Today"
                : `${days} day(s) remaining`;

    const orderNumber =
        order.order_number || "Order";

    const customerName =
        order.customer_name || "Customer";

    const status =
        order.order_status || "Unknown";

    box.innerHTML = `
        <h3></h3>
        <p><strong></strong></p>
        <p>📅 ${due.toLocaleDateString("en-GB")}</p>
        <p></p>
        <p>✨ </p>
    `;

    box.querySelector("h3").textContent =
        orderNumber;

    box.querySelector("strong").textContent =
        customerName;

    box.querySelectorAll("p")[2].textContent =
        dueText;

    box.querySelectorAll("p")[3].textContent =
        `✨ ${status}`;
}

// PAYMENTS
function loadOutstandingPayments(){

    const list =
        document.getElementById("paymentList");

    if(!list) return;

    const rows = orders
        .map(order => ({
            order,
            balance:getBalance(order)
        }))
        .filter(x =>
            x.balance > 0
        );

    if(!rows.length){
        list.innerHTML =
            "<p>No outstanding payments.</p>";
        return;
    }

    list.innerHTML = "";

    rows
        .sort((a,b) =>
            b.balance - a.balance
        )
        .forEach(({order,balance}) => {

            const row =
                document.createElement("div");

            row.style.padding = "10px 0";
            row.style.borderBottom =
                "1px solid #f3e5ec";

            row.innerHTML = `
                <strong></strong>
                <span style="display:block;margin-top:4px;"></span>
            `;

            row.querySelector("strong")
                .textContent =
                `${order.order_number || "Order"} — ${order.customer_name || "Customer"}`;

            row.querySelector("span")
                .textContent =
                `£${balance.toFixed(2)} outstanding`;

            list.appendChild(row);
        });
}

// ======================================================
// REVENUE
// ======================================================
// Today = orders created today
// This Week = orders created Monday-Sunday this week
// This Month = orders created during the current month
// Total = all order totals
// ======================================================
function calculateRevenue(){

    const now = new Date();

    const todayStart =
        startOfDay(now);

    const tomorrow =
        new Date(todayStart);

    tomorrow.setDate(
        tomorrow.getDate() + 1
    );

    const weekStart =
        startOfWeek(now);

    const nextWeek =
        new Date(weekStart);

    nextWeek.setDate(
        nextWeek.getDate() + 7
    );

    const monthStart =
        startOfMonth(now);

    const nextMonth =
        new Date(monthStart);

    nextMonth.setMonth(
        nextMonth.getMonth() + 1
    );

    let today = 0;
    let week = 0;
    let month = 0;
    let total = 0;

    orders.forEach(order => {

        const amount =
            getOrderTotal(order);

        if(amount <= 0){
            return;
        }

        // TOTAL REVENUE
        total += amount;

        const orderDate =
            getOrderDate(order);

        if(!orderDate){
            return;
        }

        // TODAY
        if(
            orderDate >= todayStart &&
            orderDate < tomorrow
        ){
            today += amount;
        }

        // THIS WEEK
        if(
            orderDate >= weekStart &&
            orderDate < nextWeek
        ){
            week += amount;
        }

        // THIS MONTH
        if(
            orderDate >= monthStart &&
            orderDate < nextMonth
        ){
            month += amount;
        }
    });

    const todayBox =
        document.getElementById("todayRevenue");

    const weekBox =
        document.getElementById("weekRevenue");

    const monthBox =
        document.getElementById("monthRevenue");

    const totalBox =
        document.getElementById("totalRevenue");

    if(todayBox){
        todayBox.textContent =
            `£${today.toFixed(2)}`;
    }

    if(weekBox){
        weekBox.textContent =
            `£${week.toFixed(2)}`;
    }

    if(monthBox){
        monthBox.textContent =
            `£${month.toFixed(2)}`;
    }

    if(totalBox){
        totalBox.textContent =
            `£${total.toFixed(2)}`;
    }

    console.log("REVENUE:",{
        today,
        week,
        month,
        total,
        orders
    });
}

// MODAL
const entryModal =
    document.getElementById("entryModal");

const entryModalInput =
    document.getElementById("entryModalInput");

const entryModalTitle =
    document.getElementById("entryModalTitle");

const entryModalSubtitle =
    document.getElementById("entryModalSubtitle");

const saveEntryModal =
    document.getElementById("saveEntryModal");

const closeEntryModal =
    document.getElementById("closeEntryModal");

const cancelEntryModal =
    document.getElementById("cancelEntryModal");

const entryModalBackdrop =
    document.querySelector(".entryModalBackdrop");

let currentModalSave = null;

function openEntryModal({
    type,
    title,
    subtitle,
    placeholder,
    value = "",
    onSave = null
}){

    if(!entryModal) return;

    entryModalTitle.textContent =
        title;

    entryModalSubtitle.textContent =
        subtitle;

    entryModalInput.placeholder =
        placeholder;

    entryModalInput.value =
        value;

    currentModalSave =
        onSave ||
        ((text) => {

            if(type === "job"){
                addJob(text);
            }

            if(type === "note"){
                addNote(text);
            }
        });

    entryModal.classList.add("active");

    entryModal.setAttribute(
        "aria-hidden",
        "false"
    );

    setTimeout(() => {

        entryModalInput.focus();

        entryModalInput.setSelectionRange(
            entryModalInput.value.length,
            entryModalInput.value.length
        );

    },50);
}

function closeEntryModalWindow(){

    if(!entryModal) return;

    entryModal.classList.remove("active");

    entryModal.setAttribute(
        "aria-hidden",
        "true"
    );

    entryModalInput.value = "";

    currentModalSave = null;
}

saveEntryModal?.addEventListener("click",() => {

    const value =
        entryModalInput.value.trim();

    if(!value){
        entryModalInput.focus();
        return;
    }

    currentModalSave?.(value);

    closeEntryModalWindow();
});

closeEntryModal?.addEventListener(
    "click",
    closeEntryModalWindow
);

cancelEntryModal?.addEventListener(
    "click",
    closeEntryModalWindow
);

entryModalBackdrop?.addEventListener(
    "click",
    closeEntryModalWindow
);

entryModalInput?.addEventListener(
    "keydown",
    e => {

        if(
            (e.ctrlKey || e.metaKey) &&
            e.key === "Enter"
        ){
            saveEntryModal.click();
        }
    }
);

document.addEventListener(
    "keydown",
    e => {

        if(e.key === "Escape"){
            closeEntryModalWindow();
        }
    }
);

// START
(async function(){

    if(!(await checkLogin())){
        return;
    }

    await loadOrders();

    subscribeToOrders();

})();
