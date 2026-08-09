document.addEventListener("DOMContentLoaded", () => {
  const loginSection = document.getElementById("login-section");
  const dashboardSection = document.getElementById("dashboard-section");

  const loginForm = document.getElementById("login-form");
  const loginPassword = document.getElementById("login-password");
  const loginMessage = document.getElementById("login-message");

  const logoutButton = document.getElementById("logout-button");

  const mailForm = document.getElementById("mail-form");

  const senderName = document.getElementById("sender-name");
  const gmail = document.getElementById("gmail");
  const appPassword = document.getElementById("app-password");

  const verifyButton = document.getElementById("verify-button");
  const verifyMessage = document.getElementById("verify-message");

  const subject = document.getElementById("subject");
  const messageBody = document.getElementById("message-body");
  const recipients = document.getElementById("recipients");

  const recipientCount = document.getElementById("recipient-count");
  const sendButton = document.getElementById("send-button");
  const sendMessage = document.getElementById("send-message");
  const results = document.getElementById("results");

  function showDashboard() {
    loginSection.classList.add("hidden");
    dashboardSection.classList.remove("hidden");
  }

  function showLogin() {
    dashboardSection.classList.add("hidden");
    loginSection.classList.remove("hidden");
  }

  if (sessionStorage.getItem("dashboardAuthenticated") === "true") {
    showDashboard();
  } else {
    showLogin();
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    loginMessage.textContent = "Checking password...";

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          password: loginPassword.value
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        loginMessage.textContent =
          data.message || "Incorrect password.";
        return;
      }

      sessionStorage.setItem(
        "dashboardAuthenticated",
        "true"
      );

      loginPassword.value = "";
      loginMessage.textContent = "";

      showDashboard();
    } catch (error) {
      console.error(error);
      loginMessage.textContent =
        "Connection error. Please try again.";
    }
  });

  logoutButton.addEventListener("click", () => {
    sessionStorage.removeItem("dashboardAuthenticated");
    showLogin();
  });

  function getRecipients() {
    return [
      ...new Set(
        recipients.value
          .split(/[\s,;]+/)
          .map((email) => email.trim().toLowerCase())
          .filter((email) =>
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
          )
      )
    ];
  }

  recipients.addEventListener("input", () => {
    const list = getRecipients();

    recipientCount.textContent =
      `${list.length} valid recipient${list.length === 1 ? "" : "s"}`;
  });

  verifyButton.addEventListener("click", async () => {
    const email = gmail.value.trim();
    const password = appPassword.value.trim();

    if (!email || !password) {
      verifyMessage.textContent =
        "Enter Gmail address and App Password.";
      return;
    }

    verifyButton.disabled = true;
    verifyMessage.textContent = "Verifying Gmail...";

    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          appPassword: password
        })
      });

      const data = await response.json();

      verifyMessage.textContent =
        data.message ||
        (data.success
          ? "Gmail verified."
          : "Verification failed.");
    } catch (error) {
      console.error(error);
      verifyMessage.textContent =
        "Connection error.";
    } finally {
      verifyButton.disabled = false;
    }
  });

  mailForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const recipientList = getRecipients();

    if (recipientList.length === 0) {
      sendMessage.textContent =
        "Enter at least one valid recipient.";
      return;
    }

    sendButton.disabled = true;
    sendMessage.textContent = "Sending...";
    results.innerHTML = "";

    try {
      const response = await fetch("/api/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: gmail.value.trim(),
          appPassword: appPassword.value.trim(),
          senderName: senderName.value.trim(),
          subject: subject.value.trim(),
          messageBody: messageBody.value,
          recipients: recipientList
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        sendMessage.textContent =
          data.message || "Sending failed.";
        return;
      }

      sendMessage.textContent =
        `Finished. Sent: ${data.sent}, Failed: ${data.failed}`;

      for (const item of data.results) {
        const row = document.createElement("div");

        row.className = item.success
          ? "result success"
          : "result failed";

        row.textContent = item.success
          ? `Sent: ${item.recipient}`
          : `Failed: ${item.recipient} — ${item.error}`;

        results.appendChild(row);
      }
    } catch (error) {
      console.error(error);
      sendMessage.textContent =
        "Connection error. Please try again.";
    } finally {
      sendButton.disabled = false;
    }
  });
});
