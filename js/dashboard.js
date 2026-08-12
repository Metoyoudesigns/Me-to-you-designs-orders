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
// DASHBOARD DATA
// ======================================

let orders = [];

let jobs =
    JSON.parse(localStorage.getItem("todayJobs")) || [];

let notes =
    JSON.parse(localStorage.getItem("notes")) || [];

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
            console.log(
                "Order realtime status:",
                status
            );
        });
}

// Also refresh every 10 seconds.
// This catches changes even if realtime isn't enabled.
setInterval(loadOrders, 10000);

// ======================================
// TODAY'S JOBS
// ======================================

const jobsList =
    document.getElementById("jobsList");

const addJobButton =
    document.getElementById("addJobButton");

addJobButton?.addEventListener("click", () => {
    openEntryModal({
        type: "job",
        title: "Add Today's Job",
        subtitle:
            "Add a job you need to complete today.",
        placeholder:
            "e.g. Finish McKenzie's pyjamas"
    });
});

function addJob(value) {
    if (!value?.trim()) return;

    jobs.push(value.trim());

    saveJobs();
}

function saveJobs() {
    localStorage.setItem(
        "todayJobs",
        JSON.stringify(jobs)
    );

    loadJobs();
}

function loadJobs() {
    if (!jobsList) return;

    jobsList.innerHTML = "";

    jobs.forEach((job, index) => {
        const li =
            document.createElement("li");

        li.innerHTML = `
            <span></span>

            <div>
                <button
                    class="completeButton"
                    title="Complete">
                    ✅
                </button>

                <button
                    class="deleteButton"
                    title="Delete">
                    🗑️
                </button>
            </div>
        `;

        li.querySelector("span")
            .textContent = job;

        li.querySelector(
            ".completeButton"
        ).addEventListener("click", () => {
            jobs.splice(index, 1);
            saveJobs();
        });

        li.querySelector(
            ".deleteButton"
        ).addEventListener("click", () => {
            if (!confirm("Delete this job?"))
                return;

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

const notesList =
    document.getElementById("notesList");

const addNoteButton =
    document.getElementById("addNoteButton");

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

function addNote(value) {
    if (!value?.trim()) return;

    notes.push(value.trim());

    saveNotes();
}

function saveNotes() {
    localStorage.setItem(
        "notes",
        JSON.stringify(notes)
    );

    loadNotes();
}

function loadNotes() {
    if (!notesList) return;

    notesList.innerHTML = "";

    notes.forEach((note, index) => {
        const li =
            document.createElement("li");

        li.innerHTML = `
            <span></span>

            <div>
                <button
                    class="editButton"
                    title="Edit">
                    ✏️
                </button>

                <button
                    class="deleteButton"
                    title="Delete">
                    🗑️
                </button>
            </div>
        `;

        li.querySelector("span")
            .textContent = note;

        li.querySelector(
            ".editButton"
        ).addEventListener("click", () => {

            openEntryModal({
                type: "edit-note",
                title: "Edit Note",
                subtitle:
                    "Update your note below.",
                placeholder:
                    "Type your note here...",
                value: notes[index],

                onSave: (updated) => {
                    if (!updated.trim()) {
                        notes.splice(index, 1);
                    } else {
                        notes[index] =
                            updated.trim();
                    }

                    saveNotes();
                }
            });
        });

        li.querySelector(
            ".deleteButton"
        ).addEventListener("click", () => {

            if (!confirm("Delete this note?"))
                return;

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

document
    .querySelectorAll(".toggleButton")
    .forEach((button) => {

        const card =
            button.closest(".dashboardCard");

        const content =
            card?.querySelector(".cardContent");

        if (!content) return;

        content.style.display = "none";

        button.textContent = "▶";

        button.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

                const closed =
                    content.style.display ===
                    "none";

                if (closed) {
                    content.style.display =
                        "block";

                    button.textContent = "▼";
                } else {
                    content.style.display =
                        "none";

                    button.textContent = "▶";
                }
            }
        );
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

// ======================================
// STATS
// ======================================

function updateStats() {

    const totalOrders =
        document.getElementById(
            "totalOrders"
        );

    const pendingOrders =
        document.getElementById(
            "pendingOrders"
        );

    // TOTAL ORDERS
    if (totalOrders) {
        totalOrders.textContent =
            orders.length;
    }

    // PENDING ORDERS
    //
    // IMPORTANT:
    // Supabase uses order_status.
    //
    // Completed = NOT pending
    // Cancelled = NOT pending
    //
    const pending =
        orders.filter(order => {

            const status =
                String(
                    order.order_status ||
                    order.orderStatus ||
                    ""
                )
                .trim()
                .toLowerCase();

            return (
                status !== "completed" &&
                status !== "cancelled"
            );
        });

    if (pendingOrders) {
        pendingOrders.textContent =
            pending.length;
    }
}

// ======================================
// DATE HELPERS
// ======================================

function parseDate(value) {

    if (!value) return null;

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return null;
    }

    return date;
}

function startOfDay(date) {

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

function startOfWeek(date) {

    const d =
        startOfDay(date);

    const day =
        d.getDay();

    const diff =
        day === 0
            ? -6
            : 1 - day;

    d.setDate(
        d.getDate() + diff
    );

    return d;
}

function startOfMonth(date) {

    const d =
        startOfDay(date);

    d.setDate(1);

    return d;
}

// ======================================
// DATE NEEDED
// ======================================

function getDateNeeded(order) {

    return parseDate(

        order.date_needed ||

        order.dateNeeded ||

        order.neededBy ||

        order.date_needed_by

    );
}

// ======================================
// ORDER TOTAL
// ======================================

function getOrderTotal(order) {

    const value =

        order.order_total ??

        order.orderTotal ??

        order.total ??

        order.totalAmount ??

        order.total_amount ??

        order.price ??

        0;

    const number =
        Number(
            String(value)
                .replace(/[£,]/g, "")
        );

    return Number.isFinite(number)
        ? number
        : 0;
}

// ======================================
// TOTAL PAID
// ======================================

function getDeposit(order) {

    const value =

        order.total_paid ??

        order.totalPaid ??

        order.deposit ??

        order.depositAmount ??

        order.deposit_amount ??

        0;

    const number =
        Number(
            String(value)
                .replace(/[£,]/g, "")
        );

    return Number.isFinite(number)
        ? number
        : 0;
}

// ======================================
// BALANCE
// ======================================

function getBalance(order) {

    const explicit =

        order.remaining_balance ??

        order.remainingBalance ??

        order.balance;

    if (
        explicit !== undefined &&
        explicit !== null &&
        explicit !== ""
    ) {

        const number =
            Number(
                String(explicit)
                    .replace(/[£,]/g, "")
            );

        if (
            Number.isFinite(number)
        ) {
            return Math.max(
                0,
                number
            );
        }
    }

    return Math.max(
        0,
        getOrderTotal(order) -
        getDeposit(order)
    );
}

// ======================================
// ORDER DATE
// ======================================

function getOrderDate(order) {

    return parseDate(

        order.order_date ||

        order.orderDate ||

        order.created_at ||

        order.createdAt ||

        order.date

    );
}

// ======================================
// DUE DATES
// ======================================

function calculateDueDates() {

    const today =
        startOfDay(
            new Date()
        );

    /*
     * Monday → Sunday
     *
     * This is the important bit:
     * "Due This Week" only includes
     * orders whose date_needed is
     * actually inside THIS calendar week.
     */

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

        const due =
            getDateNeeded(order);

        if (!due) return;

        const status =
            String(
                order.order_status ||
                order.orderStatus ||
                ""
            )
            .trim()
            .toLowerCase();

        // Completed and cancelled orders
        // should not appear as due.
        if (
            status === "completed" ||
            status === "cancelled"
        ) {
            return;
        }

        const dueDay =
            startOfDay(due);

        // THIS WEEK
        if (
            dueDay >= weekStart &&
            dueDay < weekEnd
        ) {
            week++;
        }

        // THIS MONTH
        if (
            dueDay >= monthStart &&
            dueDay < monthEnd
        ) {
            month++;
        }
    });

    const dueWeek =
        document.getElementById(
            "dueWeek"
        );

    const dueMonth =
        document.getElementById(
            "dueMonth"
        );

    if (dueWeek) {
        dueWeek.textContent =
            week;
    }

    if (dueMonth) {
        dueMonth.textContent =
            month;
    }
}

// ======================================
// NEXT ORDER
// ======================================

function loadNextOrder() {

    const nextOrderCard =
        document.getElementById(
            "nextOrderCard"
        );

    if (!nextOrderCard) return;

    const today =
        startOfDay(
            new Date()
        );

    const activeOrders = orders

        .map(order => ({
            order,
            due:
                getDateNeeded(order)
        }))

        .filter(({ order, due }) => {

            if (!due) return false;

            const status =
                String(
                    order.order_status ||
                    order.orderStatus ||
                    ""
                )
                .trim()
                .toLowerCase();

            return (
                status !== "completed" &&
                status !== "cancelled"
            );
        })

        .sort(
            (a, b) =>
                a.due - b.due
        );

    if (
        activeOrders.length === 0
    ) {

        nextOrderCard.innerHTML =
            "<p>No upcoming orders.</p>";

        return;
    }

    const next =
        activeOrders[0].order;

    const due =
        activeOrders[0].due;

    const dueDay =
        startOfDay(due);

    const days =
        Math.round(
            (
                dueDay - today
            ) / 86400000
        );

    let dueText = "";

    if (days < 0) {

        dueText =
            `⚠️ ${Math.abs(days)} day(s) overdue`;

    } else if (days === 0) {

        dueText = "Today";

    } else {

        dueText =
            `${days} day(s) remaining`;
    }

    const orderNumber =
        next.order_number ||
        next.orderNumber ||
        "Order";

    const customerName =
        next.customer_name ||
        next.customerName ||
        "Customer";

    const status =
        next.order_status ||
        next.orderStatus ||
        "Unknown";

    nextOrderCard.innerHTML = `
        <h3></h3>

        <p>
            <strong></strong>
        </p>

        <p>
            📅 ${due.toLocaleDateString("en-GB")}
        </p>

        <p></p>

        <p>✨ </p>
    `;

    nextOrderCard
        .querySelector("h3")
        .textContent =
        orderNumber;

    nextOrderCard
        .querySelector("strong")
        .textContent =
        customerName;

    nextOrderCard
        .querySelectorAll("p")[2]
        .textContent =
        dueText;

    nextOrderCard
        .querySelectorAll("p")[3]
        .textContent =
        `✨ ${status}`;
}

// ======================================
// OUTSTANDING PAYMENTS
// ======================================

function loadOutstandingPayments() {

    const paymentList =
        document.getElementById(
            "paymentList"
        );

    if (!paymentList) return;

    const outstanding =
        orders

            .map(order => ({
                order,

                balance:
                    getBalance(order)
            }))

            .filter(
                item =>
                    item.balance > 0
            );

    if (
        outstanding.length === 0
    ) {

        paymentList.innerHTML =
            "<p>No outstanding payments.</p>";

        return;
    }

    paymentList.innerHTML = "";

    outstanding

        .sort(
            (a, b) =>
                b.balance -
                a.balance
        )

        .forEach(
            ({ order, balance }) => {

                const row =
                    document.createElement(
                        "div"
                    );

                row.style.padding =
                    "10px 0";

                row.style.borderBottom =
                    "1px solid #f3e5ec";

                const orderNumber =
                    order.order_number ||
                    order.orderNumber ||
                    "Order";

                const customerName =
                    order.customer_name ||
                    order.customerName ||
                    "Customer";

                row.innerHTML = `
                    <strong></strong>

                    <span
                        style="
                            display:block;
                            margin-top:4px;
                        "
                    >
                        £${balance.toFixed(2)}
                        outstanding
                    </span>
                `;

                row.querySelector(
                    "strong"
                ).textContent =
                    `${orderNumber} — ${customerName}`;

                paymentList.appendChild(
                    row
                );
            }
        );
}

// ======================================
// REVENUE
// ======================================

function calculateRevenue() {

    const now =
        new Date();

    const todayStart =
        startOfDay(now);

    const tomorrow =
        new Date(
            todayStart
        );

    tomorrow.setDate(
        tomorrow.getDate() + 1
    );

    const weekStart =
        startOfWeek(now);

    const nextWeek =
        new Date(
            weekStart
        );

    nextWeek.setDate(
        nextWeek.getDate() + 7
    );

    const monthStart =
        startOfMonth(now);

    const nextMonth =
        new Date(
            monthStart
        );

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

        const orderDate =
            getOrderDate(order);

        total += amount;

        if (!orderDate) return;

        if (
            orderDate >= todayStart &&
            orderDate < tomorrow
        ) {
            today += amount;
        }

        if (
            orderDate >= weekStart &&
            orderDate < nextWeek
        ) {
            week += amount;
        }

        if (
            orderDate >= monthStart &&
            orderDate < nextMonth
        ) {
            month += amount;
        }
    });

    const todayRevenue =
        document.getElementById(
            "todayRevenue"
        );

    const weekRevenue =
        document.getElementById(
            "weekRevenue"
        );

    const monthRevenue =
        document.getElementById(
            "monthRevenue"
        );

    const totalRevenue =
        document.getElementById(
            "totalRevenue"
        );

    if (todayRevenue) {
        todayRevenue.textContent =
            `£${today.toFixed(2)}`;
    }

    if (weekRevenue) {
        weekRevenue.textContent =
            `£${week.toFixed(2)}`;
    }

    if (monthRevenue) {
        monthRevenue.textContent =
            `£${month.toFixed(2)}`;
    }

    if (totalRevenue) {
        totalRevenue.textContent =
            `£${total.toFixed(2)}`;
    }
}

// ======================================
// ENTRY MODAL
// ======================================

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
}) {

    if (!entryModal) return;

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

            if (type === "job") {
                addJob(text);
            }

            if (type === "note") {
                addNote(text);
            }
        });

    entryModal.classList.add(
        "active"
    );

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

    }, 50);
}

function closeEntryModalWindow() {

    if (!entryModal) return;

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

        if (!value) {

            entryModalInput.focus();

            return;
        }

        if (currentModalSave) {
            currentModalSave(value);
        }

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
    (event) => {

        if (
            (event.ctrlKey ||
                event.metaKey) &&
            event.key === "Enter"
        ) {
            saveEntryModal.click();
        }
    }
);

document.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Escape") {
            closeEntryModalWindow();
        }
    }
);

// ======================================
// START DASHBOARD
// ======================================

(async function startDashboard() {

    const loggedIn =
        await checkLogin();

    if (!loggedIn) return;

    await loadOrders();

    subscribeToOrders();

})();
