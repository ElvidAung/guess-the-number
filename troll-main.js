const ADMIN_TEST_MODE = true;

if (ADMIN_TEST_MODE && localStorage.getItem("global_coin_balance") === null) {
  localStorage.setItem("global_coin_balance", "0");
}

const LUCKY_CODE = "126207";

const PRIZES = {
  6: "500,000 MMK",
  5: "400,000 MMK",
  4: "300,000 MMK",
  3: "5,000 MMK"
};

const MMK_PER_COIN = 1000;

let coinBalance = parseInt(localStorage.getItem("global_coin_balance") || "0", 10);
let currentMethod = "";
let activeUsername = localStorage.getItem("current_logged_in_user") || "Aung Kaung Myat";
let activeClaimId = null;

// Global DOM references initialized cleanly
let openInbox, closeInbox, messageModal, clearAllMsgsBtn;

document.addEventListener("DOMContentLoaded", () => {
  // First priority: Verify if this user profile identity was marked banned by management
  checkUserBanStatus();

  // Initialize Elements
  openInbox = document.getElementById("openInbox");
  closeInbox = document.getElementById("closeInbox");
  messageModal = document.getElementById("messageModal");
  clearAllMsgsBtn = document.getElementById("clearAllMsgs");

  const input = document.querySelector(".guess-input");
  const btn = document.querySelector(".btn");
  const usernameDisplay = document.querySelector(".username");

  if (usernameDisplay) {
    usernameDisplay.textContent = `Welcome ${activeUsername}!`;
  }

  updateBalanceDisplay();
  updateInbox(); // Fire once to render correct badge state immediately on startup

  // --- Real-time Reactive LocalStorage Syncing Listener ---
  window.addEventListener("storage", (e) => {
    if (e.key === "global_coin_balance") {
      updateBalanceDisplay();
    }
    if (e.key === "win_claims" && activeClaimId) {
      checkClaimStatus();
    }
    if (e.key === "auth_users") {
      checkUserBanStatus();
    }
    if (e.key === "admin_messages") {
      updateInbox();
    }
  });

  // Guess Handler Bindings
  if (btn) btn.addEventListener("click", handleGuess);
  if (input) {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") handleGuess();
    });

    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "").slice(0, 6);
    });
  }

  // --- Refill Balance Modal Functionality ---
  const refillModal = document.getElementById("refillModal");
  const modalTitle = document.getElementById("modalTitle");
  const coinAmountInput = document.getElementById("coinAmount");
  const phoneNumberInput = document.getElementById("phoneNumber");
  const modalTotal = document.getElementById("modalTotal");
  const modalCancel = document.getElementById("modalCancel");
  const modalPay = document.getElementById("modalPay");

  document.querySelectorAll(".pay-card").forEach(card => {
    card.addEventListener("click", () => {
      currentMethod = card.getAttribute("data-method") || "Payment Options";
      
      if (modalTitle) {
        modalTitle.textContent = `Refill Coins via ${currentMethod}`;
      }
      
      if (coinAmountInput) coinAmountInput.value = "";
      if (phoneNumberInput) phoneNumberInput.value = "";
      if (modalTotal) modalTotal.textContent = "Total: 0 MMK";
      
      if (refillModal) {
        refillModal.removeAttribute("hidden");
        refillModal.style.display = "flex";
      }
    });
  });

  if (coinAmountInput) {
    coinAmountInput.addEventListener("input", () => {
      const amount = parseInt(coinAmountInput.value, 10) || 0;
      const totalCost = amount * MMK_PER_COIN;
      if (modalTotal) {
        modalTotal.textContent = `Total: ${totalCost.toLocaleString()} MMK`;
      }
    });
  }

  if (modalCancel) {
    modalCancel.addEventListener("click", () => {
      if (refillModal) {
        refillModal.setAttribute("hidden", "true");
        refillModal.style.display = "none";
      }
    });
  }

  if (modalPay) {
    modalPay.addEventListener("click", () => {
      const coinsToBuy = parseInt(coinAmountInput.value, 10) || 0;
      const phoneNum = phoneNumberInput.value.trim();

      if (coinsToBuy <= 0) {
        alert("Please enter a valid amount of coins (minimum 1).");
        return;
      }
      if (!phoneNum) {
        alert("Please enter your payment phone number.");
        return;
      }

      const paymentId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
      const totalCost = coinsToBuy * MMK_PER_COIN;

      const requests = JSON.parse(localStorage.getItem("payment_requests") || "[]");
      const newPaymentNotification = {
        id: paymentId,
        username: activeUsername,
        method: currentMethod,
        phone: phoneNum,
        coins: coinsToBuy,
        amount: totalCost,
        status: "Pending",
        timestamp: new Date().toISOString()
      };

      requests.push(newPaymentNotification);
      localStorage.setItem("payment_requests", JSON.stringify(requests));

      if (refillModal) {
        refillModal.setAttribute("hidden", "true");
        refillModal.style.display = "none";
      }

      alert(`Your refill request for ${coinsToBuy} coins has been sent successfully!\nPlease wait for admin approval.`);
    });
  }

  // --- Inbox Operations Listeners ---
  if (openInbox && messageModal) {
    openInbox.addEventListener("click", () => {
      updateInbox(); 
      messageModal.style.display = "flex";
      messageModal.removeAttribute("hidden");
    });
  }

  if (closeInbox && messageModal) {
    closeInbox.addEventListener("click", (e) => {
      e.preventDefault();
      
      // Hide Modal UI visually
      messageModal.style.display = "none";
      messageModal.setAttribute("hidden", "true");

      // Mark messages as read by updating tracking timestamp on close
      localStorage.setItem("last_viewed_inbox_" + activeUsername, Date.now().toString());

      // Instantly remove badge count display layout metrics
      const badge = document.getElementById("msgBadge");
      if (badge) {
        badge.textContent = "0";
        badge.style.display = "none";
        badge.classList.remove("pulse-notification");
      }
    });
  }

  if (clearAllMsgsBtn) {
    clearAllMsgsBtn.addEventListener("click", () => {
      if (!confirm("Are you sure you want to permanently delete all messages?")) return;
      
      const messages = JSON.parse(localStorage.getItem("admin_messages") || "[]");
      const remainingMessages = messages.filter(m => m.target !== activeUsername && m.target !== "All");
      
      localStorage.setItem("admin_messages", JSON.stringify(remainingMessages));
      localStorage.setItem("last_viewed_inbox_" + activeUsername, Date.now().toString());

      updateInbox();
    });
  }
});

// --- Unified Utility Functions ---

function updateBalanceDisplay() {
  const balanceBox = document.querySelector(".balance_box");
  if (balanceBox) {
    coinBalance = parseInt(localStorage.getItem("global_coin_balance") || "0", 10);
    balanceBox.textContent = coinBalance.toLocaleString();
  }
}

function updateInbox() {
  try {
    const messages = JSON.parse(localStorage.getItem("admin_messages") || "[]");
    const inboxList = document.getElementById("inboxList");
    const badge = document.getElementById("msgBadge");
    
    const myMsgs = messages.filter(m => m.target === activeUsername || m.target === "All");
    const lastViewed = parseInt(localStorage.getItem("last_viewed_inbox_" + activeUsername) || "0", 10);
    const unreadCount = myMsgs.filter(msg => new Date(msg.timestamp).getTime() > lastViewed).length;
    
    if (badge) {
      const isModalOpen = messageModal && (messageModal.style.display === "flex" || !messageModal.hasAttribute("hidden"));
      if (unreadCount > 0 && !isModalOpen) {
        badge.textContent = unreadCount;
        badge.style.display = "block";
        badge.classList.add("pulse-notification"); 
      } else {
        badge.style.display = "none";
        badge.classList.remove("pulse-notification");
      }
    }

    if (inboxList) {
      inboxList.innerHTML = myMsgs.length ? "" : '<p style="color:#64748b; font-size:0.85rem; padding: 10px;">No new messages.</p>';
      [...myMsgs].reverse().forEach(msg => {
        const div = document.createElement("div");
        div.className = "admin-msg-item";
        div.style.padding = "8px 10px";
        div.style.borderBottom = "1px dashed #e2e8f0";
        div.innerHTML = `
          <p class="msg-text" style="margin: 0 0 4px 0; font-size: 0.9rem; color: #1e293b;">${msg.text || ""}</p>
          <span class="msg-date" style="font-size: 0.75rem; color: #94a3b8;">${msg.timestamp ? new Date(msg.timestamp).toLocaleString() : ""}</span>
        `;
        inboxList.appendChild(div);
      });
    }
  } catch (err) {
    console.error("Error rendering inbox layout: ", err);
  }
}

function handleGuess() {
  const input = document.querySelector(".guess-input");
  if (!input) return;
  const guess = input.value.trim();

  if (guess.length === 0) {
    shakeInput();
    return;
  }

  if (coinBalance <= 0) {
    alert("You have no coins left! Please refill your coins to continue playing.");
    return;
  }

  if (activeClaimId) {
    alert("Please wait for the Admin to verify your previous winning matching claim review request!");
    return;
  }

  let matchCount = 0;
  for (let i = 1; i <= Math.min(guess.length, 6); i++) {
    const userSuffix = guess.slice(-i);
    const luckySuffix = LUCKY_CODE.slice(-i);
    if (userSuffix === luckySuffix) {
      matchCount = i;
    } else {
      break;
    }
  }

  coinBalance = Math.max(0, coinBalance - 1);
  localStorage.setItem("global_coin_balance", coinBalance.toString());
  updateBalanceDisplay();

  if (matchCount >= 3 && PRIZES[matchCount]) {
    const prize = PRIZES[matchCount];
    const claimId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
    
    const claims = JSON.parse(localStorage.getItem("win_claims") || "[]");
    const newClaim = {
      id: claimId,
      username: activeUsername,
      guess: guess,
      prize: prize,
      matchCount: matchCount,
      status: "Pending",
      timestamp: new Date().toISOString()
    };
    claims.push(newClaim);
    localStorage.setItem("win_claims", JSON.stringify(claims));
    
    activeClaimId = claimId;
    alert("ဂုဏ်ယူပါသည်၊ သင်၏ဆုကြေးငွေကို ထုတ်ယူနိုင်ရန်အတွက် ကျေးဇူးပြု၍ Сီမံခန့်ခွဲသူ (Admin) ၏ အတည်ပြုချက်ကို ခေတ္တစောင့်ဆိုင်းပေးပါ");
  } else {
    shakeInput();
    input.value = "";
    input.focus();
    alert(`Oops sorry try again! You have ${coinBalance} coin(s) left.`);
  }
}

function checkClaimStatus() {
  if (!activeClaimId) return;
  const claims = JSON.parse(localStorage.getItem("win_claims") || "[]");
  const currentClaim = claims.find(c => c.id === activeClaimId);

  if (!currentClaim) return;
  const input = document.querySelector(".guess-input");

  if (currentClaim.status === "Approved") {
    activeClaimId = null;
    celebrate(currentClaim.matchCount, currentClaim.prize);
  } else if (currentClaim.status === "Declined") {
    activeClaimId = null;
    shakeInput();
    if (input) {
      input.value = "";
      input.focus();
    }
    alert(`Oops sorry try again! Your guess combination was marked wrong. You have ${coinBalance} coin(s) left.`);
  }
}

function shakeInput() {
  const input = document.querySelector(".guess-input");
  if (!input) return;
  input.classList.remove("shake");
  void input.offsetWidth;
  input.classList.add("shake");
  input.addEventListener(
    "animationend",
    () => input.classList.remove("shake"),
    { once: true }
  );
}

function celebrate(matchCount, prize) {
  const input = document.querySelector(".guess-input");
  const btn = document.querySelector(".btn");

  if (input) {
    input.classList.remove("flash");
    void input.offsetWidth;
    input.classList.add("flash");
  }

  if (btn) {
    btn.classList.remove("pulse-win");
    void btn.offsetWidth;
    btn.classList.add("pulse-win");
  }

  launchConfetti();

  setTimeout(() => {
    alert(
      `Congratulations! Admin has approved your win of ${prize}!\n` +
      `(${matchCount} digit${matchCount > 1 ? "s" : ""} matched)\n` +
      `Coins left: ${coinBalance}`
    );
    if (input) {
      input.value = "";
      input.focus();
    }
  }, 800);
}

function checkUserBanStatus() {
  const users = JSON.parse(localStorage.getItem("auth_users") || "[]");
  const currentUserObj = users.find(u => u.email === activeUsername || u.username === activeUsername);

  if (currentUserObj && currentUserObj.status === "Banned") {
    let banOverlay = document.getElementById("banModalOverlay");
    
    if (!banOverlay) {
      banOverlay = document.createElement("div");
      banOverlay.id = "banModalOverlay";
      banOverlay.style.position = "fixed";
      banOverlay.style.inset = "0";
      banOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
      banOverlay.style.display = "flex";
      banOverlay.style.alignItems = "center";
      banOverlay.style.justifyContent = "center";
      banOverlay.style.zIndex = "999999";
      
      banOverlay.innerHTML = `
        <div id="banModalCard" style="background: #fff; width: 360px; max-width: 90%; padding: 30px; border-radius: 16px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.4); font-family: monospace;">
          <h2 style="color: #ef4444; margin-top: 0; font-size: 1.5rem;">Access Revoked</h2>
          <p style="color: #1e293b; font-size: 1rem; margin-bottom: 24px; font-weight: bold;">You are banned from the page.</p>
          <div id="banActionContainer" style="display: flex; flex-direction: column; gap: 12px;">
            <button id="banContactBtn" style="padding: 12px; background: #2563eb; color: #fff; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; font-family: monospace;">Contact customer service</button>
            <button id="banLeaveBtn" style="padding: 12px; background: #64748b; color: #fff; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; font-family: monospace;">Leave page</button>
          </div>
        </div>
      `;
      document.body.appendChild(banOverlay);

      document.getElementById("banContactBtn").addEventListener("click", () => {
        const actionContainer = document.getElementById("banActionContainer");
        actionContainer.innerHTML = `
          <label style="display: block; text-align: left; font-size: 0.85rem; font-weight: bold; margin-bottom: 6px; color: #475569;">Type your message to support:</label>
          <textarea id="supportMsgInput" rows="4" style="width: 100%; border: 2px solid #cbd5e1; border-radius: 8px; padding: 10px; font-family: monospace; box-sizing: border-box; outline: none; resize: none; margin-bottom: 12px;" placeholder="Explain your appeal here..."></textarea>
          <div style="display: flex; gap: 8px;">
            <button id="banSubmitMsgBtn" style="flex: 1; padding: 10px; background: #10b981; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-family: monospace;">Send Message</button>
            <button id="banBackBtn" style="padding: 10px; background: #cbd5e1; color: #1e293b; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-family: monospace;">Back</button>
          </div>
        `;

        document.getElementById("banSubmitMsgBtn").addEventListener("click", () => {
          const textMsg = document.getElementById("supportMsgInput").value.trim();
          if (!textMsg) {
            alert("Please type a message before submitting.");
            return;
          }

          const ticketId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
          const supportTickets = JSON.parse(localStorage.getItem("customer_support_tickets") || "[]");
          
          const newTicket = {
            id: ticketId,
            username: activeUsername,
            message: textMsg,
            timestamp: new Date().toISOString()
          };

          supportTickets.push(newTicket);
          localStorage.setItem("customer_support_tickets", JSON.stringify(supportTickets));

          alert("Your message has been sent directly to the Customer Support team!");
          checkUserBanStatus();
        });

        document.getElementById("banBackBtn").addEventListener("click", () => {
          document.body.removeChild(document.getElementById("banModalOverlay"));
          checkUserBanStatus();
        });
      });

      document.getElementById("banLeaveBtn").addEventListener("click", () => {
        window.close();
        setTimeout(() => {
          window.location.href = "about:blank";
        }, 100);
      });
    }
  } else {
    const banOverlay = document.getElementById("banModalOverlay");
    if (banOverlay) {
      banOverlay.remove();
    }
  }
}

function launchConfetti() {
  const colors = ["#667eea", "#764ba2", "#f6d365", "#fda085", "#43e97b", "#fa709a"];
  const count = 80;

  for (let i = 0; i < count; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.position = "fixed";
    piece.style.top = "-10px";
    piece.style.zIndex = "999";
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = 2 + Math.random() * 2 + "s";
    piece.style.animationDelay = Math.random() * 0.5 + "s";
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    
    piece.style.width = "10px";
    piece.style.height = "10px";
    document.body.appendChild(piece);

    piece.addEventListener("animationend", () => piece.remove());
  }
}