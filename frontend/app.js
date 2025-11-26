// ================== GLOBAL CONFIG ==================
const API_BASE = "https://agri-sakti-1.onrender.com";
let currentBuyListingId = null;
let state = { listings: [] };

// ================== AUTH UTILS ==================
function authedFetch(url, options = {}) {
  const token = localStorage.getItem("agri_token");
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

function decodeToken() {
  const t = localStorage.getItem("agri_token");
  if (!t) return null;

  try {
    const base64 = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch (e) {
    console.error("TOKEN PARSE ERROR:", e);
    return null;
  }
}


// ================== BUY MODAL ==================
function openBuyModal(listingId) {
  currentBuyListingId = listingId;
  document.getElementById("buyModal").classList.remove("hidden");
}

function closeBuyModal() {
  currentBuyListingId = null;
  document.getElementById("buyModal").classList.add("hidden");
}

document.getElementById("confirmBuyBtn")?.addEventListener("click", async () => {
  const qty = Number(document.getElementById("buyQty").value);
  if (!qty || qty <= 0) return alert("Enter valid quantity");

  try {
    const res = await authedFetch(`${API_BASE}/marketplace/buy`, {
      method: "POST",
      body: JSON.stringify({ listing_id: currentBuyListingId, quantity: qty }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    alert("Purchase Successful");
    closeBuyModal();
    loadListings();
  } catch (err) {
    alert(err.message);
  }
});

function loadProfile() {
  const user = decodeToken();
  if (!user) return (window.location.href = "login.html");

  console.log("DECODED TOKEN:", user);

  document.getElementById("headerPhone").innerText = user.phone;
  document.getElementById("headerRole").innerText = user.role;

  // FIX: show REAL name
  document.getElementById("profileName").innerText = user.name;
  document.getElementById("profilePhone").innerText = user.phone;
  document.getElementById("profileRole").innerText = user.role;
}



// ================== LOAD LISTINGS ==================
async function loadListings() {
  const tbody = document.getElementById("listingsBody");
  if (!tbody) return;

  tbody.innerHTML = "<tr><td colspan='6'>Loading...</td></tr>";

  try {
    const res = await authedFetch(`${API_BASE}/marketplace/listings`);
    const listings = await res.json();
    if (!res.ok) throw new Error(listings.message);

    state.listings = listings;

    document.getElementById("openListingsCount").innerText =
      listings.filter((l) => l.status === "OPEN").length;

    tbody.innerHTML = "";
    const user = decodeToken();

    listings.forEach((l) => {
      const canBuy = (user.role === "buyer" || user.role === "admin") && l.status === "OPEN";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${l.farmer_name}</td>
        <td>${l.crop_name}</td>
        <td>${l.quantity_kg}</td>
        <td>${l.price_per_kg}</td>
        <td>${l.status}</td>
        <td>${canBuy ? `<button class="btn-buy" data-id="${l.id}">Buy</button>` : ""}</td>
      `;
      tbody.appendChild(tr);
    });

    document.querySelectorAll(".btn-buy").forEach((btn) =>
      btn.addEventListener("click", () => openBuyModal(btn.dataset.id))
    );
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan='6'>${err.message}</td></tr>`;
  }
}

// ================== CREATE LISTING ==================
document.getElementById("listingForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(e.target));

  const res = await authedFetch(`${API_BASE}/marketplace/listings`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) return alert(data.message);

  loadListings();
});

// ================== AI CROP ==================
document.getElementById("aiCropForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(e.target));

  const res = await fetch(`${API_BASE}/ai/recommend-crop`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  document.getElementById("aiCropResult").innerText =
    `Recommended: ${data.recommended_crop} — ${data.explanation}`;
});

// ================== EXPERTS ==================
async function loadExperts() {
  const res = await fetch(`${API_BASE}/experts`);
  const experts = await res.json();
  const container = document.getElementById("expertsList");
  container.innerHTML = experts.map(e => `
    <div class="expert-card">
      <h4>${e.name}</h4>
      <p>${e.speciality}</p>
      <p>${e.region}</p>
      <p>${e.phone}</p>
    </div>
  `).join("");
}

// ================== LOGOUT ==================
document.getElementById("logoutBtn")?.addEventListener("click", () => {
  localStorage.removeItem("agri_token");
  window.location.replace("login.html");
});

// ================== INIT SEQUENCE ==================
(async () => {
  await loadProfile();   // auth check first
  await loadListings();
  await loadExperts();
})();
