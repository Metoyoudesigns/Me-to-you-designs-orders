import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://critutqwakaepgxgpkml.supabase.co";
const SUPABASE_KEY = "sb_publishable_KtXAtIRgtZADPODLn7inRw_vC6rBPFb";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

"use strict";

// ======================================
// MENU
// ======================================

const menuButton = document.getElementById("menuButton");
const sideMenu = document.getElementById("sideMenu");
const overlay = document.getElementById("overlay");

function openMenu() {
    sideMenu?.classList.add("active");
    overlay?.classList.add("active");
}

function closeMenu() {
    sideMenu?.classList.remove("active");
    overlay?.classList.remove("active");
}

menuButton?.addEventListener("click", openMenu);
overlay?.addEventListener("click", closeMenu);

// ======================================
// DATE
// ======================================

const todayDate = document.getElementById("todayDate");

function showToday() {
    if (!todayDate) return;

    todayDate.textContent = new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

showToday();

// ======================================
// AUTH
// ======================================

const logoutButton = document.getElementById("logoutButton");

logoutButton?.addEventListener("click", async (event) => {
    event.preventDefault();
    await supabase.auth.signOut();
    window.location.href = "index.html";
});

async function checkLogin() {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
        window.location.href = "index.html";
        return false;
    }

    return true;
}

// ======================================
// LOCAL DASHBOARD DATA
// ======================================

let orders = [];
let jobs = JSON.parse(localStorage.getItem("todayJobs")) || [];
let notes = JSON.parse(localStorage.getItem("notes")) || [];

// ======================================
// LOAD ORDERS FROM SUPABASE
// ======================================

async function loadOrders() {
    const { data, error } = await supabase
        .from("orders")
        .select("*");

    if (error) {
        console.error("Could not load orders:", error);
        orders = [];
        updateDashboard();
        return;
    }

    orders = (data || []).map(order => ({
        id: order.id,
        ...order
    }));

    updateDashboard();
}

// ======================================
// REAL-TIME ORDER UPDATES
// ======================================

function subscribeToOrders() {
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
        .subscribe((status) => {
            console.log("Order realtime status:", status);
        });
}

// Fallback refresh as well, so the dashboard still catches changes
// if Supabase Realtime has not yet been enabled for the orders table.
setInterval(loadOrders, 10000);

// ======================================
// TODAY'S JOBS
// ======================================

const jobsList = document.getElementById("jobsList");
const addJobButton = document.getElementById("addJobButton");

addJobButton?.addEventListener("click", () => openEntryModal({
    type: "job",
    title: "Add Today's Job",
    subtitle: "Add a job you need to complete today.",
    placeholder: "e.g. Finish McKenzie's pyjamas"
}));

function addJob(value) {
    if (!value?.trim()) return;
    jobs.push(value.trim());
    saveJobs();
}

function saveJobs() {
    localStorage.setItem("todayJobs", JSON.stringify(jobs));
    loadJobs();
}

function loadJobs() {
    if (!jobsList) return;

    jobsList.innerHTML = "";

    jobs.forEach((job, index) => {
        const li = document.createElement("li");

        li.innerHTML = `
            <span></span>
            <div>
                <button class="completeButton" title="Complete">✅</button>
                <button class="deleteButton" title="Delete">🗑️</button>
            </div>
        `;

        li.querySelector("span").textContent = job;

        li.querySelector(".completeButton").addEventListener("click", () => {
            jobs.splice(index, 1);
            saveJobs();
        });

        li.querySelector(".deleteButton").addEventListener("click", () => {
            if (!confirm("Delete this job?")) return;
            jobs.splice(index, 1);
            saveJobs();
        });

        jobsList.appendChild(li);
    });
}

loadJobs();

// ======================================
// NOTES
// ======================================

const notesList = document.getElementById("notesList");
const addNoteButton = document.getElementById("addNoteButton");

addNoteButton?.addEventListener("click", () => openEntryModal({
    type: "note",
    title: "Add Note",
    subtitle: "Add a note for your business dashboard.",
    placeholder: "Type your note here..."
}));

function addNote(value) {
    if (!value?.trim()) return;
    notes.push(value.trim());
    saveNotes();
}

function saveNotes() {
    localStorage.setItem("notes", JSON.stringify(notes));
    loadNotes();
}

function loadNotes() {
    if (!notesList) return;

    notesList.innerHTML = "";

    notes.forEach((note, index) => {
        const li = document.createElement("li");

        li.innerHTML = `
            <span></span>
            <div>
                <button class="editButton" title="Edit">✏️</button>
                <button class="deleteButton" title="Delete">🗑️</button>
            </div>
        `;

        li.querySelector("span").textContent = note;

        li.querySelector(".editButton").addEventListener("click", () => {
            openEntryModal({
                type: "edit-note",
                title: "Edit Note",
                subtitle: "Update your note below.",
                placeholder: "Type your note here...",
                value: notes[index],
                onSave: (updated) => {
                    if (!updated.trim()) {
                        notes.splice(index, 1);
                    } else {
                        notes[index] = updated.trim();
                    }
                    saveNotes();
                }
            });
        });

        li.querySelector(".deleteButton").addEventListener("click", () => {
            if (!confirm("Delete this note?")) return;
            notes.splice(index, 1);
            saveNotes();
        });

        notesList.appendChild(li);
    });
}

loadNotes();

// ======================================
// COLLAPSIBLE CARDS
// ======================================

document.querySelectorAll(".toggleButton").forEach((button) => {
    const card = button.closest(".dashboardCard");
    const content = card?.querySelector(".cardContent");
    if (!content) return;

    // Start collapsed every time the dashboard opens.
    content.style.display = "none";
    button.textContent = "▶";

    button.addEventListener("click", () => {
        const closed = content.style.display === "none";

        content.style.display = closed ? "block" : "none";
        button.textContent = closed ? "▼" : "▶";
    });
});

// ======================================
// DASHBOARD
// ======================================

function updateDashboard() {
    updateStats();
    calculateDueDates();
    loadNextOrder();
    loadOutstandingPayments();
    calculateRevenue();
}

function updateStats() {
    const totalOrders = document.getElementById("totalOrders");
    const pendingOrders = document.getElementById("pendingOrders");

    if (totalOrders) {
        totalOrders.textContent = orders.length;
    }

    const pending = orders.filter(order => {
        // Supabase uses order_status
        const status = String(
            order.order_status ||
            order.orderStatus ||
            ""
        ).trim().toLowerCase();

        // Completed and cancelled orders are NOT pending
        return status !== "completed" && status !== "cancelled";
    });

    if (pendingOrders) {
        pendingOrders.textContent = pending.length;
    }
}

// ======================================
// DATE HELPERS
// ======================================

function parseDate(value) {
    if (!value) return null;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return date;
}

function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function startOfWeek(date) {
    const d = startOfDay(date);
    const day = d.getDay(); // Sunday = 0
    const diff = day === 0 ? -6 : 1 - day; // Monday start
    d.setDate(d.getDate() + diff);
    return d;
}

function startOfMonth(date) {
    const d = startOfDay(date);
    d.setDate(1);
    return d;
}

function getDateNeeded(order) {
    return parseDate(
        order.dateNeeded ||
        order.date_needed ||
        order.neededBy ||
        order.date_needed_by
    );
}

function getOrderTotal(order) {
    const value =
        order.orderTotal ??
        order.order_total ??
        order.total ??
        order.totalAmount ??
        order.total_amount ??
        order.price ??
        0;

    const number = Number(String(value).replace(/[£,]/g, ""));
    return Number.isFinite(number) ? number : 0;
}

function getDeposit(order) {
    const value =
        order.deposit ??
        order.depositAmount ??
        order.deposit_amount ??
        0;

    const number = Number(String(value).replace(/[£,]/g, ""));
    return Number.isFinite(number) ? number : 0;
}

function getBalance(order) {
    const explicit =
        order.balance ??
        order.remainingBalance ??
        order.remaining_balance;

    if (explicit !== undefined && explicit !== null && explicit !== "") {
        const number = Number(String(explicit).replace(/[£,]/g, ""));
        if (Number.isFinite(number)) return Math.max(0, number);
    }

    return Math.max(0, getOrderTotal(order) - getDeposit(order));
}

function getOrderDate(order) {
    return parseDate(
        order.createdAt ||
        order.created_at ||
        order.orderDate ||
        order.order_date ||
        order.date
    );
}

// ======================================
// DUE DATES
// ======================================

function calculateDueDates() {
    const today = startOfDay(new Date());
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    let week = 0;
    let month = 0;

    orders.forEach(order => {
        const due = getDateNeeded(order);
        if (!due) return;

        const status = String(order.orderStatus || "").toLowerCase();
        if (status === "completed" || status === "cancelled") return;

        const dueDay = startOfDay(due);

        if (dueDay >= today && dueDay <= weekEnd) {
            week++;
        }

        if (
            dueDay.getMonth() === today.getMonth() &&
            dueDay.getFullYear() === today.getFullYear()
        ) {
            month++;
        }
    });

    document.getElementById("dueWeek").textContent = week;
    document.getElementById("dueMonth").textContent = month;
}

// ======================================
// NEXT ORDER
// ======================================

function loadNextOrder() {
    const nextOrderCard = document.getElementById("nextOrderCard");
    if (!nextOrderCard) return;

    const activeOrders = orders
        .map(order => ({ order, due: getDateNeeded(order) }))
        .filter(({ order, due }) => {
            const status = String(order.orderStatus || "").toLowerCase();
            return due && status !== "completed" && status !== "cancelled";
        })
        .sort((a, b) => a.due - b.due);

    if (activeOrders.length === 0) {
        nextOrderCard.innerHTML = "<p>No upcoming orders.</p>";
        return;
    }

    const next = activeOrders[0].order;
    const due = activeOrders[0].due;
    const today = startOfDay(new Date());
    const dueDay = startOfDay(due);
    const days = Math.round((dueDay - today) / 86400000);

    let dueText = "";

    if (days < 0) {
        dueText = `⚠️ ${Math.abs(days)} day(s) overdue`;
    } else if (days === 0) {
        dueText = "Today";
    } else {
        dueText = `${days} day(s) remaining`;
    }

    const orderNumber = next.orderNumber || next.order_number || "Order";
    const customerName = next.customerName || next.customer_name || "Customer";
    const status = next.orderStatus || next.order_status || "Unknown";

    nextOrderCard.innerHTML = `
        <h3></h3>
        <p><strong></strong></p>
        <p>📅 ${due.toLocaleDateString("en-GB")}</p>
        <p></p>
        <p>✨ </p>
    `;

    nextOrderCard.querySelector("h3").textContent = orderNumber;
    nextOrderCard.querySelector("strong").textContent = customerName;
    nextOrderCard.querySelectorAll("p")[2].textContent = dueText;
    nextOrderCard.querySelectorAll("p")[3].textContent = `✨ ${status}`;
}

// ======================================
// OUTSTANDING PAYMENTS
// ======================================

function loadOutstandingPayments() {
    const paymentList = document.getElementById("paymentList");
    if (!paymentList) return;

    const outstanding = orders
        .map(order => ({
            order,
            balance: getBalance(order)
        }))
        .filter(item => item.balance > 0);

    if (outstanding.length === 0) {
        paymentList.innerHTML = "<p>No outstanding payments.</p>";
        return;
    }

    paymentList.innerHTML = "";

    outstanding
        .sort((a, b) => b.balance - a.balance)
        .forEach(({ order, balance }) => {
            const row = document.createElement("div");
            row.style.padding = "10px 0";
            row.style.borderBottom = "1px solid #f3e5ec";

            const orderNumber = order.orderNumber || order.order_number || "Order";
            const customerName = order.customerName || order.customer_name || "Customer";

            row.innerHTML = `
                <strong></strong>
                <span style="display:block;margin-top:4px;">£${balance.toFixed(2)} outstanding</span>
            `;

            row.querySelector("strong").textContent = `${orderNumber} — ${customerName}`;
            paymentList.appendChild(row);
        });
}

// ======================================
// REVENUE
// ======================================

function calculateRevenue() {
    const now = new Date();
    const todayStart = startOfDay(now);
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekStart = startOfWeek(now);
    const nextWeek = new Date(weekStart);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const monthStart = startOfMonth(now);
    const nextMonth = new Date(monthStart);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    let today = 0;
    let week = 0;
    let month = 0;
    let total = 0;

    orders.forEach(order => {
        const amount = getOrderTotal(order);
        const orderDate = getOrderDate(order);

        total += amount;

        if (!orderDate) return;

        if (orderDate >= todayStart && orderDate < tomorrow) {
            today += amount;
        }

        if (orderDate >= weekStart && orderDate < nextWeek) {
            week += amount;
        }

        if (orderDate >= monthStart && orderDate < nextMonth) {
            month += amount;
        }
    });

    document.getElementById("todayRevenue").textContent = `£${today.toFixed(2)}`;
    document.getElementById("weekRevenue").textContent = `£${week.toFixed(2)}`;
    document.getElementById("monthRevenue").textContent = `£${month.toFixed(2)}`;
    document.getElementById("totalRevenue").textContent = `£${total.toFixed(2)}`;
}

// ======================================
// LARGE ADD / EDIT MODAL
// ======================================

const entryModal = document.getElementById("entryModal");
const entryModalInput = document.getElementById("entryModalInput");
const entryModalTitle = document.getElementById("entryModalTitle");
const entryModalSubtitle = document.getElementById("entryModalSubtitle");
const saveEntryModal = document.getElementById("saveEntryModal");
const closeEntryModal = document.getElementById("closeEntryModal");
const cancelEntryModal = document.getElementById("cancelEntryModal");
const entryModalBackdrop = document.querySelector(".entryModalBackdrop");

let currentModalSave = null;

function openEntryModal({ type, title, subtitle, placeholder, value = "", onSave = null }) {
    if (!entryModal) return;

    entryModalTitle.textContent = title;
    entryModalSubtitle.textContent = subtitle;
    entryModalInput.placeholder = placeholder;
    entryModalInput.value = value;
    currentModalSave = onSave || ((text) => {
        if (type === "job") addJob(text);
        if (type === "note") addNote(text);
    });

    entryModal.classList.add("active");
    entryModal.setAttribute("aria-hidden", "false");

    setTimeout(() => {
        entryModalInput.focus();
        entryModalInput.setSelectionRange(
            entryModalInput.value.length,
            entryModalInput.value.length
        );
    }, 50);
}

function closeEntryModalWindow() {
    if (!entryModal) return;
    entryModal.classList.remove("active");
    entryModal.setAttribute("aria-hidden", "true");
    entryModalInput.value = "";
    currentModalSave = null;
}

saveEntryModal?.addEventListener("click", () => {
    const value = entryModalInput.value.trim();

    if (!value) {
        entryModalInput.focus();
        return;
    }

    if (currentModalSave) currentModalSave(value);
    closeEntryModalWindow();
});

closeEntryModal?.addEventListener("click", closeEntryModalWindow);
cancelEntryModal?.addEventListener("click", closeEntryModalWindow);
entryModalBackdrop?.addEventListener("click", closeEntryModalWindow);

entryModalInput?.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        saveEntryModal.click();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeEntryModalWindow();
});

// ======================================
// START
// ======================================

(async function startDashboard() {
    const loggedIn = await checkLogin();
    if (!loggedIn) return;

    await loadOrders();
    subscribeToOrders();
})();
