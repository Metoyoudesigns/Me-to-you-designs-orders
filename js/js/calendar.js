import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://critutqwakaepgxgpkml.supabase.co";
const SUPABASE_KEY = "sb_publishable_KtXAtIRgtZADPODLn7inRw_vC6rBPFb";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

"use strict";

const $ = id => document.getElementById(id);

const state = {
    current: new Date(),
    selected: new Date(),
    entries: JSON.parse(localStorage.getItem("mtydBusinessEntries") || "[]"),
    journals: JSON.parse(localStorage.getItem("mtydBusinessJournals") || "[]"),
    seasons: JSON.parse(localStorage.getItem("mtydSeasonPlans") || "[]"),
    orders: []
};

// =====================================================
// HELPERS
// =====================================================

function pad(number) {
    return String(number).padStart(2, "0");
}

function dateKey(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromKey(key) {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function formatDate(date) {
    return date.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

function shortDate(date) {
    return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short"
    });
}

function money(value) {
    return `£${(Number(value) || 0).toFixed(2)}`;
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[character]));
}

function saveLocal() {
    localStorage.setItem(
        "mtydBusinessEntries",
        JSON.stringify(state.entries)
    );

    localStorage.setItem(
        "mtydBusinessJournals",
        JSON.stringify(state.journals)
    );

    localStorage.setItem(
        "mtydSeasonPlans",
        JSON.stringify(state.seasons)
    );
}

// =====================================================
// LOGIN
// =====================================================

async function checkLogin() {

    const { data, error } =
        await supabase.auth.getSession();

    if (error || !data.session) {
        location.href = "index.html";
        return false;
    }

    return true;
}

// =====================================================
// MENU
// =====================================================

function initMenu() {

    const menuButton = $("menuButton");
    const sideMenu = $("sideMenu");
    const overlay = $("overlay");

    menuButton?.addEventListener("click", () => {

        sideMenu.classList.add("active");
        overlay.classList.add("active");

    });

    overlay?.addEventListener("click", () => {

        sideMenu.classList.remove("active");
        overlay.classList.remove("active");

    });

    $("logoutButton")?.addEventListener("click", async event => {

        event.preventDefault();

        await supabase.auth.signOut();

        location.href = "index.html";

    });
}

// =====================================================
// DATE
// =====================================================

function initDate() {

    const todayDate = $("todayDate");

    if (todayDate) {
        todayDate.textContent = formatDate(new Date());
    }
}

// =====================================================
// LOAD ORDERS
// =====================================================

async function loadOrders() {

    const { data, error } =
        await supabase
            .from("orders")
            .select("*");

    if (error) {

        console.error(
            "Could not load orders:",
            error
        );

        state.orders = [];

        return;
    }

    state.orders = data || [];
}

// =====================================================
// ORDER DUE DATE
// =====================================================

function orderDate(order) {

    if (!order.date_needed) {
        return null;
    }

    const raw =
        String(order.date_needed).slice(0, 10);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return null;
    }

    return fromKey(raw);
}

// =====================================================
// ORDER NAME
// =====================================================

function orderName(order) {

    return `${order.order_number || "Order"} — ${order.customer_name || "Customer"}`;
}

// =====================================================
// EVENTS FOR DATE
// =====================================================

function eventsForKey(key) {

    const events =
        state.entries
            .filter(entry => entry.date === key)
            .map(entry => ({
                id: entry.id,
                title: entry.title,
                category: entry.category,
                priority: entry.priority,
                type: "entry",
                notes: entry.notes,
                time: entry.time
            }));

    // Add existing customer orders automatically
    state.orders.forEach(order => {

        const dueDate = orderDate(order);

        if (
            dueDate &&
            dateKey(dueDate) === key
        ) {

            events.push({
                id: `order-${order.id || order.order_number}`,
                title: orderName(order),
                category: "customer",
                priority: "normal",
                type: "order",
                notes:
                    `Due order • ${order.order_status || "Status unknown"}`,
                time: ""
            });
        }
    });

    return events;
}

// =====================================================
// CALENDAR
// =====================================================

function renderCalendar() {

    const year =
        state.current.getFullYear();

    const month =
        state.current.getMonth();

    $("monthTitle").textContent =
        state.current.toLocaleDateString(
            "en-GB",
            {
                month: "long",
                year: "numeric"
            }
        );

    const grid =
        $("calendarGrid");

    grid.innerHTML = "";

    const firstDay =
        new Date(year, month, 1);

    const offset =
        (firstDay.getDay() + 6) % 7;

    const daysInMonth =
        new Date(year, month + 1, 0)
            .getDate();

    const previousMonthDays =
        new Date(year, month, 0)
            .getDate();

    for (let i = 0; i < 42; i++) {

        const cell =
            document.createElement("div");

        cell.className =
            "calendarDay";

        let dayNumber;
        let cellDate;

        if (i < offset) {

            dayNumber =
                previousMonthDays -
                offset +
                i +
                1;

            cellDate =
                new Date(
                    year,
                    month - 1,
                    dayNumber
                );

            cell.classList.add(
                "otherMonth"
            );

        } else if (
            i >=
            offset + daysInMonth
        ) {

            dayNumber =
                i -
                offset -
                daysInMonth +
                1;

            cellDate =
                new Date(
                    year,
                    month + 1,
                    dayNumber
                );

            cell.classList.add(
                "otherMonth"
            );

        } else {

            dayNumber =
                i - offset + 1;

            cellDate =
                new Date(
                    year,
                    month,
                    dayNumber
                );
        }

        const key =
            dateKey(cellDate);

        if (
            key ===
            dateKey(new Date())
        ) {
            cell.classList.add("today");
        }

        if (
            key ===
            dateKey(state.selected)
        ) {
            cell.classList.add("selected");
        }

        cell.innerHTML = `
            <div class="dayNumber">
                ${dayNumber}
            </div>
        `;

        const events =
            eventsForKey(key);

        events
            .slice(0, 3)
            .forEach(event => {

                const dot =
                    document.createElement("div");

                dot.className =
                    `eventDot ${event.category}`;

                dot.textContent =
                    `${event.time ? event.time + " " : ""}${event.title}`;

                cell.appendChild(dot);
            });

        if (events.length > 3) {

            const more =
                document.createElement("div");

            more.className =
                "moreEvents";

            more.textContent =
                `+ ${events.length - 3} more`;

            cell.appendChild(more);
        }

        cell.addEventListener(
            "click",
            () => {

                state.selected =
                    cellDate;

                if (
                    cellDate.getMonth() !==
                    state.current.getMonth()
                ) {

                    state.current =
                        new Date(
                            cellDate.getFullYear(),
                            cellDate.getMonth(),
                            1
                        );
                }

                renderCalendar();
                renderSelectedDay();

            }
        );

        grid.appendChild(cell);
    }
}

// =====================================================
// SELECTED DAY
// =====================================================

function renderSelectedDay() {

    const key =
        dateKey(state.selected);

    $("selectedDateTitle").textContent =
        formatDate(state.selected);

    // Customer orders
    const orders =
        state.orders.filter(order => {

            const due =
                orderDate(order);

            return (
                due &&
                dateKey(due) === key
            );
        });

    $("selectedOrders").innerHTML =
        orders.length

            ? orders.map(order => `
                <div class="miniItem">

                    <strong>
                        ${escapeHtml(
                            orderName(order)
                        )}
                    </strong>

                    <small>
                        ${escapeHtml(
                            order.order_status || ""
                        )}

                        ${
                            order.order_total
                                ? " • " +
                                  money(
                                      order.order_total
                                  )
                                : ""
                        }
                    </small>

                </div>
            `).join("")

            : `
                <div class="empty">
                    No customer orders due today.
                </div>
            `;

    // Business tasks
    const tasks =
        state.entries.filter(
            entry => entry.date === key
        );

    $("selectedTasks").innerHTML =
        tasks.length

            ? tasks.map(entry => `
                <div class="miniItem taskRow">

                    <span>
                        ${escapeHtml(
                            entry.title
                        )}
                    </span>

                    <button
                        title="Delete"
                        data-delete="${entry.id}"
                    >
                        🗑️
                    </button>

                </div>
            `).join("")

            : `
                <div class="empty">
                    No planned tasks for this date.
                </div>
            `;

    tasks.forEach(entry => {

        const button =
            document.querySelector(
                `[data-delete="${CSS.escape(entry.id)}"]`
            );

        button?.addEventListener(
            "click",
            () => {

                state.entries =
                    state.entries.filter(
                        item =>
                            item.id !==
                            entry.id
                    );

                saveLocal();

                renderAll();

            }
        );
    });

    // Journal
    const journal =
        state.journals.find(
            item => item.date === key
        );

    $("journalText").value =
        journal?.text || "";
}

// =====================================================
// UPCOMING BUSINESS
// =====================================================

function renderUpcoming() {

    const today =
        dateKey(new Date());

    const items = [];

    // Business tasks
    state.entries
        .filter(entry =>
            entry.date >= today
        )
        .forEach(entry => {

            items.push({
                date: fromKey(entry.date),
                title: entry.title,
                category: entry.category,
                source: "Business task"
            });

        });

    // Customer orders
    state.orders.forEach(order => {

        const due =
            orderDate(order);

        if (
            due &&
            dateKey(due) >= today
        ) {

            items.push({
                date: due,
                title: orderName(order),
                category: "customer",
                source: "Customer order"
            });
        }
    });

    items.sort(
        (a, b) =>
            a.date - b.date
    );

    $("upcomingList").innerHTML =
        items
            .slice(0, 12)
            .map(item => `
                <div class="upcomingItem">

                    <strong>
                        ${escapeHtml(
                            item.title
                        )}
                    </strong>

                    <small>
                        ${shortDate(
                            item.date
                        )}

                        •
                        ${escapeHtml(
                            item.source
                        )}
                    </small>

                </div>
            `)
            .join("")

        ||

        `
            <div class="empty">
                Nothing upcoming yet.
            </div>
        `;
}

// =====================================================
// SEASONAL PLANNER
// =====================================================

function renderSeasonal() {

    const year =
        new Date().getFullYear();

    const defaults = [

        {
            name: "🎃 Halloween",
            date: `${year}-10-31`,
            goal:
                "Plan Halloween products, stock, samples and marketing."
        },

        {
            name: "🎄 Christmas",
            date: `${year}-12-25`,
            goal:
                "Plan Christmas stock, designs, launch and order deadlines."
        },

        {
            name: "💕 Valentine's Day",
            date: `${year + 1}-02-14`,
            goal:
                "Plan Valentine's products and content."
        },

        {
            name: "🐣 Easter",
            date: `${year + 1}-04-05`,
            goal:
                "Plan Easter products and seasonal marketing."
        }

    ];

    const plans = [
        ...defaults,
        ...state.seasons.map(plan => ({
            name: plan.season,
            date: plan.date,
            goal: plan.goal,
            notes: plan.notes
        }))
    ];

    $("seasonalCards").innerHTML =
        plans.map(plan => `

            <div class="seasonCard">

                <h3>
                    ${escapeHtml(
                        plan.name
                    )}
                </h3>

                <div class="planDate">
                    ${
                        plan.date
                            ? shortDate(
                                fromKey(
                                    plan.date
                                )
                              )
                            : ""
                    }
                </div>

                <p>
                    ${escapeHtml(
                        plan.goal || ""
                    )}
                </p>

                ${
                    plan.notes
                        ? `
                            <p>
                                ${escapeHtml(
                                    plan.notes
                                )}
                            </p>
                        `
                        : ""
                }

            </div>

        `).join("");
}

// =====================================================
// JOURNAL ARCHIVE
// =====================================================

function renderJournalArchive() {

    const search =
        (
            $("journalSearch").value ||
            ""
        )
        .toLowerCase()
        .trim();

    const entries =
        state.journals
            .filter(journal =>
                !search ||
                `${journal.date} ${journal.text}`
                    .toLowerCase()
                    .includes(search)
            )
            .sort(
                (a, b) =>
                    b.date.localeCompare(
                        a.date
                    )
            );

    $("journalArchive").innerHTML =
        entries.map(journal => `

            <article class="journalEntry">

                <header>

                    <div>

                        <strong>
                            ${formatDate(
                                fromKey(
                                    journal.date
                                )
                            )}
                        </strong>

                        <small>
                            ${journal.date}
                        </small>

                    </div>

                    <button
                        class="deleteMini"
                        data-journal="${journal.id}"
                    >
                        Delete
                    </button>

                </header>

                <p>
                    ${escapeHtml(
                        journal.text
                    )}
                </p>

            </article>

        `).join("")

        ||

        `
            <div class="empty">
                Your business journal will appear here.
            </div>
        `;

    entries.forEach(journal => {

        const button =
            document.querySelector(
                `[data-journal="${CSS.escape(journal.id)}"]`
            );

        button?.addEventListener(
            "click",
            () => {

                state.journals =
                    state.journals.filter(
                        item =>
                            item.id !==
                            journal.id
                    );

                saveLocal();

                renderJournalArchive();

            }
        );
    });
}

// =====================================================
// QUICK STATS
// =====================================================

function renderStats() {

    const today =
        dateKey(new Date());

    const upcoming =
        state.orders.filter(order => {

            const due =
                orderDate(order);

            return (
                due &&
                dateKey(due) >= today
            );

        }).length;

    const now =
        new Date();

    const monthStart =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        );

    const nextMonth =
        new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            1
        );

    let received = 0;

    state.orders.forEach(order => {

        if (!order.created_at) {
            return;
        }

        const created =
            new Date(
                order.created_at
            );

        if (
            created >= monthStart &&
            created < nextMonth
        ) {

            received +=
                Number(
                    order.total_paid
                ) || 0;
        }
    });

    $("upcomingOrders").textContent =
        upcoming;

    $("monthPayments").textContent =
        money(received);

    $("tasksDue").textContent =
        state.entries.filter(
            entry =>
                entry.date >= today
        ).length;

    $("importantCount").textContent =
        state.entries.filter(
            entry =>
                entry.priority ===
                    "important" ||
                entry.priority ===
                    "urgent"
        ).length;
}

// =====================================================
// SEASON COUNTDOWNS
// =====================================================

function startOf(date) {

    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
    );
}

function countdown(month, day) {

    const now =
        new Date();

    let target =
        new Date(
            now.getFullYear(),
            month,
            day
        );

    if (target < now) {

        target =
            new Date(
                now.getFullYear() + 1,
                month,
                day
            );
    }

    const days =
        Math.ceil(
            (
                startOf(target) -
                startOf(now)
            ) /
            86400000
        );

    return `${days} day${days === 1 ? "" : "s"} away`;
}

function renderSeasonCountdowns() {

    $("halloweenCountdown").textContent =
        countdown(9, 31);

    $("christmasCountdown").textContent =
        countdown(11, 25);
}

// =====================================================
// RENDER EVERYTHING
// =====================================================

function renderAll() {

    renderCalendar();
    renderSelectedDay();
    renderUpcoming();
    renderSeasonal();
    renderJournalArchive();
    renderStats();
    renderSeasonCountdowns();
}

// =====================================================
// ENTRY MODAL
// =====================================================

function resetEntryModal() {

    $("entryTitle").value = "";
    $("entryTime").value = "";
    $("entryCategory").value = "business";
    $("entryPriority").value = "normal";
    $("entryNotes").value = "";

    $("entryDate").value =
        dateKey(state.selected);
}

function openModal(id) {

    const modal = $(id);

    if (!modal) return;

    modal.classList.add("active");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );
}

function closeModal(id) {

    const modal = $(id);

    if (!modal) return;

    modal.classList.remove("active");

    modal.setAttribute(
        "aria-hidden",
        "true"
    );
}

// =====================================================
// SAVE BUSINESS ENTRY
// =====================================================

function saveEntry() {

    const title =
        $("entryTitle").value.trim();

    const date =
        $("entryDate").value;

    if (!title || !date) {

        alert(
            "Please enter a title and date."
        );

        return;
    }

    state.entries.push({

        id:
            crypto.randomUUID(),

        title,

        date,

        time:
            $("entryTime").value,

        category:
            $("entryCategory").value,

        priority:
            $("entryPriority").value,

        notes:
            $("entryNotes")
                .value
                .trim()

    });

    saveLocal();

    closeModal("entryModal");

    renderAll();
}

// =====================================================
// SAVE JOURNAL
// =====================================================

function saveJournal() {

    const text =
        $("journalText")
            .value
            .trim();

    const key =
        dateKey(state.selected);

    state.journals =
        state.journals.filter(
            journal =>
                journal.date !== key
        );

    if (text) {

        state.journals.push({

            id:
                crypto.randomUUID(),

            date:
                key,

            text

        });
    }

    saveLocal();

    renderAll();
}

// =====================================================
// SAVE SEASONAL PLAN
// =====================================================

function saveSeason() {

    const goal =
        $("seasonGoal")
            .value
            .trim();

    const date =
        $("seasonDate")
            .value;

    if (!goal) {

        alert(
            "Please enter a plan or goal."
        );

        return;
    }

    state.seasons.push({

        id:
            crypto.randomUUID(),

        season:
            $("seasonName").value,

        goal,

        date,

        notes:
            $("seasonNotes")
                .value
                .trim()

    });

    saveLocal();

    closeModal("seasonModal");

    $("seasonGoal").value = "";
    $("seasonDate").value = "";
    $("seasonNotes").value = "";

    renderAll();
}

// =====================================================
// INITIALISE
// =====================================================

function init() {

    initMenu();

    initDate();

    // Previous month
    $("prevMonth").onclick = () => {

        state.current.setMonth(
            state.current.getMonth() - 1
        );

        renderCalendar();
    };

    // Next month
    $("nextMonth").onclick = () => {

        state.current.setMonth(
            state.current.getMonth() + 1
        );

        renderCalendar();
    };

    // Today
    $("todayButton").onclick = () => {

        state.current =
            new Date();

        state.selected =
            new Date();

        renderAll();
    };

    // Add entry
    $("addEntryButton").onclick = () => {

        resetEntryModal();

        openModal(
            "entryModal"
        );
    };

    // New journal
    $("newJournalButton").onclick = () => {

        state.selected =
            new Date();

        state.current =
            new Date();

        renderAll();

        $("journalText").focus();
    };

    // Save entry
    $("saveEntry").onclick =
        saveEntry;

    // Save journal
    $("saveJournal").onclick =
        saveJournal;

    // Save seasonal plan
    $("saveSeason").onclick =
        saveSeason;

    // Add seasonal plan
    $("addSeasonPlan").onclick =
        () => {

            openModal(
                "seasonModal"
            );
        };

    // Close entry modal
    $("cancelModal").onclick =
        () => closeModal(
            "entryModal"
        );

    $("closeModal").onclick =
        () => closeModal(
            "entryModal"
        );

    // Close season modal
    $("cancelSeason").onclick =
        () => closeModal(
            "seasonModal"
        );

    $("closeSeasonModal").onclick =
        () => closeModal(
            "seasonModal"
        );

    // Click outside modal
    document
        .querySelectorAll(
            ".modalBackdrop"
        )
        .forEach(backdrop => {

            backdrop.onclick = () => {

                backdrop
                    .parentElement
                    .classList
                    .remove(
                        "active"
                    );
            };

        });

    // Collapsible sections
    document
        .querySelectorAll(
            ".toggleButton"
        )
        .forEach(button => {

            const card =
                button.closest(
                    ".dashboardCard"
                );

            const content =
                card?.querySelector(
                    ".cardContent"
                );

            if (!content) {
                return;
            }

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

    // Journal search
    $("journalSearch")
        .addEventListener(
            "input",
            renderJournalArchive
        );

    // First render
    renderAll();
}

// =====================================================
// START
// =====================================================

(async () => {

    if (!(await checkLogin())) {
        return;
    }

    await loadOrders();

    init();

    // Refresh customer orders every 30 seconds
    setInterval(
        async () => {

            await loadOrders();

            renderAll();

        },
        30000
    );

})();
