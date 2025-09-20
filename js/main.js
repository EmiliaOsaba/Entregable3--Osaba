// ==== Proyecto Final: Tienda de Ropa ====
const $ = (sel) => document.querySelector(sel);
const formatUYU = (n) =>
  new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU" }).format(
    n
  );

class Product {
  constructor({ id, name, price, stock = 0, category = "General" }) {
    this.id = id;
    this.name = name;
    this.price = Number(price);
    this.stock = Number(stock);
    this.category = category;
  }
}
class Coupon {
  constructor({ code, type, value, min = 0 }) {
    this.code = code.toUpperCase();
    this.type = type;
    this.value = Number(value);
    this.min = Number(min);
  }
}
class CartItem {
  constructor({ id, name, unitPrice, qty }) {
    this.id = id;
    this.name = name;
    this.unitPrice = Number(unitPrice);
    this.qty = Number(qty);
  }
}

const KEYS = {
  PRODUCTS: "pf_moda_products",
  COUPONS: "pf_moda_coupons",
  CART: "pf_moda_cart",
  PROFILE: "pf_moda_profile",
  ORDERS: "pf_moda_orders",
  ACTIVE_COUPON: "pf_moda_active_coupon",
};

let products = [],
  coupons = [],
  cart = [],
  activeCoupon = null;

// ---- Datos (fetch JSON con fallback) ----
async function fetchJSON(path) {
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } catch {
    return null;
  }
}
async function loadData() {
  const p = await fetchJSON("./data/products.json");
  const c = await fetchJSON("./data/coupons.json");
  products =
    p && Array.isArray(p)
      ? p.map((x) => new Product(x))
      : [
          new Product({
            id: crypto.randomUUID(),
            name: "Camisa",
            price: 1500,
            stock: 20,
            category: "Ropa",
          }),
          new Product({
            id: crypto.randomUUID(),
            name: "Pantalón",
            price: 2300,
            stock: 20,
            category: "Ropa",
          }),
          new Product({
            id: crypto.randomUUID(),
            name: "Championes",
            price: 4500,
            stock: 15,
            category: "Calzado",
          }),
          new Product({
            id: crypto.randomUUID(),
            name: "Gorra",
            price: 800,
            stock: 25,
            category: "Accesorio",
          }),
        ];
  coupons =
    c && Array.isArray(c)
      ? c.map((x) => new Coupon(x))
      : [
          new Coupon({ code: "NUEVO10", type: "percent", value: 10, min: 0 }),
          new Coupon({ code: "MODA300", type: "fixed", value: 300, min: 3000 }),
        ];
  localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
  localStorage.setItem(KEYS.COUPONS, JSON.stringify(coupons));
}

// ---- Persistencia carrito/cupón ----
function saveCart() {
  localStorage.setItem(KEYS.CART, JSON.stringify(cart));
  activeCoupon
    ? localStorage.setItem(KEYS.ACTIVE_COUPON, JSON.stringify(activeCoupon))
    : localStorage.removeItem(KEYS.ACTIVE_COUPON);
}
function loadCart() {
  cart = JSON.parse(localStorage.getItem(KEYS.CART) || "[]");
  const ac = JSON.parse(localStorage.getItem(KEYS.ACTIVE_COUPON) || "null");
  activeCoupon = ac ? new Coupon(ac) : null;
}

// ---- Catálogo ----
function renderProducts(list) {
  const ul = $("#productList");
  ul.innerHTML = "";
  if (!list.length) {
    ul.innerHTML =
      '<li class="card"><em>No hay productos para mostrar</em></li>';
    return;
  }
  const frag = document.createDocumentFragment();
  list.forEach((p) => {
    const li = document.createElement("li");
    li.className = "card";
    li.innerHTML = `
      <div>
        <h3>${p.name}</h3>
        <div class="meta">
          <span class="price">${formatUYU(p.price)}</span> · 
          <span class="badge">${p.category}</span> · 
          <span class="badge ${p.stock === 0 ? "danger" : ""}">Stock: ${
      p.stock
    }</span>
        </div>
      </div>
      <div class="actions">
        <button class="btn ghost" data-action="add" data-id="${p.id}" ${
      p.stock === 0 ? "disabled" : ""
    }>Agregar</button>
      </div>`;
    frag.appendChild(li);
  });
  ul.appendChild(frag);
}
function populateCategories() {
  const sel = $("#categorySelect");
  const cats = Array.from(new Set(products.map((p) => p.category))).sort();
  cats.forEach((c) => {
    const o = document.createElement("option");
    o.value = c;
    o.textContent = c;
    sel.appendChild(o);
  });
}
function applyFilters() {
  const term = $("#searchInput").value.trim().toLowerCase();
  const sort = $("#sortSelect").value;
  const cat = $("#categorySelect").value;
  let list = products.filter(
    (p) =>
      (p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term)) &&
      (cat === "all" || p.category.toLowerCase() === cat.toLowerCase())
  );
  const sorters = {
    alphaAsc: (a, b) => a.name.localeCompare(b.name),
    alphaDesc: (a, b) => b.name.localeCompare(a.name),
    priceAsc: (a, b) => a.price - b.price,
    priceDesc: (a, b) => b.price - a.price,
  };
  list.sort(sorters[sort]);
  renderProducts(list);
}

// ---- Carrito ----
function cartTotals() {
  const items = cart.reduce((a, i) => a + i.qty, 0);
  const subtotal = cart.reduce((a, i) => a + i.qty * i.unitPrice, 0);
  let discount = 0;
  if (activeCoupon && subtotal >= activeCoupon.min) {
    discount =
      activeCoupon.type === "percent"
        ? Math.round(subtotal * (activeCoupon.value / 100))
        : activeCoupon.value;
    if (discount > subtotal) discount = subtotal;
  }
  return { items, subtotal, discount, total: subtotal - discount };
}
function renderCart() {
  const ul = $("#cartList");
  ul.innerHTML = "";
  if (!cart.length) {
    ul.innerHTML = '<li class="card"><em>Tu carrito está vacío</em></li>';
  } else {
    cart.forEach((i) => {
      const li = document.createElement("li");
      li.className = "card";
      li.innerHTML = `
        <div>
          <h3>${i.name}</h3>
          <div class="meta">${formatUYU(i.unitPrice)} c/u</div>
        </div>
        <div class="actions">
          <button class="btn ghost" data-action="dec" data-id="${
            i.id
          }">−</button>
          <span class="badge">${i.qty}</span>
          <button class="btn ghost" data-action="inc" data-id="${
            i.id
          }">+</button>
          <button class="btn" data-action="remove" data-id="${
            i.id
          }">Quitar</button>
        </div>`;
      ul.appendChild(li);
    });
  }
  const { items, subtotal, discount, total } = cartTotals();
  $("#cartItems").textContent = String(items);
  $("#cartSubtotal").textContent = formatUYU(subtotal);
  $("#cartDiscount").textContent = "– " + formatUYU(discount);
  $("#cartTotal").textContent = formatUYU(total);
  $("#couponMsg").textContent = activeCoupon
    ? `Cupón aplicado: ${activeCoupon.code}`
    : "";
}
function addToCart(id) {
  const p = products.find((x) => x.id === id);
  if (!p || p.stock <= 0) return;
  const ex = cart.find((i) => i.id === id);
  if (ex) {
    if (p.stock - ex.qty <= 0) return;
    ex.qty += 1;
  } else
    cart.push(
      new CartItem({ id: p.id, name: p.name, unitPrice: p.price, qty: 1 })
    );
  p.stock -= 1;
  saveCart();
  applyFilters();
  renderCart();
}
function changeQty(id, delta) {
  const it = cart.find((i) => i.id === id);
  const p = products.find((x) => x.id === id);
  if (!it || !p) return;
  const newQty = it.qty + delta;
  if (newQty <= 0) {
    p.stock += it.qty;
    cart = cart.filter((i) => i.id !== id);
  } else {
    if (delta > 0 && p.stock <= 0) return;
    it.qty = newQty;
    p.stock -= delta;
  }
  saveCart();
  applyFilters();
  renderCart();
}
function removeFromCart(id) {
  const it = cart.find((i) => i.id === id);
  const p = products.find((x) => x.id === id);
  if (!it || !p) return;
  p.stock += it.qty;
  cart = cart.filter((i) => i.id !== id);
  saveCart();
  applyFilters();
  renderCart();
}
function clearCart() {
  cart.forEach((i) => {
    const p = products.find((x) => x.id === i.id);
    if (p) p.stock += i.qty;
  });
  cart = [];
  activeCoupon = null;
  saveCart();
  applyFilters();
  renderCart();
}

// ---- Nuevo producto ----
function handleNewProduct(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  const name = (data.name || "").trim();
  const price = Number(data.price);
  const stock = parseInt(data.stock, 10);
  const category = (data.category || "General").trim();
  const msg = $("#formMsg");
  if (name.length < 2) {
    msg.textContent = "El nombre debe tener al menos 2 caracteres.";
    return;
  }
  if (!Number.isFinite(price) || price <= 0) {
    msg.textContent = "El precio debe ser mayor a 0.";
    return;
  }
  if (!Number.isInteger(stock) || stock < 0) {
    msg.textContent = "El stock debe ser un entero ≥ 0.";
    return;
  }
  products.push(
    new Product({ id: crypto.randomUUID(), name, price, stock, category })
  );
  localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
  msg.textContent = "✅ Prenda creada.";
  form.reset();
  applyFilters();
}

// ---- Cupones ----
function applyCoupon(code) {
  code = (code || "").toUpperCase();
  const lst = JSON.parse(localStorage.getItem(KEYS.COUPONS) || "[]").map(
    (x) => new Coupon(x)
  );
  const c =
    lst.find((x) => x.code === code) || coupons.find((x) => x.code === code);
  const { subtotal } = cartTotals();
  const msg = $("#couponMsg");
  if (!c) {
    msg.textContent = "Cupón inválido.";
    activeCoupon = null;
    saveCart();
    renderCart();
    return;
  }
  if (subtotal < c.min) {
    msg.textContent = `Este cupón requiere un mínimo de ${formatUYU(c.min)}.`;
    activeCoupon = null;
    saveCart();
    renderCart();
    return;
  }
  activeCoupon = c;
  msg.textContent = `Cupón aplicado: ${c.code}`;
  saveCart();
  renderCart();
}

// ---- Checkout ----
function prefillForm() {
  const profile = JSON.parse(localStorage.getItem(KEYS.PROFILE) || "null");
  if (!profile) {
    $("#cName").value = "Emilia Test";
    $("#cEmail").value = "emilia@example.com";
    $("#cAddress").value = "Av. Italia 1234, Montevideo";
    $("#cPayment").value = "debito";
    $("#cInstallments").value = "1";
    return;
  }
  $("#cName").value = profile.name || "";
  $("#cEmail").value = profile.email || "";
  $("#cAddress").value = profile.address || "";
  $("#cPayment").value = profile.payment || "debito";
  $("#cInstallments").value = profile.installments || "1";
}
function saveProfile() {
  const data = {
    name: $("#cName").value.trim(),
    email: $("#cEmail").value.trim(),
    address: $("#cAddress").value.trim(),
    payment: $("#cPayment").value,
    installments: $("#cInstallments").value,
  };
  localStorage.setItem(KEYS.PROFILE, JSON.stringify(data));
}
function validateCheckout() {
  const { total } = cartTotals();
  if (cart.length === 0) return { ok: false, msg: "Tu carrito está vacío." };
  if (total <= 0) return { ok: false, msg: "El total debe ser mayor a 0." };
  if (!$("#cName").value.trim())
    return { ok: false, msg: "Ingresá tu nombre." };
  if (!$("#cEmail").value.trim())
    return { ok: false, msg: "Ingresá tu email." };
  if (!$("#cAddress").value.trim())
    return { ok: false, msg: "Ingresá tu dirección." };
  return { ok: true };
}
function createOrder() {
  const { total, discount, subtotal } = cartTotals();
  return {
    id: "ORD-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
    items: structuredClone(cart),
    subtotal,
    discount,
    total,
    coupon: activeCoupon ? activeCoupon.code : null,
    buyer: {
      name: $("#cName").value.trim(),
      email: $("#cEmail").value.trim(),
      address: $("#cAddress").value.trim(),
      payment: $("#cPayment").value,
      installments: $("#cInstallments").value,
    },
    createdAt: new Date().toISOString(),
  };
}
function saveOrder(o) {
  const arr = JSON.parse(localStorage.getItem(KEYS.ORDERS) || "[]");
  arr.push(o);
  localStorage.setItem(KEYS.ORDERS, JSON.stringify(arr));
}
async function checkout() {
  const v = validateCheckout();
  if (!v.ok) {
    Swal.fire({ icon: "warning", title: "Atención", text: v.msg });
    return;
  }
  if ($("#saveProfile").checked) saveProfile();
  Swal.showLoading();
  await new Promise((r) => setTimeout(r, 600));
  Swal.close();
  const order = createOrder();
  saveOrder(order);
  clearCart();
  Swal.fire({
    icon: "success",
    title: "Compra confirmada",
    html: `<p>Orden <strong>${
      order.id
    }</strong></p><p>Total: <strong>${formatUYU(order.total)}</strong></p>`,
  });
}

// ---- Eventos / Init ----
function bindEvents() {
  $("#searchInput").addEventListener("input", applyFilters);
  $("#sortSelect").addEventListener("change", applyFilters);
  $("#categorySelect").addEventListener("change", applyFilters);
  $("#productList").addEventListener("click", (e) => {
    const b = e.target.closest('button[data-action="add"]');
    if (b) addToCart(b.dataset.id);
  });
  $("#cartList").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const id = b.dataset.id,
      a = b.dataset.action;
    if (a === "inc") changeQty(id, +1);
    if (a === "dec") changeQty(id, -1);
    if (a === "remove") removeFromCart(id);
  });
  $("#applyCouponBtn").addEventListener("click", () =>
    applyCoupon($("#couponInput").value)
  );
  $("#clearCartBtn").addEventListener("click", clearCart);
  $("#checkoutBtn").addEventListener("click", () =>
    document
      .querySelector(".checkout")
      .scrollIntoView({ behavior: "smooth", block: "start" })
  );
  $("#newProductForm").addEventListener("submit", handleNewProduct);
  $("#checkoutForm").addEventListener("submit", (e) => {
    e.preventDefault();
    checkout();
  });
}
async function init() {
  await loadData();
  loadCart();
  renderProducts(products);
  populateCategories();
  applyFilters();
  renderCart();
  prefillForm();
  bindEvents();
}
document.addEventListener("DOMContentLoaded", init);
