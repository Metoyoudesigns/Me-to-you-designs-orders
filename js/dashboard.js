import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://critutqwakaepgxgpkml.supabase.co";
const SUPABASE_KEY = "sb_publishable_KtXAtIRgtZADPODLn7inRw_vC6rBPFb";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

"use strict";

// =====================================================
// MENU
// =====================================================

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

// =====================================================
// DATE
// =====================================================

const todayDate = document.getElementById("todayDate");

if(todayDate){
    todayDate.textContent = new Date().toLocaleDateString("en-GB", {
        weekday:"long",
        day:"numeric",
        month:"long",
        year:"numeric"
    });
}

// =====================================================
// AUTH
// =====================================================

document.getElementById("logoutButton")?.addEventListener("click", async e => {

    e.preventDefault();

    await supabase.auth.signOut();

    location.href = "index.html";
});

async function checkLogin(){

    const {data,error} =
        await supabase.auth.getSession();

    if(error || !data.session){

        location.href = "index.html";

        return false;
    }

    return true;
}

// =====================================================
// DATA
// =====================================================

let orders = [];

let jobs =
    JSON.parse(
        localStorage.getItem("todayJobs")
    ) || [];

let notes =
    JSON.parse(
        localStorage.getItem("notes")
    ) || [];

// =====================================================
// LOAD ORDERS
// =====================================================

async function loadOrders(){

    const {data,error} =
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
// REALTIME
// =====================================================

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

            console.log(
                "Order realtime status:",
                status
            );

        });
}

setInterval(
    loadOrders,
    10000
);

// =====================================================
// JOBS
// =====================================================

const jobsList =
    document.getElementById("jobsList");

const addJobButton =
    document.getElementById("addJobButton");

addJobButton?.addEventListener(
    "click",
    () => openEntryModal({
        type:"job",
        title:"Add Today's Job",
        subtitle:
            "Add a job you need to complete today.",
        placeholder:
            "e.g. Finish McKenzie's pyjamas"
    })
);

function addJob(value){

    if(!value?.trim()) return;

    jobs.push(
        value.trim()
    );

    saveJobs();
}

function saveJobs(){

    localStorage.setItem(
        "todayJobs",
        JSON.stringify(jobs)
    );

    loadJobs();
}

function loadJobs(){

    if(!jobsList) return;

    jobsList.innerHTML = "";

    jobs.forEach(
        (job,index) => {

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

            li.querySelector(
                "span"
            ).textContent = job;

            li.querySelector(
                ".completeButton"
            ).onclick = () => {

                jobs.splice(
                    index,
                    1
                );

                saveJobs();
            };

            li.querySelector(
                ".deleteButton"
            ).onclick = () => {

                if(
                    confirm(
                        "Delete this job?"
                    )
                ){

                    jobs.splice(
                        index,
                        1
                    );

                    saveJobs();
                }

            };

            jobsList.appendChild(li);
        }
    );
}

loadJobs();

// =====================================================
// NOTES
// =====================================================

const notesList =
    document.getElementById("notesList");

const addNoteButton =
    document.getElementById("addNoteButton");

addNoteButton?.addEventListener(
    "click",
    () => openEntryModal({
        type:"note",
        title:"Add Note",
        subtitle:
            "Add a note for your business dashboard.",
        placeholder:
            "Type your note here..."
    })
);

function addNote(value){

    if(!value?.trim()) return;

    notes.push(
        value.trim()
    );

    saveNotes();
}

function saveNotes(){

    localStorage.setItem(
        "notes",
        JSON.stringify(notes)
    );

    loadNotes();
}

function loadNotes(){

    if(!notesList) return;

    notesList.innerHTML = "";

    notes.forEach(
        (note,index) => {

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

            li.querySelector(
                "span"
            ).textContent = note;

            li.querySelector(
                ".editButton"
            ).onclick = () => {

                openEntryModal({
                    type:"edit-note",
                    title:"Edit Note",
                    subtitle:
                        "Update your note below.",
                    placeholder:
                        "Type your note here...",
                    value:notes[index],

                    onSave:updated => {

                        if(
                            !updated.trim()
                        ){

                            notes.splice(
                                index,
                                1
                            );

                        }else{

                            notes[index] =
                                updated.trim();
                        }

                        saveNotes();
                    }
                });

            };

            li.querySelector(
                ".deleteButton"
            ).onclick = () => {

                if(
                    confirm(
                        "Delete this note?"
                    )
                ){

                    notes.splice(
                        index,
                        1
                    );

                    saveNotes();
                }

            };

            notesList.appendChild(li);
        }
    );
}

loadNotes();

// =====================================================
// COLLAPSIBLE CARDS
// =====================================================

document
    .querySelectorAll(".toggleButton")
    .forEach(button => {

        const card =
            button.closest(
                ".dashboardCard"
            );

        const content =
            card?.querySelector(
                ".cardContent"
            );

        if(!content) return;

        content.style.display =
            "none";

        button.textContent =
            "▶";

        button.onclick = () => {

            const closed =
                content.style.display ===
                "none";

            content.style.display =
                closed
                    ? "block"
                    : "none";

            button.textContent =
                closed
                    ? "▼"
                    : "▶";
        };

    });

// =====================================================
// DATE FUNCTIONS
// =====================================================

function parseDate(value){

    if(!value) return null;

    if(value instanceof Date){

        return Number.isNaN(
            value.getTime()
        )
            ? null
            : value;
    }

    if(
        typeof value ===
        "string"
    ){

        // YYYY-MM-DD
        if(
            /^\d{4}-\d{2}-\d{2}$/
                .test(value)
        ){

            const [
                year,
                month,
                day
            ] =
                value
                    .split("-")
                    .map(Number);

            return new Date(
                year,
                month - 1,
                day
            );
        }

        // DD/MM/YYYY
        if(
            /^\d{2}\/\d{2}\/\d{4}$/
                .test(value)
        ){

            const [
                day,
                month,
                year
            ] =
                value
                    .split("/")
                    .map(Number);

            return new Date(
                year,
                month - 1,
                day
            );
        }
    }

    const d =
        new Date(value);

    return Number.isNaN(
        d.getTime()
    )
        ? null
        : d;
}

function startOfDay(date){

    const d =
        new Date(date);

    d.setHours(
        0,
        0,
        0,
        0
    );

    return d;
}

function startOfWeek(date){

    const d =
        startOfDay(date);

    const day =
        d.getDay();

    const difference =
        day === 0
            ? -6
            : 1 - day;

    d.setDate(
        d.getDate() +
        difference
    );

    return d;
}

function startOfMonth(date){

    const d =
        startOfDay(date);

    d.setDate(1);

    return d;
}

// =====================================================
// ORDER DATES
// =====================================================

function getDateNeeded(order){

    return parseDate(
        order.date_needed ??
        order.dateNeeded ??
        order.neededBy ??
        order.date_needed_by
    );
}

// EXACTLY WHAT CREATE-ORDER.HTML SAVES
function getOrderDate(order){

    return parseDate(
        order.order_date
    );
}

// =====================================================
// ORDER TOTAL
// =====================================================

function getOrderTotal(order){

    const value =
        order.order_total;

    const amount =
        Number(
            String(
                value ?? 0
            ).replace(
                /[£,\s]/g,
                ""
            )
        );

    return Number.isFinite(
        amount
    )
        ? amount
        : 0;
}

// =====================================================
// DEPOSIT / BALANCE
// =====================================================

function getDeposit(order){

    const value =
        order.deposit ??
        order.deposit_amount ??
        order.depositAmount ??
        0;

    const amount =
        Number(
            String(value)
                .replace(
                    /[£,\s]/g,
                    ""
                )
        );

    return Number.isFinite(
        amount
    )
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
                    .replace(
                        /[£,\s]/g,
                        ""
                    )
            );

        if(
            Number.isFinite(
                amount
            )
        ){

            return Math.max(
                0,
                amount
            );
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

    const total =
        document.getElementById(
            "totalOrders"
        );

    const pending =
        document.getElementById(
            "pendingOrders"
        );

    if(total){

        total.textContent =
            orders.length;
    }

    if(pending){

        pending.textContent =
            orders.filter(
                isActive
            ).length;
    }
}

// =====================================================
// DUE THIS WEEK / MONTH
// =====================================================

function calculateDueDates(){

    const today =
        startOfDay(
            new Date()
        );

    const weekStart =
        startOfWeek(
            today
        );

    const weekEnd =
        new Date(
            weekStart
        );

    weekEnd.setDate(
        weekEnd.getDate() + 7
    );

    const monthStart =
        startOfMonth(
            today
        );

    const monthEnd =
        new Date(
            monthStart
        );

    monthEnd.setMonth(
        monthEnd.getMonth() + 1
    );

    let week = 0;
    let month = 0;

    orders.forEach(
        order => {

            if(
                !isActive(order)
            ) return;

            const due =
                getDateNeeded(
                    order
                );

            if(!due) return;

            const date =
                startOfDay(
                    due
                );

            if(
                date >= weekStart &&
                date < weekEnd
            ){

                week++;
            }

            if(
                date >= monthStart &&
                date < monthEnd
            ){

                month++;
            }
        }
    );

    const dueWeek =
        document.getElementById(
            "dueWeek"
        );

    const dueMonth =
        document.getElementById(
            "dueMonth"
        );

    if(dueWeek){

        dueWeek.textContent =
            week;
    }

    if(dueMonth){

        dueMonth.textContent =
            month;
    }
}

// =====================================================
// NEXT ORDER
// =====================================================

function loadNextOrder(){

    const box =
        document.getElementById(
            "nextOrderCard"
        );

    if(!box) return;

    const active =
        orders
            .map(
                order => ({
                    order,
                    due:
                        getDateNeeded(
                            order
                        )
                })
            )
            .filter(
                x =>
                    x.due &&
                    isActive(
                        x.order
                    )
            )
            .sort(
                (a,b) =>
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
    } =
        active[0];

    const today =
        startOfDay(
            new Date()
        );

    const dueDay =
        startOfDay(
            due
        );

    const days =
        Math.round(
            (
                dueDay -
                today
            ) /
            86400000
        );

    let dueText;

    if(days < 0){

        dueText =
            `⚠️ ${Math.abs(days)} day(s) overdue`;

    }else if(days === 0){

        dueText =
            "Today";

    }else{

        dueText =
            `${days} day(s) remaining`;
    }

    const orderNumber =
        order.order_number ||
        "Order";

    const customerName =
        order.customer_name ||
        "Customer";

    const status =
        order.order_status ||
        "Unknown";

    box.innerHTML = `
        <h3></h3>
        <p><strong></strong></p>
        <p>📅 ${due.toLocaleDateString("en-GB")}</p>
        <p></p>
        <p>✨ </p>
    `;

    box.querySelector(
        "h3"
    ).textContent =
        orderNumber;

    box.querySelector(
        "strong"
    ).textContent =
        customerName;

    box.querySelectorAll(
        "p"
    )[2].textContent =
        dueText;

    box.querySelectorAll(
        "p"
    )[3].textContent =
        `✨ ${status}`;
}

// =====================================================
// OUTSTANDING PAYMENTS
// =====================================================

function loadOutstandingPayments(){

    const list =
        document.getElementById(
            "paymentList"
        );

    if(!list) return;

    const rows =
        orders
            .map(
                order => ({
                    order,
                    balance:
                        getBalance(
                            order
                        )
                })
            )
            .filter(
                x =>
                    x.balance > 0
            );

    if(!rows.length){

        list.innerHTML =
            "<p>No outstanding payments.</p>";

        return;
    }

    list.innerHTML = "";

    rows
        .sort(
            (a,b) =>
                b.balance -
                a.balance
        )
        .forEach(
            ({
                order,
                balance
            }) => {

                const row =
                    document.createElement(
                        "div"
                    );

                row.style.padding =
                    "10px 0";

                row.style.borderBottom =
                    "1px solid #f3e5ec";

                row.innerHTML = `
                    <strong></strong>
                    <span style="display:block;margin-top:4px;"></span>
                `;

                row.querySelector(
                    "strong"
                ).textContent =
                    `${order.order_number || "Order"} — ${order.customer_name || "Customer"}`;

                row.querySelector(
                    "span"
                ).textContent =
                    `£${balance.toFixed(2)} outstanding`;

                list.appendChild(
                    row
                );
            }
        );
}

// =====================================================
// REVENUE
// =====================================================
//
// IMPORTANT:
//
// Revenue uses ORDER DATE.
//
// order_date = when the order was made
// order_total = value of the order
//
// date_needed is NOT used here.
//
// Therefore:
//
// TODAY = orders made today
// WEEK = orders made Monday-Sunday
// MONTH = orders made this calendar month
// TOTAL = all orders
//
// =====================================================

function calculateRevenue(){

    const now =
        new Date();

    const year =
        now.getFullYear();

    const month =
        now.getMonth();

    const day =
        now.getDate();

    // TODAY
    const todayStart =
        new Date(
            year,
            month,
            day
        );

    const tomorrow =
        new Date(
            year,
            month,
            day + 1
        );

    // THIS WEEK
    const weekday =
        todayStart.getDay();

    const daysSinceMonday =
        weekday === 0
            ? 6
            : weekday - 1;

    const weekStart =
        new Date(
            year,
            month,
            day -
            daysSinceMonday
        );

    const nextWeek =
        new Date(
            weekStart
        );

    nextWeek.setDate(
        nextWeek.getDate() + 7
    );

    // THIS MONTH
    const monthStart =
        new Date(
            year,
            month,
            1
        );

    const nextMonth =
        new Date(
            year,
            month + 1,
            1
        );

    let todayRevenue = 0;
    let weekRevenue = 0;
    let monthRevenue = 0;
    let totalRevenue = 0;

    orders.forEach(
        order => {

            // EXACT FIELD
            // FROM CREATE ORDER
            const amount =
                Number(
                    order.order_total
                ) || 0;

            // TOTAL
            totalRevenue +=
                amount;

            // EXACT FIELD
            // FROM CREATE ORDER
            const rawDate =
                order.order_date;

            if(!rawDate) return;

            let orderDate;

            // YYYY-MM-DD
            if(
                typeof rawDate === "string" &&
                /^\d{4}-\d{2}-\d{2}$/
                    .test(rawDate)
            ){

                const [
                    orderYear,
                    orderMonth,
                    orderDay
                ] =
                    rawDate
                        .split("-")
                        .map(Number);

                // LOCAL DATE
                // NO UTC CONVERSION
                orderDate =
                    new Date(
                        orderYear,
                        orderMonth - 1,
                        orderDay
                    );

            }else{

                orderDate =
                    new Date(
                        rawDate
                    );
            }

            if(
                Number.isNaN(
                    orderDate.getTime()
                )
            ){

                return;
            }

            orderDate =
                new Date(
                    orderDate.getFullYear(),
                    orderDate.getMonth(),
                    orderDate.getDate()
                );

            // TODAY
            if(
                orderDate >= todayStart &&
                orderDate < tomorrow
            ){

                todayRevenue +=
                    amount;
            }

            // THIS WEEK
            if(
                orderDate >= weekStart &&
                orderDate < nextWeek
            ){

                weekRevenue +=
                    amount;
            }

            // THIS MONTH
            if(
                orderDate >= monthStart &&
                orderDate < nextMonth
            ){

                monthRevenue +=
                    amount;
            }

        }
    );

    const todayBox =
        document.getElementById(
            "todayRevenue"
        );

    const weekBox =
        document.getElementById(
            "weekRevenue"
        );

    const monthBox =
        document.getElementById(
            "monthRevenue"
        );

    const totalBox =
        document.getElementById(
            "totalRevenue"
        );

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

    console.log(
        "REVENUE:",
        {
            today:
                todayRevenue,
            week:
                weekRevenue,
            month:
                monthRevenue,
            total:
                totalRevenue
        }
    );
}

// =====================================================
// MODAL
// =====================================================

const entryModal =
    document.getElementById(
        "entryModal"
    );

const entryModalInput =
    document.getElementById(
        "entryModalInput"
    );

const entryModalTitle =
    document.getElementById(
        "entryModalTitle"
    );

const entryModalSubtitle =
    document.getElementById(
        "entryModalSubtitle"
    );

const saveEntryModal =
    document.getElementById(
        "saveEntryModal"
    );

const closeEntryModal =
    document.getElementById(
        "closeEntryModal"
    );

const cancelEntryModal =
    document.getElementById(
        "cancelEntryModal"
    );

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
        (
            text => {

                if(type === "job"){
                    addJob(text);
                }

                if(type === "note"){
                    addNote(text);
                }

            }
        );

    entryModal.classList.add(
        "active"
    );

    entryModal.setAttribute(
        "aria-hidden",
        "false"
    );

    setTimeout(
        () => {

            entryModalInput.focus();

            entryModalInput.setSelectionRange(
                entryModalInput.value.length,
                entryModalInput.value.length
            );

        },
        50
    );
}

function closeEntryModalWindow(){

    if(!entryModal) return;

    entryModal.classList.remove(
        "active"
    );

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

        currentModalSave?.(
            value
        );

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

        if(
            e.key === "Escape"
        ){

            closeEntryModalWindow();
        }

    }
);

// =====================================================
// START
// =====================================================

(async function(){

    if(
        !(await checkLogin())
    ){

        return;
    }

    await loadOrders();

    subscribeToOrders();

})();
