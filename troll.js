document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("sign-btn");
  const usernameInput = document.querySelector(".email1");
  const emailInput = document.querySelector(".email");
  const passwordInput = document.querySelector(".password");

  if (!btn || !usernameInput || !passwordInput) return;

  btn.addEventListener("click", (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput.value;

    if (!username || !password) {
      alert("Please enter both username and password.");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Loading...";

    // 1. Save to active user current session context
    localStorage.setItem("current_logged_in_user", username);

    // 2. Track user in the Shared Active Users Directory (for the Admin board)
    const activeUsers = JSON.parse(localStorage.getItem("auth_users") || "[]");
    const userExists = activeUsers.some(u => u.email === username);

    if (!userExists) {
      activeUsers.push({
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
        email: username, // Saving the entered username here to render under email profiles
        createdAt: new Date().toISOString(),
        status: "Active"
      });
      localStorage.setItem("auth_users", JSON.stringify(activeUsers));
    }

    fetch("http://localhost:3000/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    })
      .then((r) => r.json().then((data) => ({ status: r.status, data })))
      .then(({ status, data }) => {
        if (!data.ok) {
          alert(data.error || "Sign-up failed.");
          btn.disabled = false;
          btn.textContent = "အကောင့်ဖွင့်ရန်";
          return;
        }
        window.location.href = "../troll-main/troll_main.html";
      })
      .catch(() => {
        console.warn("Could not reach server, proceeding via local session client mode.");
        window.location.href = "../troll-main/troll_main.html";
      });
  });
});