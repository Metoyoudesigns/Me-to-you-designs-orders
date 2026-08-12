import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://critutqwakaepgxgpkml.supabase.co";

const SUPABASE_KEY = "sb_publishable_KtXAtIRgtZADPODLn7inRw_vC6rBPFb";

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const form = document.querySelector("#loginForm");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const loginMessage = document.querySelector("#loginMessage");
const togglePassword = document.querySelector("#togglePassword");


// Show / hide password
if (togglePassword) {
    togglePassword.addEventListener("click", () => {
        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            togglePassword.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
        } else {
            passwordInput.type = "password";
            togglePassword.innerHTML = '<i class="fa-solid fa-eye"></i>';
        }
    });
}


// Sign in
if (form) {
    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        loginMessage.textContent = "";
        loginMessage.className = "";

        if (!email || !password) {
            loginMessage.textContent = "Please enter your email and password.";
            loginMessage.className = "error";
            return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            loginMessage.textContent = "Incorrect email or password.";
            loginMessage.className = "error";
            return;
        }

        if (data.session) {

            loginMessage.textContent = "Login successful!";
            loginMessage.className = "success";

            // Change this to the page you want after login
            window.location.href = "dashboard.html";
        }
    });
}
