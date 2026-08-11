// ============================================================
// Me To You Designs — Supabase login
// IMPORTANT: Replace ONLY the two values below with the
// Supabase Project URL and publishable/anon key.
// NEVER put your Supabase service-role key or password here.
// ============================================================

const SUPABASE_URL = "PASTE_YOUR_SUPABASE_PROJECT_URL_HERE";
const SUPABASE_ANON_KEY = "PASTE_YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY_HERE";

const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const signInButton = document.getElementById("signInButton");
const loginMessage = document.getElementById("loginMessage");

togglePassword.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";
  togglePassword.innerHTML = isPassword
    ? '<i class="fa-regular fa-eye-slash"></i>'
    : '<i class="fa-regular fa-eye"></i>';
  togglePassword.setAttribute(
    "aria-label",
    isPassword ? "Hide password" : "Show password"
  );
});

function showMessage(message, type = "error") {
  loginMessage.textContent = message;
  loginMessage.className = `login-message ${type}`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  showMessage("");

  if (!email || !password) {
    showMessage("Please enter your email address and password.");
    return;
  }

  signInButton.disabled = true;
  signInButton.querySelector("span").textContent = "Signing in…";

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      showMessage("Incorrect email or password. Please try again.");
      return;
    }

    if (!data.session) {
      showMessage("We couldn't create a secure session. Please try again.");
      return;
    }

    showMessage("Signed in successfully. Opening your Business Suite…", "success");

    // Change this to the page you want members to see after signing in.
    window.location.href = "dashboard.html";
  } catch (error) {
    console.error(error);
    showMessage("Something went wrong. Please try again.");
  } finally {
    signInButton.disabled = false;
    signInButton.querySelector("span").textContent = "Sign In";
  }
});
