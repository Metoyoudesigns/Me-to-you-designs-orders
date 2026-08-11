import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Add your Supabase values here once the project is ready.
// Supabase Dashboard → Project Settings → API.
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const showPassword = document.getElementById("showPassword");
const togglePassword = document.getElementById("togglePassword");
const signInButton = document.getElementById("signInButton");
const forgotPassword = document.getElementById("forgotPassword");
const message = document.getElementById("loginMessage");

function setMessage(text = "", type = "") {
  message.textContent = text;
  message.className = `login-message ${type}`.trim();
}

function setPasswordVisibility(visible) {
  passwordInput.type = visible ? "text" : "password";
  togglePassword.innerHTML = visible
    ? '<i class="fa-regular fa-eye-slash"></i>'
    : '<i class="fa-regular fa-eye"></i>';
  togglePassword.setAttribute("aria-label", visible ? "Hide password" : "Show password");
}

showPassword.addEventListener("change", () => {
  setPasswordVisibility(showPassword.checked);
});

togglePassword.addEventListener("click", () => {
  const visible = passwordInput.type === "password";
  showPassword.checked = visible;
  setPasswordVisibility(visible);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    setMessage("Please enter your email address and password.", "error");
    return;
  }

  signInButton.disabled = true;
  signInButton.querySelector("span").textContent = "Signing in…";

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    setMessage("Incorrect email or password. Please try again.", "error");
    signInButton.disabled = false;
    signInButton.querySelector("span").textContent = "Sign In";
    return;
  }

  setMessage("Signed in successfully.", "success");

  // Change this to the final dashboard filename when we build it.
  window.location.href = "dashboard.html";
});

forgotPassword.addEventListener("click", async () => {
  const email = emailInput.value.trim();

  if (!email) {
    setMessage("Enter your email address first, then tap Forgot password.", "error");
    emailInput.focus();
    return;
  }

  if (SUPABASE_URL === "YOUR_SUPABASE_URL") {
    setMessage("Supabase still needs to be connected to this page.", "error");
    return;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password.html`
  });

  if (error) {
    setMessage(error.message, "error");
    return;
  }

  setMessage("If that email has an account, a password-reset link has been sent.", "success");
});
