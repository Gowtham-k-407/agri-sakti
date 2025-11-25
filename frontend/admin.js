const API_BASE = "http://localhost:3000/api";

// ===== Helpers =====
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
  return JSON.parse(atob(t.split(".")[1]));
}

// ===== Logout =====
document.getElementById("logoutBtn")?.addEventListener("click", () => {
  localStorage.removeItem("agri_token");
  window.location.href = "admin-login.html";
});

// ===== LOAD USERS =====
async function loadUsers() {
  const tbody = document.getElementById("usersBody");
  tbody.innerHTML = "<tr><td colspan='8'>Loading...</td></tr>";

  try {
    const res = await authedFetch(`${API_BASE}/admin/users`);
    const users = await res.json();
    if (!res.ok) throw new Error(users.message);

    tbody.innerHTML = "";

    users.forEach((u) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${u.id}</td>
        <td>${u.name}</td>
        <td>${u.phone}</td>
        <td>${u.role}</td>
        <td>${u.land_area || "-"}</td>
        <td>${u.location || "-"}</td>
        <td>${u.experience_years || "-"}</td>
        <td>
          <button class="btn small danger" onclick="blockUser(${u.id})">🛑</button>
          <button class="btn small accent" onclick="unblockUser(${u.id})">♻</button>
        </td>
      `;

      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8">${err.message}</td></tr>`;
  }
}

// ===== BLOCK / UNBLOCK =====
async function blockUser(id) {
  await authedFetch(`${API_BASE}/admin/block`, {
    method: "POST",
    body: JSON.stringify({ id }),
  });
  loadUsers();
}

async function unblockUser(id) {
  await authedFetch(`${API_BASE}/admin/unblock`, {
    method: "POST",
    body: JSON.stringify({ id }),
  });
  loadUsers();
}

// ===== LOAD LISTINGS + DELETE =====
async function loadAdminListings() {
  const tbody = document.getElementById("adminListingsBody");
  tbody.innerHTML = "<tr><td colspan='5'>Loading...</td></tr>";

  try {
    const res = await authedFetch(`${API_BASE}/marketplace/listings`);
    const listings = await res.json();
    if (!res.ok) throw new Error(listings.message);

    tbody.innerHTML = "";

    listings.forEach((l) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${l.crop_name}</td>
        <td>${l.quantity_kg}</td>
        <td>${l.price_per_kg}</td>
        <td>${l.status}</td>
        <td><button class="btn small danger" onclick="deleteListing(${l.id})">🗑</button></td>
      `;

      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5">${err.message}</td></tr>`;
  }
}

async function deleteListing(id) {
  const sure = confirm("Delete this listing permanently?");
  if (!sure) return;

  await authedFetch(`${API_BASE}/marketplace/delete/${id}`, {
    method: "DELETE",
  });

  loadAdminListings();
}

// ===== INIT =====
function init() {
  const user = decodeToken();
  if (!user || user.role !== "admin") return (window.location.href = "admin-login.html");
  loadUsers();
  loadAdminListings();
}

init();
