// ===== CONFIG =====
const API = "http://localhost:5000";

// ===== STATE =====
let currentUser = null; // { id, email }
let currentWallet = null; // { id, address, chain_type }
let authMode = "signin"; // "signin" | "signup"

// ===== DOM READY =====
document.addEventListener('DOMContentLoaded', function() {
  // Set up navigation
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      navigateTo(link.dataset.view);
    });
  });

  // Set up auth button
  const authBtn = document.getElementById("authBtn");
  if (authBtn) {
    authBtn.addEventListener("click", toggleAuth);
  }

  // Set up auth form
  const authForm = document.getElementById("authForm");
  if (authForm) {
    authForm.addEventListener("submit", handleAuth);
  }

  // Set up auth toggle link
  const authToggleLink = document.getElementById("authToggleLink");
  if (authToggleLink) {
    authToggleLink.addEventListener("click", switchAuthMode);
  }

  // Set up modal close buttons
  document.querySelectorAll('.modal-backdrop, .modal-close').forEach(el => {
    el.addEventListener('click', () => {
      closeModal();
      closeTopupModal();
    });
  });

  // Set up topup form
  const topupForm = document.getElementById("topupForm");
  if (topupForm) {
    topupForm.addEventListener("submit", handleTopup);
  }

  // Set up wallet creation
  const createWalletBtn = document.getElementById("createWalletBtn");
  if (createWalletBtn) {
    createWalletBtn.addEventListener("click", createWallet);
  }

  // Set up ramp tabs
  document.querySelectorAll('.tab[data-tab]').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab));
  });

  // Set up ramp buttons
  const onrampBtn = document.getElementById("onrampBtn");
  if (onrampBtn) {
    onrampBtn.addEventListener("click", createOnramp);
  }
  const offrampBtn = document.getElementById("offrampBtn");
  if (offrampBtn) {
    offrampBtn.addEventListener("click", createOfframp);
  }

  // Set up transfer buttons
  const lookupBtn = document.getElementById("lookupBtn");
  if (lookupBtn) {
    lookupBtn.addEventListener("click", lookupRecipient);
  }
  const initiateBtn = document.getElementById("initiateBtn");
  if (initiateBtn) {
    initiateBtn.addEventListener("click", initiateTransfer);
  }
  const confirmBtn = document.getElementById("confirmBtn");
  if (confirmBtn) {
    confirmBtn.addEventListener("click", confirmTransfer);
  }

  // Set up transfer tabs
  document.querySelectorAll('.tab:not([data-tab])').forEach(tab => {
    tab.addEventListener('click', () => {
      const type = tab.textContent.toLowerCase().includes('sent') ? 'sent' : 'received';
      switchTransferTab(tab, type);
    });
  });

  // Set up send button
  const sendBtn = document.getElementById("sendBtn");
  if (sendBtn) {
    sendBtn.addEventListener("click", sendTokens);
  }

  // Set up action cards
  document.querySelectorAll('.action-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const label = card.querySelector('.action-label').textContent;
      if (label === 'Top Up Balance') {
        showTopupModal();
      } else if (label === 'Create Wallet') {
        navigateTo('wallet');
      } else if (label === 'Send Tokens') {
        navigateTo('send');
      }
    });
  });
});

function navigateTo(viewName) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach((l) => l.classList.remove("active"));

  const view = document.getElementById(`view-${viewName}`);
  const link = document.querySelector(`.nav-link[data-view="${viewName}"]`);
  if (view) view.classList.add("active");
  if (link) link.classList.add("active");

  // Load transfer history when navigating to transfer view
  if (viewName === "transfer" && currentUser) {
    loadTransferHistory();
  }
}

// ===== TABS =====
function switchTab(btn) {
  const tabName = btn.dataset.tab;
  document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
  btn.classList.add("active");
  const content = document.getElementById(`tab-${tabName}`);
  if (content) content.classList.add("active");
}

// ===== AUTH =====
function toggleAuth() {
  if (currentUser) {
    // Sign out
    currentUser = null;
    currentWallet = null;
    localStorage.removeItem("authToken");
    updateUI();
    toast("Signed out", "info");
    return;
  }
  document.getElementById("authModal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("authModal").classList.add("hidden");
}

function closeTopupModal() {
  document.getElementById("topupModal").classList.add("hidden");
}

function showTopupModal() {
  if (!currentUser) {
    toast("Please sign in first", "error");
    toggleAuth();
    return;
  }
  document.getElementById("topupModal").classList.remove("hidden");
}

function switchAuthMode(e) {
  e.preventDefault();
  authMode = authMode === "signin" ? "signup" : "signin";
  document.getElementById("authTitle").textContent =
    authMode === "signin" ? "Sign In" : "Sign Up";
  document.getElementById("authSubmitBtn").textContent =
    authMode === "signin" ? "Sign In" : "Sign Up";
  document.getElementById("authToggleText").textContent =
    authMode === "signin" ? "Don't have an account?" : "Already have an account?";
  document.getElementById("authToggleLink").textContent =
    authMode === "signin" ? "Sign Up" : "Sign In";
}

async function handleTopup(e) {
  e.preventDefault();
  const amount = document.getElementById("topupAmount").value;
  const btn = document.getElementById("topupBtn");

  btn.disabled = true;
  btn.textContent = "Processing...";

  try {
    const headers = { "Content-Type": "application/json" };
    if (currentUser && localStorage.getItem("authToken")) {
      headers["Authorization"] = `Bearer ${localStorage.getItem("authToken")}`;
    }

    const res = await fetch(`${API}/user/topup`, {
      method: "POST",
      headers,
      body: JSON.stringify({ amount: parseFloat(amount) }),
    });

    const data = await res.json();

    if (!data.ok) {
      toast(data.error || "Topup failed", "error");
      return;
    }

    currentUser = data.user;
    updateUI();
    closeTopupModal();
    toast(data.message || "Balance topped up!", "success");
  } catch (err) {
    toast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Top Up";
  }
}

async function handleAuth(e) {
  e.preventDefault();
  const email = document.getElementById("authEmail").value;
  const password = document.getElementById("authPassword").value;
  const btn = document.getElementById("authSubmitBtn");

  const endpoint = authMode === "signin" ? "/user/signin" : "/user/signup";

  btn.disabled = true;
  btn.textContent = "Loading...";

  try {
    const res = await fetch(`${API}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      throw new Error(`Expected JSON response from ${endpoint}, got HTML or text: ${text.slice(0, 250)}`);
    }

    if (!data.ok) {
      toast(data.error || "Auth failed", "error");
      return;
    }

    currentUser = data.user;
    if (data.wallet) {
      currentWallet = data.wallet;
    }
    closeModal();
    updateUI();
    toast(`Welcome${authMode === "signup" ? "! Account created" : " back"}, ${currentUser.email}`, "success");

    // Store token for future requests
    if (data.token) {
      localStorage.setItem("authToken", data.token);
    }
  } catch (err) {
    toast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = authMode === "signin" ? "Sign In" : "Sign Up";
  }
}

// ===== WALLET (Privy) =====
async function createWallet() {
  if (!currentUser) {
    toast("Please sign in first", "error");
    toggleAuth();
    return;
  }

  const chain = document.getElementById("walletChain").value;
  const btn = document.getElementById("createWalletBtn");
  const resultBox = document.getElementById("walletResult");

  btn.disabled = true;
  btn.textContent = "Creating...";
  showResult(resultBox, null);

  try {
    const headers = { "Content-Type": "application/json" };
    if (currentUser && localStorage.getItem("authToken")) {
      headers["Authorization"] = `Bearer ${localStorage.getItem("authToken")}`;
    }

    const res = await fetch(`${API}/wallet/create`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId: currentUser.id,
        email: currentUser.email,
        chainType: chain,
      }),
    });
    const data = await res.json();

    if (!data.ok) {
      showResult(resultBox, data.error || "Wallet creation failed", true);
      toast("Wallet creation failed", "error");
      return;
    }

    currentWallet = data.data;
    showResult(resultBox, JSON.stringify(data.data, null, 2));
    updateWalletInfo();
    updateUI();
    toast("Wallet created!", "success");
  } catch (err) {
    showResult(resultBox, err.message, true);
    toast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Create Wallet";
  }
}

function updateWalletInfo() {
  if (!currentWallet) return;
  const card = document.getElementById("walletInfoCard");
  card.classList.remove("hidden");
  document.getElementById("infoWalletId").textContent = currentWallet.id || "—";
  document.getElementById("infoWalletAddr").textContent = currentWallet.address || "—";
  document.getElementById("infoWalletChain").textContent = currentWallet.chain_type || "—";
}

// ===== ON-RAMP (Kotani Pay) =====
async function createOnramp() {
  if (!currentUser) {
    toast("Please sign in first", "error");
    toggleAuth();
    return;
  }

  const amount = parseFloat(document.getElementById("onrampAmount").value);
  const channel = document.getElementById("onrampChannel").value;
  const btn = document.getElementById("onrampBtn");
  const resultBox = document.getElementById("onrampResult");

  if (!amount || amount < 100) {
    toast("Minimum amount is 100 NGN", "error");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Processing...";
  showResult(resultBox, null);

  try {
    const headers = { "Content-Type": "application/json" };
    if (currentUser && localStorage.getItem("authToken")) {
      headers["Authorization"] = `Bearer ${localStorage.getItem("authToken")}`;
    }

    const res = await fetch(`${API}/mento/create-ramp`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId: currentUser.id,
        amountNGN: amount,
        currency: "NGN",
        channel,
      }),
    });
    const data = await res.json();

    if (!data.ok) {
      showResult(resultBox, data.error ? JSON.stringify(data.error, null, 2) : "On-ramp failed", true);
      toast("On-ramp request failed", "error");
      return;
    }

    showResult(resultBox, JSON.stringify(data.data, null, 2));
    toast("On-ramp request created!", "success");
  } catch (err) {
    showResult(resultBox, err.message, true);
    toast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Deposit";
  }
}

// ===== OFF-RAMP (Kotani Pay) =====
async function createOfframp() {
  if (!currentUser) {
    toast("Please sign in first", "error");
    toggleAuth();
    return;
  }

  const amount = parseFloat(document.getElementById("offrampAmount").value);
  const token = document.getElementById("offrampToken").value;
  const phone = document.getElementById("offrampPhone").value;
  const btn = document.getElementById("offrampBtn");
  const resultBox = document.getElementById("offrampResult");

  if (!amount || amount <= 0) {
    toast("Enter a valid amount", "error");
    return;
  }
  if (!phone) {
    toast("Enter a phone number", "error");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Processing...";
  showResult(resultBox, null);

  try {
    const headers = { "Content-Type": "application/json" };
    if (currentUser && localStorage.getItem("authToken")) {
      headers["Authorization"] = `Bearer ${localStorage.getItem("authToken")}`;
    }

    const res = await fetch(`${API}/mento/offramp`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId: currentUser.id,
        amount,
        token,
        phone,
      }),
    });
    const data = await res.json();

    if (!data.ok) {
      showResult(resultBox, data.error ? JSON.stringify(data.error, null, 2) : "Off-ramp failed", true);
      toast("Off-ramp request failed", "error");
      return;
    }

    showResult(resultBox, JSON.stringify(data.data, null, 2));
    toast("Off-ramp request created!", "success");
  } catch (err) {
    showResult(resultBox, err.message, true);
    toast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Withdraw";
  }
}

// ===== SEND TOKENS (Privy) =====
async function sendTokens() {
  if (!currentUser) {
    toast("Please sign in first", "error");
    toggleAuth();
    return;
  }
  if (!currentWallet) {
    toast("Create a wallet first", "error");
    navigateTo("wallet");
    return;
  }

  const toAddress = document.getElementById("sendToAddress").value;
  const tokenAddress = document.getElementById("sendTokenAddress").value;
  const amount = document.getElementById("sendAmount").value;
  const chain = document.getElementById("sendChain").value;
  const btn = document.getElementById("sendBtn");
  const resultBox = document.getElementById("sendResult");

  if (!toAddress) {
    toast("Enter a recipient address", "error");
    return;
  }
  if (!amount || parseFloat(amount) <= 0) {
    toast("Enter a valid amount", "error");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Sending...";
  showResult(resultBox, null);

  try {
    const headers = { "Content-Type": "application/json" };
    if (currentUser && localStorage.getItem("authToken")) {
      headers["Authorization"] = `Bearer ${localStorage.getItem("authToken")}`;
    }

    const res = await fetch(`${API}/wallet/send`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        walletId: currentWallet.id,
        toAddress,
        tokenAddress: tokenAddress || undefined,
        amount: parseFloat(amount),
        chain,
      }),
    });
    const data = await res.json();

    if (!data.ok) {
      showResult(resultBox, data.error ? JSON.stringify(data.error, null, 2) : "Send failed", true);
      toast("Transaction failed", "error");
      return;
    }

    showResult(resultBox, JSON.stringify(data.tx, null, 2));
    toast("Transaction submitted!", "success");
  } catch (err) {
    showResult(resultBox, err.message, true);
    toast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Send";
  }
}

// ===== BACKEND HEALTH CHECK =====
async function checkBackendConnection() {
  const dashBackendStatus = document.getElementById("dashBackendStatus");
  if (!dashBackendStatus) return;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const res = await fetch(`${API}/api/health`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await res.json();

    if (res.ok && data.ok) {
      dashBackendStatus.textContent = "Connected";
      dashBackendStatus.style.color = "var(--success)";
    } else {
      dashBackendStatus.textContent = "Offline";
      dashBackendStatus.style.color = "var(--danger)";
    }
  } catch (err) {
    console.warn("Backend health check error:", err.message);
    dashBackendStatus.textContent = "Offline";
    dashBackendStatus.style.color = "var(--danger)";
  }
}

// ===== CHECK AUTH ON LOAD =====
async function checkAuthOnLoad() {
  const token = localStorage.getItem("authToken");
  if (!token) return;

  try {
    const res = await fetch(`${API}/user/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.error("Failed to parse /user/me response:", text);
      return;
    }

    if (data.ok) {
      currentUser = data.user;
      if (data.wallet) {
        currentWallet = data.wallet;
      }
      updateUI();
    } else {
      // Token invalid, remove it
      localStorage.removeItem("authToken");
    }
  } catch (err) {
    console.error("checkAuthOnLoad error:", err);
    localStorage.removeItem("authToken");
  }
}

// ===== UI HELPERS =====
function updateUI() {
  const badge = document.getElementById("userBadge");
  const authBtn = document.getElementById("authBtn");
  const dashAccount = document.getElementById("dashAccount");
  const dashWalletStatus = document.getElementById("dashWalletStatus");
  const dashWalletAddr = document.getElementById("dashWalletAddr");
  const dashChain = document.getElementById("dashChain");
  const dashBackendStatus = document.getElementById("dashBackendStatus");

  if (currentUser) {
    badge.textContent = currentUser.email;
    badge.classList.remove("hidden");
    authBtn.textContent = "Sign Out";
    authBtn.classList.remove("btn-primary");
    authBtn.classList.add("btn-danger");
    dashAccount.textContent = currentUser.email;
    document.getElementById("dashBalance").textContent =
      currentUser.balance_usd !== undefined
        ? `$${Number(currentUser.balance_usd).toFixed(2)}`
        : "$0.00";
  } else {
    badge.classList.add("hidden");
    authBtn.textContent = "Sign In";
    authBtn.classList.remove("btn-danger");
    authBtn.classList.add("btn-primary");
    dashAccount.textContent = "Not signed in";
    dashWalletStatus.textContent = "No Wallet";
    dashWalletAddr.innerHTML = "&mdash;";
    dashChain.innerHTML = "&mdash;";
    document.getElementById("dashBalance").textContent = "$0.00";
    document.getElementById("walletInfoCard").classList.add("hidden");
    if (dashBackendStatus) {
      dashBackendStatus.textContent = "Checking...";
      dashBackendStatus.style.color = "var(--info)";
      checkBackendConnection();
    }
    return;
  }

  if (dashBackendStatus) {
    dashBackendStatus.textContent = "Checking...";
    dashBackendStatus.style.color = "var(--info)";
    checkBackendConnection();
  }

  if (currentWallet) {
    if (currentWallet.status === "connected") {
      dashWalletStatus.textContent = "Wallet connected";
      dashWalletStatus.style.color = "var(--success)";
    } else if (currentWallet.status === "disconnected") {
      dashWalletStatus.textContent = "Wallet disconnected";
      dashWalletStatus.style.color = "var(--warning)";
    } else {
      dashWalletStatus.textContent = "Wallet pending";
      dashWalletStatus.style.color = "var(--info)";
    }
    dashWalletAddr.textContent = currentWallet.address || currentWallet.provider_wallet_id || "—";
    dashChain.textContent = currentWallet.chain || currentWallet.chain_type || "—";
  } else {
    dashWalletStatus.textContent = "No wallet connected";
    dashWalletStatus.style.color = "var(--muted)";
    dashWalletAddr.innerHTML = "&mdash;";
    dashChain.innerHTML = "&mdash;";
  }
}

function showResult(el, text, isError) {
  if (!text) {
    el.classList.add("hidden");
    el.classList.remove("error", "success");
    return;
  }
  el.classList.remove("hidden", "error", "success");
  el.classList.add(isError ? "error" : "success");
  el.textContent = typeof text === "string" ? text : JSON.stringify(text, null, 2);
}

function toast(message, type) {
  const container = document.getElementById("toastContainer");
  const el = document.createElement("div");
  el.className = `toast ${type || "info"}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity 0.3s";
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

// ===== PEER-TO-PEER TRANSFER =====
let selectedRecipient = null;
let pendingTransferId = null;

async function lookupRecipient() {
  const identifier = document.getElementById("recipientIdentifier").value;
  const btn = document.getElementById("lookupBtn");

  if (!identifier) {
    toast("Enter recipient email or UID", "error");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Searching...";

  try {
    const res = await fetch(`${API}/transfer/lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    });

    const data = await res.json();

    if (!data.ok) {
      toast(data.error || "Recipient not found", "error");
      return;
    }

    selectedRecipient = data.data;
    document.getElementById("recipientName").textContent = selectedRecipient.email;
    document.getElementById("recipientEmail").textContent = selectedRecipient.email;
    const verifiedBadge = document.getElementById("recipientVerifiedBadge");
    if (selectedRecipient.is_verified) {
      verifiedBadge.textContent = "Verified";
      verifiedBadge.classList.add("verified");
      verifiedBadge.classList.remove("unverified");
    } else {
      verifiedBadge.textContent = "Unverified";
      verifiedBadge.classList.remove("verified");
      verifiedBadge.classList.add("unverified");
    }
    document.getElementById("recipientInfo").classList.remove("hidden");
    toast("Recipient found!", "success");
  } catch (err) {
    toast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Lookup";
  }
}

async function initiateTransfer() {
  if (!currentUser) {
    toast("Please sign in first", "error");
    toggleAuth();
    return;
  }

  if (!selectedRecipient) {
    toast("Please lookup a recipient first", "error");
    return;
  }

  const amount = parseFloat(document.getElementById("transferAmount").value);
  const tokenSymbol = document.getElementById("transferToken").value;
  const chain = document.getElementById("transferChain").value;
  const btn = document.getElementById("initiateBtn");

  if (!amount || amount <= 0) {
    toast("Enter a valid amount", "error");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Initiating...";

  try {
    const headers = { "Content-Type": "application/json" };
    if (localStorage.getItem("authToken")) {
      headers["Authorization"] = `Bearer ${localStorage.getItem("authToken")}`;
    }

    const res = await fetch(`${API}/transfer/initiate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        recipientId: selectedRecipient.id,
        amount,
        tokenSymbol,
        chain,
      }),
    });

    const data = await res.json();

    if (!data.ok) {
      toast(data.error || "Transfer initiation failed", "error");
      return;
    }

    pendingTransferId = data.data.transferId;
    document.getElementById("initiateResult").textContent = `Transfer initiated! PIN: ${data.data.pin}`;
    document.getElementById("initiateResult").classList.remove("hidden");
    document.getElementById("confirmSection").classList.remove("hidden");
    toast("Transfer initiated. Enter PIN to confirm.", "success");
  } catch (err) {
    toast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Initiate Transfer";
  }
}

async function confirmTransfer() {
  if (!pendingTransferId) {
    toast("No pending transfer", "error");
    return;
  }

  const pin = document.getElementById("confirmPIN").value;
  const password = document.getElementById("confirmPassword").value;
  const btn = document.getElementById("confirmBtn");

  if (!pin || !password) {
    toast("Enter PIN and password", "error");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Confirming...";

  try {
    const headers = { "Content-Type": "application/json" };
    if (localStorage.getItem("authToken")) {
      headers["Authorization"] = `Bearer ${localStorage.getItem("authToken")}`;
    }

    const res = await fetch(`${API}/transfer/confirm`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        transferId: pendingTransferId,
        pin,
        password,
      }),
    });

    const data = await res.json();

    if (!data.ok) {
      toast(data.error || "Confirmation failed", "error");
      return;
    }

    document.getElementById("confirmResult").textContent = "Transfer completed successfully!";
    document.getElementById("confirmResult").classList.remove("hidden");
    toast("Transfer completed!", "success");

    // Reset form
    setTimeout(async () => {
      document.getElementById("confirmSection").classList.add("hidden");
      document.getElementById("recipientInfo").classList.add("hidden");
      document.getElementById("recipientIdentifier").value = "";
      document.getElementById("transferAmount").value = "";
      document.getElementById("confirmPIN").value = "";
      document.getElementById("confirmPassword").value = "";
      selectedRecipient = null;
      pendingTransferId = null;
      await loadTransferHistory();
      await checkAuthOnLoad();
    }, 2000);
  } catch (err) {
    toast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Confirm Transfer";
  }
}

function switchTransferTab(btn, tabName) {
  document.querySelectorAll("#view-transfer .tab").forEach((t) => t.classList.remove("active"));
  document.querySelectorAll("#view-transfer .tab-content").forEach((c) => c.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById(`tab-${tabName}`).classList.add("active");
}

async function loadTransferHistory() {
  if (!currentUser) return;

  try {
    const headers = { "Content-Type": "application/json" };
    if (localStorage.getItem("authToken")) {
      headers["Authorization"] = `Bearer ${localStorage.getItem("authToken")}`;
    }

    const res = await fetch(`${API}/transfer/history`, {
      method: "GET",
      headers,
    });

    const data = await res.json();

    if (!data.ok) {
      console.error("Failed to load transfer history");
      return;
    }

    // Populate sent transfers
    const sentBody = document.getElementById("sentBody");
    sentBody.innerHTML = "";
    if (data.data.sent && data.data.sent.length > 0) {
      data.data.sent.forEach((t) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td style="padding: 10px;">${t.recipient_email || t.recipient_id}</td>
          <td style="padding: 10px;">${t.amount} ${t.token_symbol}</td>
          <td style="padding: 10px;"><span style="background: ${t.status === 'completed' ? '#4CAF50' : '#FFC107'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${t.status}</span></td>
          <td style="padding: 10px;">${new Date(t.created_at).toLocaleDateString()}</td>
        `;
        sentBody.appendChild(row);
      });
    } else {
      sentBody.innerHTML = "<tr><td style=\"padding: 10px; text-align: center; color: #999;\" colspan=\"4\">No transfers sent yet</td></tr>";
    }

    // Populate received transfers
    const receivedBody = document.getElementById("receivedBody");
    receivedBody.innerHTML = "";
    if (data.data.received && data.data.received.length > 0) {
      data.data.received.forEach((t) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td style="padding: 10px;">${t.sender_email || t.sender_id}</td>
          <td style="padding: 10px;">${t.amount} ${t.token_symbol}</td>
          <td style="padding: 10px;"><span style="background: ${t.status === 'completed' ? '#4CAF50' : '#FFC107'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${t.status}</span></td>
          <td style="padding: 10px;">${new Date(t.created_at).toLocaleDateString()}</td>
        `;
        receivedBody.appendChild(row);
      });
    } else {
      receivedBody.innerHTML = "<tr><td style=\"padding: 10px; text-align: center; color: #999;\" colspan=\"4\">No transfers received yet</td></tr>";
    }
  } catch (err) {
    console.error("Error loading history:", err);
  }
}

// Init
function init() {
  checkAuthOnLoad().then(() => {
    updateUI();
  }).catch(err => {
    console.error("Init error:", err);
    updateUI();
  });
}

init();
