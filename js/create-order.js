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

const addressSection = document.getElementById("addressSection");

const paymentHistory = document.getElementById("paymentHistory");
const savePaymentButton = document.getElementById("savePaymentButton");

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
// Generates:
// MTYD-0001
// MTYD-0002
// MTYD-0003
// etc.
//
// IMPORTANT:
// There is NO MTYD-NEW fallback.
// If Supabase cannot be checked, saving stops
// rather than creating an incorrect order number.
// =====================================

async function generateOrderNumber() {

    const { data, error } = await supabase
        .from("orders")
        .select("order_number");

    if (error) {
        console.error("Order number error:", error);
        throw new Error(
            "I couldn't check the existing order numbers in Supabase."
        );
    }

    let highestNumber = 0;

    if (Array.isArray(data)) {

        data.forEach(order => {

            const value = String(order.order_number || "");

            const match = value.match(/^MTYD-(\d+)$/i);

            if (match) {
                const number = parseInt(match[1], 10);

                if (!isNaN(number) && number > highestNumber) {
                    highestNumber = number;
                }
            }
        });
    }

    const nextNumber = highestNumber + 1;

    return `MTYD-${String(nextNumber).padStart(4, "0")}`;
}

// =====================================
// INITIALISE
// =====================================

async function initialisePage() {

    if (orderDate) {
        orderDate.value = new Date().toISOString().split("T")[0];
    }

    if (paymentStatus) {
        paymentStatus.value = "Not Paid";
    }

    if (totalPaid) {
        totalPaid.value = "0.00";
    }

    if (remainingBalance) {
        remainingBalance.value = "0.00";
    }

    // Generate a REAL order number.
    // Never display MTYD-NEW.
    if (orderNumber) {
        try {
            orderNumber.value = await generateOrderNumber();
        } catch (error) {
            console.error(error);

            orderNumber.value = "";

            alert(
                "I couldn't generate your order number.\n\n" +
                "Please check your Supabase connection before saving the order."
            );
        }
    }
}

// =====================================
// ITEMS
// =====================================

document.querySelectorAll(".itemCard").forEach(setupItem);

if (addItemButton) {
    addItemButton.addEventListener("click", addNewItem);
}

function addNewItem() {

    const firstCard = document.querySelector(".itemCard");

    if (!firstCard) {
        return;
    }

    const newCard = firstCard.cloneNode(true);

    const product = newCard.querySelector(".itemProduct");
    const quantity = newCard.querySelector(".itemQuantity");
    const price = newCard.querySelector(".itemPrice");
    const total = newCard.querySelector(".itemTotal");
    const size = newCard.querySelector(".itemSize");
    const colour = newCard.querySelector(".itemColour");
    const personalised = newCard.querySelector(".itemPersonalised");
    const personalisation = newCard.querySelector(".itemPersonalisation");
    const personalisationBox = newCard.querySelector(".personalisationBox");

    if (product) product.value = "";
    if (quantity) quantity.value = 1;
    if (price) price.value = "0.00";
    if (total) total.value = "0.00";
    if (size) size.value = "";
    if (colour) colour.value = "";
    if (personalised) personalised.value = "No";
    if (personalisation) personalisation.value = "";

    if (personalisationBox) {
        personalisationBox.style.display = "none";
    }

    itemsContainer.appendChild(newCard);

    setupItem(newCard);
    calculateTotal();
}

function setupItem(card) {

    const qty = card.querySelector(".itemQuantity");
    const price = card.querySelector(".itemPrice");
    const personalised = card.querySelector(".itemPersonalised");
    const personalisationBox = card.querySelector(".personalisationBox");
    const removeButton = card.querySelector(".removeItemButton");

    if (qty) {
        qty.addEventListener("input", calculateTotal);
    }

    if (price) {
        price.addEventListener("input", calculateTotal);
    }

    if (personalised && personalisationBox) {

        personalised.addEventListener("change", () => {

            personalisationBox.style.display =
                personalised.value === "Yes"
                    ? "block"
                    : "none";
        });

        personalisationBox.style.display =
            personalised.value === "Yes"
                ? "block"
                : "none";
    }

    if (removeButton) {

        removeButton.addEventListener("click", () => {

            const cards =
                document.querySelectorAll(".itemCard");

            if (cards.length === 1) {
                alert("You must have at least one item.");
                return;
            }

            card.remove();
            calculateTotal();
        });
    }
}

// =====================================
// TOTALS
// =====================================

function calculateTotal() {

    let grandTotal = 0;

    document.querySelectorAll(".itemCard").forEach(card => {

        const qty =
            Number(card.querySelector(".itemQuantity")?.value) || 0;

        const price =
            Number(card.querySelector(".itemPrice")?.value) || 0;

        const total = qty * price;

        const totalInput =
            card.querySelector(".itemTotal");

        if (totalInput) {
            totalInput.value = total.toFixed(2);
        }

        grandTotal += total;
    });

    if (orderTotal) {
        orderTotal.value = grandTotal.toFixed(2);
    }

    if (remainingBalance) {

        remainingBalance.value =
            Math.max(
                0,
                grandTotal -
                Number(totalPaid?.value || 0)
            ).toFixed(2);
    }
}

calculateTotal();

// =====================================
// DELIVERY
// =====================================

function updateDelivery() {

    if (!addressSection || !deliveryMethod) {
        return;
    }

    addressSection.style.display =
        deliveryMethod.value === "Collection"
            ? "none"
            : "block";
}

if (deliveryMethod) {
    deliveryMethod.addEventListener(
        "change",
        updateDelivery
    );
}

updateDelivery();

// =====================================
// PAYMENTS
// =====================================

if (addPaymentButton) {

    addPaymentButton.addEventListener("click", () => {

        if (paymentForm) {
            paymentForm.style.display = "block";
        }
    });
}

if (savePaymentButton) {
    savePaymentButton.addEventListener(
        "click",
        savePayment
    );
}

function savePayment() {

    const paymentDate =
        document.getElementById("paymentDate");

    const paymentAmount =
        document.getElementById("paymentAmount");

    const paymentMethod =
        document.getElementById("paymentMethod");

    const paymentNotes =
        document.getElementById("paymentNotes");

    const payment = {

        date:
            paymentDate?.value ||
            new Date().toISOString().split("T")[0],

        amount:
            Number(paymentAmount?.value) || 0,

        method:
            paymentMethod?.value || "",

        notes:
            paymentNotes?.value || ""
    };

    if (payment.amount <= 0) {

        alert("Enter a payment amount.");
        return;
    }

    payments.push(payment);

    updatePayments();

    if (paymentAmount) {
        paymentAmount.value = "";
    }

    if (paymentNotes) {
        paymentNotes.value = "";
    }

    if (paymentForm) {
        paymentForm.style.display = "none";
    }
}

function updatePayments() {

    let paid = 0;

    if (paymentHistory) {
        paymentHistory.innerHTML = "";
    }

    payments.forEach(payment => {

        paid += payment.amount;

        if (!paymentHistory) {
            return;
        }

        const entry =
            document.createElement("div");

        entry.className = "paymentEntry";

        entry.innerHTML = `
            <strong>£${payment.amount.toFixed(2)}</strong>
            <br>
            ${payment.method}
            <br>
            ${payment.date}
            ${
                payment.notes
                    ? `<br>${payment.notes}`
                    : ""
            }
        `;

        paymentHistory.appendChild(entry);
    });

    if (
        paymentHistory &&
        payments.length === 0
    ) {
        paymentHistory.innerHTML =
            "<p>No payments recorded yet.</p>";
    }

    if (totalPaid) {
        totalPaid.value = paid.toFixed(2);
    }

    if (remainingBalance) {

        remainingBalance.value =
            Math.max(
                0,
                Number(orderTotal?.value || 0) - paid
            ).toFixed(2);
    }

    if (paymentStatus) {

        if (paid <= 0) {

            paymentStatus.value = "Not Paid";

        } else if (
            paid >= Number(orderTotal?.value || 0)
        ) {

            paymentStatus.value = "Paid in Full";

        } else {

            paymentStatus.value = "Deposit Paid";
        }
    }
}

// =====================================
// MULTIPLE IMAGE UPLOADS
// =====================================

async function uploadFiles(
    files,
    orderNo,
    folder
) {

    const urls = [];

    if (!files || files.length === 0) {
        return urls;
    }

    for (const file of Array.from(files)) {

        const safeName =
            file.name.replace(
                /[^a-zA-Z0-9._-]/g,
                "_"
            );

        const path =
            `${orderNo}/${folder}/${Date.now()}-${safeName}`;

        const { error } =
            await supabase.storage
                .from("order-files")
                .upload(
                    path,
                    file,
                    {
                        upsert: false,
                        contentType:
                            file.type || undefined
                    }
                );

        if (error) {

            console.error(
                "Storage upload error:",
                error
            );

            throw new Error(
                `Could not upload "${file.name}". ` +
                `Check that your Supabase "order-files" bucket exists ` +
                `and allows signed-in users to upload.`
            );
        }

        const { data } =
            supabase.storage
                .from("order-files")
                .getPublicUrl(path);

        if (data?.publicUrl) {
            urls.push(data.publicUrl);
        }
    }

    return urls;
}

// =====================================
// COLLECT ITEMS
// =====================================

function collectItems() {

    const items = [];

    document.querySelectorAll(".itemCard")
        .forEach(card => {

            items.push({

                product:
                    card.querySelector(
                        ".itemProduct"
                    )?.value || "",

                quantity:
                    Number(
                        card.querySelector(
                            ".itemQuantity"
                        )?.value
                    ) || 0,

                unitPrice:
                    Number(
                        card.querySelector(
                            ".itemPrice"
                        )?.value
                    ) || 0,

                itemTotal:
                    Number(
                        card.querySelector(
                            ".itemTotal"
                        )?.value
                    ) || 0,

                size:
                    card.querySelector(
                        ".itemSize"
                    )?.value || "",

                colour:
                    card.querySelector(
                        ".itemColour"
                    )?.value || "",

                personalised:
                    card.querySelector(
                        ".itemPersonalised"
                    )?.value || "No",

                personalisation:
                    card.querySelector(
                        ".itemPersonalisation"
                    )?.value || ""
            });
        });

    return items;
}

// =====================================
// SAVE ORDER
// =====================================

if (saveOrderButton) {

    saveOrderButton.addEventListener(
        "click",
        saveOrder
    );
}

async function saveOrder() {

    if (saveOrderButton?.disabled) {
        return;
    }

    if (!customerName?.value.trim()) {

        alert("Please enter the customer name.");

        customerName?.focus();

        return;
    }

    const {
        data: sessionData,
        error: sessionError
    } = await supabase.auth.getSession();

    if (
        sessionError ||
        !sessionData?.session
    ) {

        window.location.href =
            "index.html";

        return;
    }

    if (saveOrderButton) {

        saveOrderButton.disabled = true;

        saveOrderButton.textContent =
            "Saving Order...";
    }

    try {

        // =================================
        // GENERATE REAL ORDER NUMBER
        // =================================

        const newOrderNumber =
            await generateOrderNumber();

        if (
            !newOrderNumber ||
            !/^MTYD-\d{4,}$/i.test(
                newOrderNumber
            )
        ) {

            throw new Error(
                "A valid MTYD order number could not be generated."
            );
        }

        if (orderNumber) {
            orderNumber.value =
                newOrderNumber;
        }

        // =================================
        // ITEMS
        // =================================

        const items = collectItems();

        // =================================
        // IMAGES
        // =================================

        const customerPhotoUrls =
            await uploadFiles(
                customerImages?.files,
                newOrderNumber,
                "customer"
            );

        const mockupPhotoUrls =
            await uploadFiles(
                mockupImages?.files,
                newOrderNumber,
                "mockups"
            );

        // =================================
        // ORDER OBJECT
        // =================================
        // These names MATCH the Supabase
        // snake_case columns.
        // =================================

        const order = {

            order_number:
                newOrderNumber,

            customer_name:
                customerName.value.trim(),

            customer_contact:
                customerContact?.value.trim() || "",

            order_source:
                orderSource?.value || "",

            social_username:
                socialUsername?.value.trim() || "",

            order_date:
                orderDate?.value || null,

            date_needed:
                dateNeeded?.value || null,

            order_notes:
                orderNotes?.value || "",

            order_total:
                Number(orderTotal?.value) || 0,

            payment_status:
                paymentStatus?.value || "Not Paid",

            total_paid:
                Number(totalPaid?.value) || 0,

            remaining_balance:
                Number(
                    remainingBalance?.value
                ) || 0,

            delivery_method:
                deliveryMethod?.value || "Collection",

            address1:
                address1?.value || "",

            address2:
                address2?.value || "",

            town:
                town?.value || "",

            county:
                county?.value || "",

            postcode:
                postcode?.value || "",

            order_status:
                orderStatus?.value ||
                "New Order",

            items: items,

            payments: payments,

            customer_photos:
                customerPhotoUrls,

            mockup_photos:
                mockupPhotoUrls,

            tracking_number:
                "",

            invoice_number:
                "",

            archived:
                false,

            completed:
                false,

            created_at:
                new Date().toISOString(),

            updated_at:
                new Date().toISOString()
        };

        // =================================
        // INSERT INTO SUPABASE
        // =================================

        const {
            data,
            error
        } = await supabase
            .from("orders")
            .insert(order)
            .select()
            .single();

        if (error) {

            console.error(
                "Supabase order error:",
                error
            );

            throw new Error(
                error.message
            );
        }

        console.log(
            "Order saved:",
            data
        );

        alert(
            `✅ Order ${newOrderNumber} saved successfully!`
        );

        window.location.href =
            "dashboard.html";

    } catch (error) {

        console.error(
            "Save order error:",
            error
        );

        alert(
            `Could not save the order.\n\n${error.message}`
        );

    } finally {

        if (saveOrderButton) {

            saveOrderButton.disabled = false;

            saveOrderButton.textContent =
                "💗 Save Order";
        }
    }
}

// =====================================
// CLICKABLE ORDER PROGRESS
// =====================================

const progressSteps =
    document.querySelectorAll(
        ".progressStep"
    );

function updateProgressDisplay() {

    const current =
        orderStatus?.value || "New Order";

    progressSteps.forEach(step => {

        step.classList.toggle(
            "active",
            step.dataset.status === current
        );
    });
}

progressSteps.forEach(step => {

    const chooseStatus = () => {

        if (!orderStatus) {
            return;
        }

        orderStatus.value =
            step.dataset.status;

        updateProgressDisplay();
    };

    step.addEventListener(
        "click",
        chooseStatus
    );

    step.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" ||
                event.key === " "
            ) {

                event.preventDefault();

                chooseStatus();
            }
        }
    );
});

if (orderStatus) {

    orderStatus.addEventListener(
        "change",
        updateProgressDisplay
    );
}

updateProgressDisplay();

// =====================================
// START
// =====================================

(async function start() {

    const loggedIn =
        await checkLogin();

    if (!loggedIn) {
        return;
    }

    await initialisePage();

})();
