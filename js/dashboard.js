import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://critutqwakaepgxgpkml.supabase.co";
const SUPABASE_KEY = "sb_publishable_KtXAtIRgtZADPODLn7inRw_vC6rBPFb";

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

"use strict";

// =====================================================
// ELEMENT HELPER
// =====================================================

const $ = id => document.getElementById(id);

// =====================================================
// MENU
// =====================================================

const menuButton = $("menuButton");
const sideMenu = $("sideMenu");
const overlay = $("overlay");

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

// =====================================================
// DATE
// =====================================================

const todayDate = $("todayDate");

if(todayDate){
    todayDate.textContent = new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

// =====================================================
// AUTH
// =====================================================

$("logoutButton")?.addEventListener("click", async e => {
    e.preventDefault();

    await supabase.auth.signOut();

    location.href = "index.html";
});

async function getSession(){

    const { data, error } =
        await supabase.auth.getSession();

    if(error || !data.session){
        location.href = "index.html";
        return null;
    }

    return data.session;
}

async function checkLogin(){
    return !!(await getSession());
}

// =====================================================
// DATA
// =====================================================

let orders = [];
let jobs = [];
let notes = [];

// =====================================================
// LOAD ORDERS FROM SUPABASE
// =====================================================

async function loadOrders(){

    const { data, error } =
        await supabase
            .from("orders")
            .select("*");

    if(error){

        console.error(
            "Could not load orders:",
            error
        );

        orders = [];

        updateDashboard();

        return;
    }

    orders = data || [];

    updateDashboard();
}

// =====================================================
// LOAD DASHBOARD JOBS + NOTES FROM SUPABASE
// =====================================================

async function loadDashboardEntries(){

    const session = await getSession();

    if(!session) return;

    const { data, error } =
        await supabase
            .from("dashboard_entries")
            .select("*")
            .eq("user_id", session.user.id)
            .order("created_at", {
                ascending: true
            });

    if(error){

        console.error(
            "Could not load dashboard entries:",
            error
        );

        jobs = [];
        notes = [];

        loadJobs();
        loadNotes();

        return;
    }

    const entries = data || [];

    jobs = entries
        .filter(x =>
            x.entry_type === "job" &&
            !x.completed
        );

    notes = entries
        .filter(x =>
            x.entry_type === "note"
        );

    loadJobs();
    loadNotes();
}

// =====================================================
// REALTIME ORDERS
// =====================================================

function subscribeToOrders(){

    supabase
        .channel("dashboard-orders")
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "orders"
            },
            () => {
                loadOrders();
            }
        )
        .subscribe();
}

// =====================================================
// REALTIME DASHBOARD ENTRIES
// =====================================================

function subscribeToDashboardEntries(){

    supabase
        .channel("dashboard-entries")
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "dashboard_entries"
            },
            () => {
                loadDashboardEntries();
            }
        )
        .subscribe();
}

// =====================================================
// JOBS
// =====================================================

const jobsList = $("jobsList");
const addJobButton = $("addJobButton");

addJobButton?.addEventListener("click", () => {

    openEntryModal({
        type: "job",
        title: "Add Today's Job",
        subtitle:
            "Add a job you need to complete today.",
        placeholder:
            "e.g. Finish balloon arch"
    });

});

async function addJob(value){

    if(!value?.trim()) return;

    const session = await getSession();

    if(!session) return;

    const { error } =
        await supabase
            .from("dashboard_entries")
            .insert({
                user_id: session.user.id,
                entry_type: "job",
                content: value.trim(),
                completed: false
            });

    if(error){

        console.error(error);

        alert(
            "Could not save the job.\n\n" +
            error.message
        );

        return;
    }

    await loadDashboardEntries();
}

async function completeJob(id){

    const { error } =
        await supabase
            .from("dashboard_entries")
            .update({
                completed: true,
                updated_at: new Date().toISOString()
            })
            .eq("id", id);

    if(error){

        alert(
            "Could not complete the job.\n\n" +
            error.message
        );

        return;
    }

    await loadDashboardEntries();
}

async function deleteJob(id){

    if(!confirm("Delete this job?")) return;

    const { error } =
        await supabase
            .from("dashboard_entries")
            .delete()
            .eq("id", id);

    if(error){

        alert(
            "Could not delete the job.\n\n" +
            error.message
        );

        return;
    }

    await loadDashboardEntries();
}

function loadJobs(){

    if(!jobsList) return;

    jobsList.innerHTML = "";

    if(!jobs.length){

        return;
    }

    jobs.forEach(job => {

        const li =
            document.createElement("li");

        li.innerHTML = `
            <span></span>

            <div>
                <button
                    class="completeButton"
                    title="Complete"
                >✅</button>

                <button
                    class="deleteButton"
                    title="Delete"
                >🗑️</button>
            </div>
        `;

        li.querySelector("span")
            .textContent = job.content;

        li.querySelector(".completeButton")
            .onclick = () =>
                completeJob(job.id);

        li.querySelector(".deleteButton")
            .onclick = () =>
                deleteJob(job.id);

        jobsList.appendChild(li);
    });
}

// =====================================================
// NOTES
// =====================================================

const notesList = $("notesList");
const addNoteButton = $("addNoteButton");

addNoteButton?.addEventListener("click", () => {

    openEntryModal({
        type: "note",
        title: "Add Note",
        subtitle:
            "Add a note for your business dashboard.",
        placeholder:
            "Type your note here..."
    });

});

async function addNote(value){

    if(!value?.trim()) return;

    const session = await getSession();

    if(!session) return;

    const { error } =
        await supabase
            .from("dashboard_entries")
            .insert({
                user_id: session.user.id,
                entry_type: "note",
                content: value.trim(),
                completed: false
            });

    if(error){

        console.error(error);

        alert(
            "Could not save the note.\n\n" +
            error.message
        );

        return;
    }

    await loadDashboardEntries();
}

async function editNote(id, oldValue){

    openEntryModal({
        type: "edit-note",
        title: "Edit Note",
        subtitle:
            "Update your note below.",
        placeholder:
            "Type your note here...",
        value: oldValue,

        onSave: async updated => {

            if(!updated.trim()){

                await deleteNote(id);

                return;
            }

            const { error } =
                await supabase
                    .from("dashboard_entries")
                    .update({
                        content: updated.trim(),
                        updated_at:
                            new Date().toISOString()
                    })
                    .eq("id", id);

            if(error){

                alert(
                    "Could not update the note.\n\n" +
                    error.message
                );

                return;
            }

            await loadDashboardEntries();
        }
    });
}

async function deleteNote(id){

    if(!confirm("Delete this note?")) return;

    const { error } =
        await supabase
            .from("dashboard_entries")
            .delete()
            .eq("id", id);

    if(error){

        alert(
            "Could not delete the note.\n\n" +
            error.message
        );

        return;
    }

    await loadDashboardEntries();
}

function loadNotes(){

    if(!notesList) return;

    notesList.innerHTML = "";

    if(!notes.length){

        return;
    }

    notes.forEach(note => {

        const li =
            document.createElement("li");

        li.innerHTML = `
            <span></span>

            <div>
                <button
                    class="editButton"
                    title="Edit"
                >✏️</button>

                <button
                    class="deleteButton"
                    title="Delete"
                >🗑️</button>
            </div>
        `;

        li.querySelector("span")
            .textContent = note.content;

        li.querySelector(".editButton")
            .onclick = () =>
                editNote(
                    note.id,
                    note.content
                );

        li.querySelector(".deleteButton")
            .onclick = () =>
                deleteNote(note.id);

        notesList.appendChild(li);
    });
}

// =====================================================
// COLLAPSIBLE CARDS
// =====================================================

document
    .querySelectorAll(".toggleButton")
    .forEach(button => {

        const card =
            button.closest(".dashboardCard");

        const content =
            card?.querySelector(".cardContent");

        if(!content) return;

        content.style.display = "none";

        button.textContent = "▶";

        button.onclick = () => {

            const closed =
                content.style.display === "none";

            content.style.display =
                closed ? "block" : "none";

            button.textContent =
                closed ? "▼" : "▶";
        };
    });

// =====================================================
// DATE HELPERS
// =====================================================

function parseDate(value){

    if(!value) return null;

    if(value instanceof Date){

        return Number.isNaN(value.getTime())
            ? null
            : value;
    }

    if(typeof value === "string"){

        if(/^\d{4}-\d{2}-\d{2}$/.test(value)){

            const [year, month, day] =
                value.split("-").map(Number);

            return new Date(
                year,
                month - 1,
                day
            );
        }

        if(/^\d{2}\/\d{2}\/\d{4}$/.test(value)){

            const [day, month, year] =
                value.split("/").map(Number);

            return new Date(
                year,
                month - 1,
                day
            );
        }
    }

    const d = new Date(value);

    return Number.isNaN(d.getTime())
        ? null
        : d;
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
        d.getDate() +
        (day === 0 ? -6 : 1 - day)
    );

    return d;
}

function startOfMonth(date){

    const d = startOfDay(date);

    d.setDate(1);

    return d;
}

// =====================================================
// ORDER DATA HELPERS
// =====================================================

function getDateNeeded(order){

    return parseDate(
        order.date_needed ??
        order.dateNeeded ??
        order.neededBy ??
        order.date_needed_by
    );
}

function getRevenueDate(order){

    return parseDate(
        order.created_at
    );
}

function getRevenueAmount(order){

    const value =
        order.total_paid ?? 0;

    const amount =
        Number(
            String(value)
                .replace(/[£,\s]/g,"")
        );

    return Number.isFinite(amount)
        ? amount
        : 0;
}

function getOrderTotal(order){

    const value =
        order.order_total ?? 0;

    const amount =
        Number(
            String(value)
                .replace(/[£,\s]/g,"")
        );

    return Number.isFinite(amount)
        ? amount
        : 0;
}

function getDeposit(order){

    const value =
        order.deposit ??
        order.deposit_amount ??
        order.depositAmount ??
        0;

    const amount =
        Number(
            String(value)
                .replace(/[£,\s]/g,"")
        );

    return Number.isFinite(amount)
        ? amount
        : 0;
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

        const amount =
            Number(
                String(explicit)
                    .replace(/[£,\s]/g,"")
            );

        if(Number.isFinite(amount)){

            return Math.max(0, amount);
        }
    }

    return Math.max(
        0,
        getOrderTotal(order) -
        getDeposit(order)
    );
}

// =====================================================
// DASHBOARD
// =====================================================

function updateDashboard(){

    updateStats();

    calculateDueDates();

    loadNextOrder();

    loadOutstandingPayments();

    calculateRevenue();
}

// =====================================================
// STATS
// =====================================================

function isActive(order){

    const status =
        String(
            order.order_status ??
            order.orderStatus ??
            ""
        ).toLowerCase();

    return (
        status !== "completed" &&
        status !== "cancelled"
    );
}

function updateStats(){

    const total = $("totalOrders");
    const pending = $("pendingOrders");

    if(total){
        total.textContent = orders.length;
    }

    if(pending){
        pending.textContent =
            orders.filter(isActive).length;
    }
}

// =====================================================
// DUE DATES
// =====================================================

function calculateDueDates(){

    const today =
        startOfDay(new Date());

    const weekStart =
        startOfWeek(today);

    const weekEnd =
        new Date(weekStart);

    weekEnd.setDate(
        weekEnd.getDate() + 7
    );

    const monthStart =
        startOfMonth(today);

    const monthEnd =
        new Date(monthStart);

    monthEnd.setMonth(
        monthEnd.getMonth() + 1
    );

    let week = 0;
    let month = 0;

    orders.forEach(order => {

        if(!isActive(order)) return;

        const due =
            getDateNeeded(order);

        if(!due) return;

        const d =
            startOfDay(due);

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

    const dueWeek = $("dueWeek");
    const dueMonth = $("dueMonth");

    if(dueWeek){
        dueWeek.textContent = week;
    }

    if(dueMonth){
        dueMonth.textContent = month;
    }
}

// =====================================================
// NEXT ORDER
// =====================================================

function loadNextOrder(){

    const box =
        $("nextOrderCard");

    if(!box) return;

    const active =
        orders
            .map(order => ({
                order,
                due: getDateNeeded(order)
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

    const {
        order,
        due
    } = active[0];

    const today =
        startOfDay(new Date());

    const dueDay =
        startOfDay(due);

    const days =
        Math.round(
            (dueDay - today) /
            86400000
        );

    let dueText;

    if(days < 0){

        dueText =
            `⚠️ ${Math.abs(days)} day(s) overdue`;

    }else if(days === 0){

        dueText = "Today";

    }else{

        dueText =
            `${days} day(s) remaining`;
    }

    box.innerHTML = `
        <h3></h3>
        <p><strong></strong></p>
        <p>📅 ${due.toLocaleDateString("en-GB")}</p>
        <p></p>
        <p>✨</p>
    `;

    box.querySelector("h3")
        .textContent =
        order.order_number || "Order";

    box.querySelector("strong")
        .textContent =
        order.customer_name || "Customer";

    box.querySelectorAll("p")[2]
        .textContent = dueText;

    box.querySelectorAll("p")[3]
        .textContent =
        `✨ ${order.order_status || "Unknown"}`;
}

// =====================================================
// OUTSTANDING PAYMENTS
// =====================================================

function loadOutstandingPayments(){

    const list =
        $("paymentList");

    if(!list) return;

    const rows =
        orders
            .map(order => ({
                order,
                balance:
                    getBalance(order)
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

            row.style.padding =
                "10px 0";

            row.style.borderBottom =
                "1px solid #f3e5ec";

            row.innerHTML = `
                <strong></strong>
                <span
                    style="
                        display:block;
                        margin-top:4px;
                    "
                ></span>
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

// =====================================================
// REVENUE
// =====================================================

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

    let todayRevenue = 0;
    let weekRevenue = 0;
    let monthRevenue = 0;
    let totalRevenue = 0;

    orders.forEach(order => {

        const amount =
            getRevenueAmount(order);

        const revenueDate =
            getRevenueDate(order);

        totalRevenue += amount;

        if(!revenueDate) return;

        if(
            revenueDate >= todayStart &&
            revenueDate < tomorrow
        ){
            todayRevenue += amount;
        }

        if(
            revenueDate >= weekStart &&
            revenueDate < nextWeek
        ){
            weekRevenue += amount;
        }

        if(
            revenueDate >= monthStart &&
            revenueDate < nextMonth
        ){
            monthRevenue += amount;
        }
    });

    const todayBox = $("todayRevenue");
    const weekBox = $("weekRevenue");
    const monthBox = $("monthRevenue");
    const totalBox = $("totalRevenue");

    if(todayBox){
        todayBox.textContent =
            `£${todayRevenue.toFixed(2)}`;
    }

    if(weekBox){
        weekBox.textContent =
            `£${weekRevenue.toFixed(2)}`;
    }

    if(monthBox){
        monthBox.textContent =
            `£${monthRevenue.toFixed(2)}`;
    }

    if(totalBox){
        totalBox.textContent =
            `£${totalRevenue.toFixed(2)}`;
    }
}

// =====================================================
// MODAL
// =====================================================

const entryModal =
    $("entryModal");

const entryModalInput =
    $("entryModalInput");

const entryModalTitle =
    $("entryModalTitle");

const entryModalSubtitle =
    $("entryModalSubtitle");

const saveEntryModal =
    $("saveEntryModal");

const closeEntryModal =
    $("closeEntryModal");

const cancelEntryModal =
    $("cancelEntryModal");

const entryModalBackdrop =
    document.querySelector(
        ".entryModalBackdrop"
    );

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

saveEntryModal?.addEventListener(
    "click",
    () => {

        const value =
            entryModalInput.value.trim();

        if(!value){

            entryModalInput.focus();

            return;
        }

        currentModalSave?.(value);

        closeEntryModalWindow();
    }
);

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

// =====================================================
// START
// =====================================================

(async function(){

    if(!(await checkLogin())){
        return;
    }

    await loadOrders();

    await loadDashboardEntries();

    subscribeToOrders();

    subscribeToDashboardEntries();

})();
