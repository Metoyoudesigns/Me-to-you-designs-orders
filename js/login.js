import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://critutqwakaepgxgpkml.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_KtXAtIRgtZADPODLn7inRw_vC6rBPFb";

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const signInButton = document.getElementById("signInButton");
const loginMessage = document.getElementById("loginMessage");
const togglePassword = document.getElementById("togglePassword");
const showPassword = document.getElementById("showPassword");

function showMessage(message, type = "") {
    loginMessage.textContent = message;
    loginMessage.className = "login-message";

    if (type) {
        loginMessage.classList.add(type);
    }
}

function setPasswordVisibility(show) {
    passwordInput.type = show ? "text" : "password";

    togglePassword.innerHTML = show
        ? '<i class="fa-regular fa-eye-slash"></i>'
        : '<i class="fa-regular fa-eye"></i>';

    togglePassword.setAttribute(
        "aria-label",
        show ? "Hide password" : "Show password"
    );
}

togglePassword.addEventListener("click", (event) => {
    event.preventDefault();
    setPasswordVisibility(passwordInput.type === "password");
});

showPassword.addEventListener("change", () => {
    setPasswordVisibility(showPassword.checked);
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    showMessage("");

    if (!email || !password) {
        showMessage(
            "Please enter your email address and password.",
            "error"
        );
        return;
    }

    signInButton.disabled = true;
    signInButton.textContent = "Signing In...";

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error("Supabase login error:", error);
            showMessage(
                "Incorrect email or password. Please try again.",
                "error"
            );
            return;
        }

        if (!data.session) {
            showMessage(
                "We couldn't complete the sign in. Please try again.",
                "error"
            );
            return;
        }

        showMessage("Login successful!", "success");

        // This is the page we will build next.
        window.location.href = "dashboard.html";

    } catch (error) {
        console.error("Unexpected login error:", error);
        showMessage(
            "Something went wrong. Please try again.",
            "error"
        );
    } finally {
        signInButton.disabled = false;
        signInButton.textContent = "Sign In";
    }
});
