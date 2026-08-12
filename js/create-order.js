import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://critutqwakaepgxgpkml.supabase.co";
const SUPABASE_KEY = "sb_publishable_KtXAtIRgtZADPODLn7inRw_vC6rBPFb";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

"use strict";

// =====================================
// PAGE ELEMENTS
// =====================================

const orderNumber = document.getElementById("orderNumber");
const orderDate = document.getElementById("orderDate");
const dateNeeded = document.getElementById("dateNeeded");

const customerName = document.getElementById("customerName");
const customerContact = document.getElementById("customerContact");
const orderSource = document.getElementById("orderSource");
const socialUsername = document.getElementById("socialUsername");

const orderNotes = document.getElementById("orderNotes");

const orderTotal = document.getElementById("orderTotal");
const paymentStatus = document.getElementById("paymentStatus");
const totalPaid = document.getElementById("totalPaid");
const remainingBalance = document.getElementById("remainingBalance");

const deliveryMethod = document.getElementById("deliveryMethod");

const address1 = document.getElementById("address1");
const address2 = document.getElementById("address2");
const town = document.getElementById("town");
const county = document.getElementById("county");
const postcode = document.getElementById("postcode");

const orderStatus = document.getElementById("orderStatus");

const addItemButton = document.getElementById("addItemButton");
const itemsContainer = document.getElementById("itemsContainer");

const saveOrderButton = document.getElementById("saveOrderButton");

const addPaymentButton = document.getElementById("addPaymentButton");
const paymentForm = document.getElementById("paymentForm");

const customerImages = document.getElementById("customerImages");
const mockupImages = document.getElementById("mockupImages");

let payments = [];

// =====================================
// AUTH
// =====================================

async function checkLogin() {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
        window.location.href = "index.html";
        return false;
    }

    return true;
}

// =====================================
// ORDER NUMBER
// =====================================

async function generateOrderNumber() {
    const { data, error } = await supabase
        .from("orders")
        .select("orderNumber")
        .order("orderNumber", { ascending: false })
        .limit(1);

    if (error) {
        console.error(error);
        throw new Error(
            "I couldn't check the existing order numbers. Make sure your Supabase orders table is set up."
        );
    }

    let lastNumber = 0;

    if (data && data.length) {
        const match = String(data[0].orderNumber || "").match(/MTYD-(\d+)/i);
        if (match) lastNumber = Number(match[1]) || 0;
    }

    return "MTYD-" + String(lastNumber + 1).padStart(4, "0");
}

// =====================================
// INITIALISE
// =====================================

async function initialisePage() {
    orderDate.value = new Date().toISOString().split("T")[0];

    paymentStatus.value = "Not Paid";
    totalPaid.value = "0.00";
    remainingBalance.value = "0.00";

    try {
        orderNumber.value = await generateOrderNumber();
    } catch (error) {
        console.error(error);
        orderNumber.value = "MTYD-NEW";
    }
}

// =====================================
// ITEMS
// =====================================

document.querySelectorAll(".itemCard").forEach(setupItem);

addItemButton.addEventListener("click", addNewItem);

function addNewItem() {
    const firstCard = document.querySelector(".itemCard");
    const newCard = firstCard.cloneNode(true);

    newCard.querySelector(".itemProduct").value = "";
    newCard.querySelector(".itemQuantity").value = 1;
    newCard.querySelector(".itemPrice").value = "0.00";
    newCard.querySelector(".itemTotal").value = "0.00";
    newCard.querySelector(".itemSize").value = "";
    newCard.querySelector(".itemColour").value = "";
    newCard.querySelector(".itemPersonalised").value = "No";
    newCard.querySelector(".itemPersonalisation").value = "";
    newCard.querySelector(".personalisationBox").style.display = "none";

    itemsContainer.appendChild(newCard);
    setupItem(newCard);
    calculateTotal();
}

function setupItem(card) {
    const qty = card.querySelector(".itemQuantity");
    const price = card.querySelector(".itemPrice");
    const personalised = card.querySelector(".itemPersonalised");
    const personalisationBox = card.querySelector(".personalisationBox");

    qty.addEventListener("input", calculateTotal);
    price.addEventListener("input", calculateTotal);

    personalised.addEventListener("change", () => {
        personalisationBox.style.display =
            personalised.value === "Yes" ? "block" : "none";
    });

    personalisationBox.style.display =
        personalised.value === "Yes" ? "block" : "none";

    card.querySelector(".removeItemButton").addEventListener("click", () => {
        if (document.querySelectorAll(".itemCard").length === 1) {
            alert("You must have at least one item.");
            return;
        }

        card.remove();
        calculateTotal();
    });
}

// =====================================
// TOTALS
// =====================================

function calculateTotal() {
    let grandTotal = 0;

    document.querySelectorAll(".itemCard").forEach(card => {
        const qty = Number(card.querySelector(".itemQuantity").value) || 0;
        const price = Number(card.querySelector(".itemPrice").value) || 0;
        const total = qty * price;

        card.querySelector(".itemTotal").value = total.toFixed(2);
        grandTotal += total;
    });

    orderTotal.value = grandTotal.toFixed(2);

    remainingBalance.value = Math.max(
        0,
        grandTotal - Number(totalPaid.value || 0)
    ).toFixed(2);
}

calculateTotal();

// =====================================
// DELIVERY
// =====================================

const addressSection = document.getElementById("addressSection");

function updateDelivery() {
    addressSection.style.display =
        deliveryMethod.value === "Collection" ? "none" : "block";
}

deliveryMethod.addEventListener("change", updateDelivery);
updateDelivery();

// =====================================
// PAYMENTS
// =====================================

const paymentHistory = document.getElementById("paymentHistory");
const savePaymentButton = document.getElementById("savePaymentButton");

addPaymentButton.addEventListener("click", () => {
    paymentForm.style.display = "block";
});

savePaymentButton.addEventListener("click", savePayment);

function savePayment() {
    const payment = {
        date: document.getElementById("paymentDate").value ||
            new Date().toISOString().split("T")[0],
        amount: Number(document.getElementById("paymentAmount").value) || 0,
        method: document.getElementById("paymentMethod").value,
        notes: document.getElementById("paymentNotes").value
    };

    if (payment.amount <= 0) {
        alert("Enter a payment amount.");
        return;
    }

    payments.push(payment);
    updatePayments();

    document.getElementById("paymentAmount").value = "";
    document.getElementById("paymentNotes").value = "";
    paymentForm.style.display = "none";
}

function updatePayments() {
    let paid = 0;
    paymentHistory.innerHTML = "";

    payments.forEach(payment => {
        paid += payment.amount;

        const entry = document.createElement("div");
        entry.className = "paymentEntry";

        const amount = document.createElement("strong");
        amount.textContent = `£${payment.amount.toFixed(2)}`;

        entry.appendChild(amount);
        entry.appendChild(document.createElement("br"));
        entry.appendChild(document.createTextNode(payment.method));
        entry.appendChild(document.createElement("br"));
        entry.appendChild(document.createTextNode(payment.date));

        if (payment.notes) {
            entry.appendChild(document.createElement("br"));
            entry.appendChild(document.createTextNode(payment.notes));
        }

        paymentHistory.appendChild(entry);
    });

    if (payments.length === 0) {
        paymentHistory.innerHTML = "<p>No payments recorded yet.</p>";
    }

    totalPaid.value = paid.toFixed(2);
    remainingBalance.value = Math.max(
        0,
        Number(orderTotal.value) - paid
    ).toFixed(2);

    if (paid <= 0) {
        paymentStatus.value = "Not Paid";
    } else if (paid >= Number(orderTotal.value)) {
        paymentStatus.value = "Paid in Full";
    } else {
        paymentStatus.value = "Deposit Paid";
    }
}

// =====================================
// MULTIPLE IMAGE UPLOADS
// =====================================

async function uploadFiles(files, orderNo, folder) {
    const urls = [];

    for (const file of Array.from(files || [])) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${orderNo}/${folder}/${Date.now()}-${safeName}`;

        const { error } = await supabase.storage
            .from("order-files")
            .upload(path, file, {
                upsert: false,
                contentType: file.type || undefined
            });

        if (error) {
            throw new Error(
                `Could not upload "${file.name}". Make sure the Supabase "order-files" storage bucket exists and signed-in users can upload.`
            );
        }

        const { data } = supabase.storage
            .from("order-files")
            .getPublicUrl(path);

        urls.push(data.publicUrl);
    }

    return urls;
}

// =====================================
// SAVE ORDER
// =====================================

saveOrderButton.addEventListener("click", saveOrder);

async function saveOrder() {
    if (saveOrderButton.disabled) return;

    if (!customerName.value.trim()) {
        alert("Please enter the customer name.");
        customerName.focus();
        return;
    }

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
        window.location.href = "index.html";
        return;
    }

    saveOrderButton.disabled = true;
    saveOrderButton.textContent = "Saving Order...";

    try {
        const newOrderNumber = await generateOrderNumber();
        orderNumber.value = newOrderNumber;

        const items = [];

        document.querySelectorAll(".itemCard").forEach(card => {
            items.push({
                product: card.querySelector(".itemProduct").value,
                quantity: Number(card.querySelector(".itemQuantity").value) || 0,
                unitPrice: Number(card.querySelector(".itemPrice").value) || 0,
                itemTotal: Number(card.querySelector(".itemTotal").value) || 0,
                size: card.querySelector(".itemSize").value,
                colour: card.querySelector(".itemColour").value,
                personalised: card.querySelector(".itemPersonalised").value,
                personalisation: card.querySelector(".itemPersonalisation").value
            });
        });

        // IMPORTANT: both inputs support multiple files.
        const customerPhotoUrls = await uploadFiles(
            customerImages.files,
            newOrderNumber,
            "customer"
        );

        const mockupPhotoUrls = await uploadFiles(
            mockupImages.files,
            newOrderNumber,
            "mockups"
        );

        const order = {
            orderNumber: newOrderNumber,

            customerName: customerName.value.trim(),
            customerContact: customerContact.value.trim(),
            orderSource: orderSource.value,
            socialUsername: socialUsername.value.trim(),

            orderDate: orderDate.value,
            dateNeeded: dateNeeded.value,
            orderNotes: orderNotes.value,

            orderTotal: Number(orderTotal.value) || 0,
            paymentStatus: paymentStatus.value,
            totalPaid: Number(totalPaid.value) || 0,
            remainingBalance: Number(remainingBalance.value) || 0,

            deliveryMethod: deliveryMethod.value,
            address1: address1.value,
            address2: address2.value,
            town: town.value,
            county: county.value,
            postcode: postcode.value,

            orderStatus: orderStatus.value,

            items,
            payments,

            customerPhotos: customerPhotoUrls,
            mockupPhotos: mockupPhotoUrls,

            trackingNumber: "",
            invoiceNumber: "",

            archived: false,
            completed: false,

            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const { error } = await supabase
            .from("orders")
            .insert(order);

        if (error) {
            console.error("Supabase order error:", error);
            throw new Error(error.message);
        }

        alert("✅ Order saved successfully!");
        window.location.href = "dashboard.html";

    } catch (error) {
        console.error("Save order error:", error);
        alert(`Could not save the order.\n\n${error.message}`);
    } finally {
        saveOrderButton.disabled = false;
        saveOrderButton.textContent = "💗 Save Order";
    }
}

// =====================================
// CLICKABLE ORDER PROGRESS
// =====================================

const progressSteps = document.querySelectorAll(".progressStep");

function updateProgressDisplay() {
    const current = orderStatus.value;
    progressSteps.forEach(step => {
        step.classList.toggle("active", step.dataset.status === current);
    });
}

progressSteps.forEach(step => {
    const chooseStatus = () => {
        orderStatus.value = step.dataset.status;
        updateProgressDisplay();
    };

    step.addEventListener("click", chooseStatus);

    step.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            chooseStatus();
        }
    });
});

orderStatus.addEventListener("change", updateProgressDisplay);
updateProgressDisplay();

// =====================================
// START
// =====================================

(async function start() {
    const loggedIn = await checkLogin();
    if (!loggedIn) return;

    await initialisePage();
})();
