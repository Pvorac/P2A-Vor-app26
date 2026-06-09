const grid = document.querySelector("#productGrid");
const totalPiecesElement = document.querySelector("#totalPieces");
const totalPriceElement = document.querySelector("#totalPrice");
const orderLinesElement = document.querySelector("#orderLines");
const form = document.querySelector("#orderForm");
const formMessage = document.querySelector("#formMessage");

let products = [];
const quantities = new Map();

const fallbackCsv = `id,name,description,price,icon
wrap,Wrap se syrem,Celozrnna tortilla se syrem zeleninou a bylinkovym dipem,59,WR
box,Svacina box,Mix ovoce zeleniny krupavych krekeru a domaci pomazanky,72,SB
tycinka,Energy tycinka,Ovesna tycinka s cokoladou a orisky do batohu,29,ET
limonada,Citronova limonada,Domaci limonada s matou v zalohovane lahvi,35,CL
smoothie,Skolni smoothie,Jahody banan jogurt a kapka medu,49,SM
muffin,Boruvkovy muffin,Mekky muffin s boruvkami peceny rano pred vyukou,32,BM
sendvic,Toustovy sendvic,Zapeceny sendvic se sunkou syrem a rajcaty,55,TS
salat,Mini salat,Cerstvy salat s kuskusem zeleninou a syrem balkanskeho typu,64,MS`;

const moneyFormatter = new Intl.NumberFormat("cs-CZ", {
  style: "currency",
  currency: "CZK",
  maximumFractionDigits: 0
});

function parseCsv(text) {
  const [headerLine, ...rows] = text.trim().split(/\r?\n/);
  const headers = headerLine.split(",").map((item) => item.trim());

  return rows.map((row) => {
    const values = row.split(",").map((item) => item.trim());
    return headers.reduce((product, header, index) => {
      product[header] = values[index];
      return product;
    }, {});
  });
}

function createProductCard(product) {
  const card = document.createElement("article");
  card.className = "product-card";

  card.innerHTML = `
    <div class="product-icon" aria-hidden="true">${product.icon}</div>
    <div>
      <h3>${product.name}</h3>
      <p>${product.description}</p>
    </div>
    <div class="product-meta">
      <span class="price">${moneyFormatter.format(Number(product.price))}</span>
      <div class="quantity" aria-label="Mnozstvi pro ${product.name}">
        <button type="button" data-action="minus" data-id="${product.id}">-</button>
        <input type="number" min="0" max="20" value="0" data-id="${product.id}" aria-label="Pocet kusu ${product.name}">
        <button type="button" data-action="plus" data-id="${product.id}">+</button>
      </div>
    </div>
  `;

  return card;
}

function renderProducts() {
  grid.innerHTML = "";
  products.forEach((product) => {
    quantities.set(product.id, 0);
    grid.append(createProductCard(product));
  });
}

function getSelectedItems() {
  return products
    .map((product) => ({
      ...product,
      quantity: quantities.get(product.id) || 0,
      price: Number(product.price)
    }))
    .filter((product) => product.quantity > 0);
}

function updateSummary() {
  const selectedItems = getSelectedItems();
  const pieces = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const total = selectedItems.reduce((sum, item) => sum + item.quantity * item.price, 0);

  totalPiecesElement.textContent = pieces;
  totalPriceElement.textContent = moneyFormatter.format(total);

  if (selectedItems.length === 0) {
    orderLinesElement.textContent = "Zatim neni vybran zadny produkt.";
    return;
  }

  const list = document.createElement("ul");
  selectedItems.forEach((item) => {
    const line = document.createElement("li");
    line.textContent = `${item.name}: ${item.quantity} ks, ${moneyFormatter.format(item.quantity * item.price)}`;
    list.append(line);
  });

  orderLinesElement.innerHTML = "";
  orderLinesElement.append(list);
}

function setQuantity(productId, value) {
  const safeValue = Math.max(0, Math.min(20, Number(value) || 0));
  quantities.set(productId, safeValue);

  const input = document.querySelector(`input[data-id="${productId}"]`);
  if (input) {
    input.value = safeValue;
  }

  updateSummary();
}

grid.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const productId = button.dataset.id;
  const currentValue = quantities.get(productId) || 0;
  const nextValue = button.dataset.action === "plus" ? currentValue + 1 : currentValue - 1;
  setQuantity(productId, nextValue);
});

grid.addEventListener("input", (event) => {
  if (!event.target.matches("input[data-id]")) {
    return;
  }

  setQuantity(event.target.dataset.id, event.target.value);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  formMessage.textContent = "";

  const selectedItems = getSelectedItems();
  if (selectedItems.length === 0) {
    formMessage.textContent = "Vyberte alespon jeden produkt.";
    return;
  }

  const customerName = document.querySelector("#customerName").value.trim();
  const customerEmail = document.querySelector("#customerEmail").value.trim();
  const customerPhone = document.querySelector("#customerPhone").value.trim();
  const totalPieces = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = selectedItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const orderedProducts = selectedItems
    .map((item) => `- ${item.name}: ${item.quantity} ks, ${moneyFormatter.format(item.quantity * item.price)}`)
    .join("\n");

  const subject = `Objednavka SnackLab - ${customerName}`;
  const body = [
    "Dobry den,",
    "",
    "posilam objednavku z webove aplikace SnackLab.",
    "",
    orderedProducts,
    "",
    `Pocet kusu celkem: ${totalPieces}`,
    `Celkova cena: ${moneyFormatter.format(totalPrice)}`,
    "",
    "Kontakt na zakaznika:",
    `Jmeno: ${customerName}`,
    `E-mail: ${customerEmail}`,
    `Telefon: ${customerPhone}`
  ].join("\n");

  window.location.href = `mailto:app@kostka-skola.cz?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});

async function loadProducts() {
  try {
    const response = await fetch("products.csv");
    if (!response.ok) {
      throw new Error("CSV soubor se nepodarilo nacist.");
    }

    products = parseCsv(await response.text());
    renderProducts();
    updateSummary();
  } catch (error) {
    products = parseCsv(fallbackCsv);
    renderProducts();
    updateSummary();
    formMessage.textContent = "Produkty jsou zobrazeny ze zalozni kopie. Pri spusteni pres GitHub Pages se nactou z products.csv.";
  }
}

loadProducts();
