// ==========================================
// 1. SYSTEM CONFIGURATION (Client Settings)
// ==========================================
const POS_CONFIG = {
  // Place your GAS Web App URL here
  API_URL: "https://script.google.com/macros/s/AKfycbwycxk1I1LTHHrT0qFiImSM-k_zk8p-e_1eQY_Dy-IRiTySUgP1F2t5grjTHcgIn8pe/exec", 
  
  // Place the Client's Google Sheet ID here
  SHEET_ID: "1F5rcnE8xVwkyFnLNmZM__FkvNFgWEEoiQvKgKnq7P_o", 
  
  CURRENCY: "৳",
  LOGO: "" 
};
  
let currentUser = { role: 'admin', name: 'Admin' };
  
let APP_SETTINGS = {
  PASSWORD: "admin",
  DELIVERY_CHARGE: 0,
  FREE_DELIVERY_OVER: 0,
  SMS_ENABLED: false,
  REWARDS_ENABLED: true
};
  
let shopTaxRate = 0; 
let cart = []; 
let allCustomers = [];
let currentCustomerBalance = 0;
let appliedRewardPoints = 0;
window.todaysSalesAmount = 0;
window.todaysExpenseAmount = 0;
window.allDues = [];
window.thisMonthSales = 0;
window.thisMonthExpense = 0;
window.thisYearSales = 0;
window.thisYearExpense = 0;
  
// ==========================================
// 3. FETCH PRODUCTS (Fetch data from Google Sheets)
// ==========================================
async function loadProducts() {
  try {
    const response = await fetch(`${POS_CONFIG.API_URL}?action=getProducts&sheetId=${POS_CONFIG.SHEET_ID}`);
    const result = await response.json();

    if (result.status === "success" || result.status === 'success') {
      allProducts = result.data;
      allCustomers = result.customers || []; 
      window.todaysSalesAmount = result.todaysSales || 0;
      window.todaysDueGiven = result.todaysDueGiven || 0;
      window.todaysDueCollection = result.todaysDueCollection || 0;
      window.todaysExpenseAmount = result.todaysExpense || 0;
      window.allDues = result.dues || [];
      window.looseProducts = result.looseProducts || [];
      
      window.thisMonthSales = result.thisMonthSales || 0;
      window.thisMonthExpense = result.thisMonthExpense || 0;
      window.thisYearSales = result.thisYearSales || 0;
      window.thisYearExpense = result.thisYearExpense || 0;

      renderCategories();
      filterAndDisplayProducts();

      if (result.config) {
        POS_CONFIG.CURRENCY = result.config.Currency || "৳";
        POS_CONFIG.LOGO = result.config.ShopLogo || ""; // Config থেকে লোগো নেওয়া হচ্ছে
        
        shopTaxRate = result.config.TaxRate ? parseFloat(result.config.TaxRate) : 0;
        
        APP_SETTINGS.PASSWORD = result.config.Password || "1234";
        APP_SETTINGS.DELIVERY_CHARGE = parseFloat(result.config.DeliveryCharge) || 0;
        APP_SETTINGS.FREE_DELIVERY_OVER = parseFloat(result.config.FreeDeliveryOver) || 0;
        APP_SETTINGS.SMS_ENABLED = result.config.SmsEnabled === "TRUE";
        APP_SETTINGS.AdminPIN = result.config.AdminPIN || "admin";
        APP_SETTINGS.SalesUsers = result.config.SalesUsers || "";
        
        const shopName = result.config.ShopName || "My POS Shop";
        
// ওয়েবসাইটের হেডারে লোগো বসানো (শুধু লোগো দেখাবে)
        if (POS_CONFIG.LOGO !== "") {
            document.querySelector('.logo h2').innerHTML = `<img src='${POS_CONFIG.LOGO}' style='max-height: 45px; vertical-align: middle;'/>`;
        } else {
            document.querySelector('.logo h2').innerHTML = `<i class='fa-solid fa-store'></i> ${shopName}`;
        }

        document.getElementById('inv-shop-name').innerText = shopName;
        
        const addressText = result.config.Address ? `<p style='text-align:center; font-size:12px; margin:2px 0;'>${result.config.Address}</p>` : "";
        const phoneText = result.config.Phone ? `<p style='text-align:center; font-size:12px; margin:2px 0;'>Phone: ${result.config.Phone}</p>` : "";
        
        if (!document.getElementById('inv-contact-info')) {
           document.getElementById('inv-shop-name').insertAdjacentHTML('afterend', `<div id='inv-contact-info'>${addressText}${phoneText}</div>`);
        }
      }

      let lastLogin = localStorage.getItem('pos_login_time');
      if (lastLogin && (Date.now() - parseInt(lastLogin) < 30 * 60 * 1000)) {
         document.getElementById('login-screen').style.display = 'none'; 
         applyRolePermissions(); 
      } else {
         document.getElementById('login-msg').innerHTML = "System Ready. Enter your password.";
         document.getElementById('login-msg').style.color = "#10b981";
         document.getElementById('admin-pin').style.display = 'block';
         document.getElementById('login-btn').style.display = 'block';
         document.getElementById('admin-pin').focus();
      }

    } else {
      document.getElementById('login-msg').innerHTML = "Error: " + result.message;
      document.getElementById('login-msg').style.color = "red";
    }
  } catch (error) {
    document.getElementById('login-msg').innerHTML = "Network Error! Could not connect to API.";
    document.getElementById('login-msg').style.color = "red";
  }
}

// ==========================================
// 4. DISPLAY PRODUCTS (Show products in UI)
// ==========================================
function displayProducts(products) {
  const productArea = document.querySelector('.product-area');
  productArea.innerHTML = ""; 

  if (products.length === 0) {
    productArea.innerHTML = "<p style='grid-column: 1 / -1; text-align: center;'>No products found!</p>";
    return;
  }

  products.forEach(product => {
    let stockBadge = parseInt(product.Stock) > 0 
      ? `<span class='stock-badge'>Stock: ${product.Stock}</span>` 
      : `<span class='stock-badge' style='background: #ef4444;'>Out of Stock</span>`;
      
    let imgUrl = `https://via.placeholder.com/150?text=${product.Name.substring(0,3).toUpperCase()}`; 
    
    if (product['Image URL']) {
      let rawUrl = product['Image URL'];
      if (rawUrl.includes('drive.google.com/file/d/')) {
        let fileId = rawUrl.split('/file/d/')[1].split('/')[0];
       imgUrl = `https://lh3.googleusercontent.com/d/${fileId}`;

      } else {
        imgUrl = rawUrl; 
      }
    }

    let salePrice = product['Sale Price'] || product['Price'] || 0;

    let cardHTML = `
      <div class='product-card' onclick='addToCart("${product.Barcode}")'>
        ${stockBadge}
        <img alt='${product.Name}' class='product-img' src='${imgUrl}'/>
        <div class='product-title'>${product.Name}</div>
        <div class='product-price'>${POS_CONFIG.CURRENCY} ${salePrice}</div>
      </div>
    `;
    productArea.innerHTML += cardHTML;
  });
}
  
// ==========================================
// 5. CART MANAGEMENT (Cart Logic)
// ==========================================
const SYS_LANG = 'EN'; 

const ALERTS = {
  BN: {
    notFound: "প্রোডাক্ট পাওয়া যায়নি!",
    outOfStock: "দুঃখিত, এই প্রোডাক্টটি স্টকে নেই!",
    stockLimit: "স্টকে এর চেয়ে বেশি প্রোডাক্ট নেই!"
  },
  EN: {
    notFound: "Product not found!",
    outOfStock: "Sorry, this product is out of stock!",
    stockLimit: "Not enough stock available!"
  }
};

function addToCart(barcode) {
  const product = allProducts.find(p => p.Barcode == barcode);
  if (!product) { alert(ALERTS[SYS_LANG].notFound); return; }
  
  if (parseInt(product.Stock) <= 0) { alert(ALERTS[SYS_LANG].outOfStock); return; }

  const existingItem = cart.find(item => item.Barcode == barcode);
  if (existingItem) {
     if (existingItem.qty < parseInt(product.Stock)) existingItem.qty += 1;
    else alert(ALERTS[SYS_LANG].stockLimit);
  } else {
    let activePrice = product['Sale Price'] || product['Price'] || 0;
    cart.push({ ...product, Price: activePrice, qty: 1 });
  }
  updateCartUI();
}
                 
function changeQty(barcode, change) {
  const itemIndex = cart.findIndex(item => item.Barcode == barcode);
  if (itemIndex > -1) {
    const item = cart[itemIndex];
    const newQty = item.qty + change;
    if (newQty > parseInt(item.Stock)) { alert(ALERTS[SYS_LANG].stockLimit); return; }
    if (newQty > 0) item.qty = newQty;
    else cart.splice(itemIndex, 1); 
    updateCartUI();
  }
}

function removeFromCart(barcode) {
  cart = cart.filter(item => item.Barcode != barcode);
  updateCartUI();
}

document.querySelector('.clear-cart').addEventListener('click', () => {
  if(confirm("Are you sure you want to clear the cart?")) {
    cart = [];
    updateCartUI();
  }
});

// ==========================================
// 6. UPDATE CART UI (Calculations)
// ==========================================
function updateCartUI() {
  const cartItemsContainer = document.querySelector('.cart-items');
  cartItemsContainer.innerHTML = "";
  let subtotal = 0;

 cart.forEach(item => {
    const itemTotal = parseFloat(item.Price) * item.qty;
    subtotal += itemTotal;
    
    const displayQty = item.isLooseTab ? item.qty.toFixed(3) + " " + (item.Unit || "") : item.qty;
    
    const qtyControls = item.isLooseTab 
       ? `<span style='font-weight:bold; color:#2563eb; background:#eff6ff; padding:4px 8px; border-radius:4px;'>${displayQty}</span>`
       : `<button class='qty-btn' onclick='changeQty("${item.Barcode}", -1)'>-</button>
          <span>${displayQty}</span>
          <button class='qty-btn' onclick='changeQty("${item.Barcode}", 1)'>+</button>`;

    const itemHTML = `
      <div class='cart-item'>
        <div class='item-info'>
          <div class='item-title'>${item.Name}</div>
          <div class='qty-controls' style='margin-top:5px;'>
            ${qtyControls}
          </div>
        </div>
        <div class='item-price'>${POS_CONFIG.CURRENCY} ${itemTotal.toFixed(2)}</div>
        <i class='fa-solid fa-times item-remove' onclick='removeFromCart("${item.Barcode}")'></i>
      </div>
    `;
    cartItemsContainer.innerHTML += itemHTML;
  });

  const taxRate = shopTaxRate / 100; 
  const tax = subtotal * taxRate;
  const rewardDiscount = appliedRewardPoints; 
  
  const manualDiscInput = document.getElementById('manual-discount');
  const manualDiscount = manualDiscInput && manualDiscInput.value !== "" ? parseFloat(manualDiscInput.value) : 0;
  
  const totalDiscount = rewardDiscount + manualDiscount;
  
  let delivery = 0;
  if (APP_SETTINGS.DELIVERY_CHARGE > 0) {
     delivery = APP_SETTINGS.DELIVERY_CHARGE;
     if (APP_SETTINGS.FREE_DELIVERY_OVER > 0 && subtotal >= APP_SETTINGS.FREE_DELIVERY_OVER) {
        delivery = 0; 
     }
  }
  
  const total = subtotal + tax + delivery - totalDiscount;

  const calcRows = document.querySelectorAll('.calc-row span:nth-child(2)');
  calcRows[0].innerHTML = `${POS_CONFIG.CURRENCY} ${subtotal.toFixed(2)}`;
  calcRows[1].innerHTML = `${POS_CONFIG.CURRENCY} ${tax.toFixed(2)}`;
  calcRows[2].innerHTML = `${POS_CONFIG.CURRENCY} ${totalDiscount.toFixed(2)}`;
  
  const totalRow = document.querySelector('.total-row span:nth-child(2)');
  totalRow.innerHTML = `${POS_CONFIG.CURRENCY} ${total.toFixed(2)}`;
  
  if(typeof calculateDue === 'function') calculateDue();
}
  
function calculateDue() {
  let subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.Price) * item.qty), 0);
  let tax = subtotal * (shopTaxRate / 100);
  
  let delivery = (APP_SETTINGS.DELIVERY_CHARGE > 0 && subtotal < APP_SETTINGS.FREE_DELIVERY_OVER) ? APP_SETTINGS.DELIVERY_CHARGE : 0;
  
  let totalAmount = subtotal + tax + delivery - appliedRewardPoints;
  
  let paidInput = document.getElementById('paid-amount').value;
  let dueText = document.getElementById('due-amount-text');
  
  if (paidInput !== "") {
     let paid = parseFloat(paidInput) || 0;
     let due = totalAmount - paid;
     if (due > 0) {
        dueText.style.display = 'block';
        dueText.innerText = `Due: ${POS_CONFIG.CURRENCY} ${due.toFixed(2)}`;
     } else {
        dueText.style.display = 'none';
     }
  } else {
     dueText.style.display = 'none';
  }
}
  
// ==========================================
// 7. BARCODE SCANNER INTEGRATION
// ==========================================
const barcodeInput = document.getElementById('barcode-input');
barcodeInput.addEventListener('keypress', function (e) {
  if (e.key === 'Enter') {
    const scannedCode = barcodeInput.value.trim();
    if (scannedCode !== "") {
      addToCart(scannedCode);
      barcodeInput.value = ""; 
    }
  }
});

// ==========================================
// 8. INITIALIZE APP
// ==========================================
window.onload = () => {
  loadProducts(); 
};
  
// ==========================================
// 9. CHECKOUT and SAVE TO SHEET
// ==========================================
let selectedPaymentMethod = "Cash";

document.querySelectorAll('.pay-method').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.pay-method').forEach(b => b.classList.remove('active'));
    e.currentTarget.classList.add('active');
    selectedPaymentMethod = e.currentTarget.innerText.trim();
  });
});

document.getElementById('complete-sale-btn').addEventListener('click', async () => {
  if (cart.length === 0) {
    alert("Cart is empty! Please add products first.");
    return;
  }

  const checkoutBtn = document.getElementById('complete-sale-btn');
  checkoutBtn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Processing...";
  checkoutBtn.disabled = true;

  let subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.Price) * item.qty), 0);
  let tax = subtotal * (shopTaxRate / 100);
  
  let delivery = 0;
  if (APP_SETTINGS.DELIVERY_CHARGE > 0) {
     delivery = APP_SETTINGS.DELIVERY_CHARGE;

     if (subtotal >= APP_SETTINGS.FREE_DELIVERY_OVER) {
        if (APP_SETTINGS.FREE_DELIVERY_OVER > 0) {
            delivery = 0;
        }
     }
  }
  
  let totalAmount = subtotal + tax + delivery;
  const manualDiscInput = document.getElementById('manual-discount');
  const manualDiscount = manualDiscInput && manualDiscInput.value !== "" ? parseFloat(manualDiscInput.value) : 0;
  const totalDiscount = appliedRewardPoints + manualDiscount;
  const customerName = document.getElementById('customer-name').value.trim();
  const customerPhone = document.getElementById('customer-phone').value.trim();

  let paidInput = document.getElementById('paid-amount').value;
  let finalPaidAmount = paidInput !== "" ? parseFloat(paidInput) : (totalAmount - totalDiscount);

  const requestBody = {
    action: "completeSale",
    sheetId: POS_CONFIG.SHEET_ID,
    cart: cart,
    total: totalAmount - totalDiscount,
    paymentMethod: selectedPaymentMethod,
    customerName: customerName,
    customerPhone: customerPhone,
    redeemedPoints: totalDiscount,
    soldBy: currentUser.name,
    paidAmount: finalPaidAmount
  };

  try {
    const response = await fetch(POS_CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });

    const result = await response.json();

    if (result.status === "success" || result.status === 'success') {
      alert("Sale Successful! Invoice No: " + result.invoice);
      
      printInvoice(result.invoice, cart, subtotal, tax, totalAmount - totalDiscount, selectedPaymentMethod, delivery, totalDiscount, customerName, customerPhone);
      
      cart = []; 
      appliedRewardPoints = 0; 
      document.getElementById('customer-phone').value = '';
      document.getElementById('customer-name').value = '';
      document.getElementById('paid-amount').value = ''; 
      if(document.getElementById('manual-discount')) document.getElementById('manual-discount').value = ''; 
      document.getElementById('due-amount-text').style.display = 'none';
      document.getElementById('reward-box').style.display = 'none';
      document.getElementById('redeem-btn').innerText = "Redeem";
      document.getElementById('redeem-btn').style.background = "#3b82f6";
      updateCartUI(); 
      loadProducts(); 
    } else {
      alert("Error: " + result.message);
    }
  } catch (error) {
    console.error("Checkout Error:", error);
    alert("System Error: " + error.message);
  } finally {
    checkoutBtn.innerHTML = "<i class='fa-solid fa-check-circle'></i> Complete Sale";
    checkoutBtn.disabled = false;
  }
});

// ==========================================
// 13. INVOICE PRINT MODULE (3 Formats)
// ==========================================
let currentInvoiceData = {};

function printInvoice(invoiceId, cartItems, subtotal, tax, total, payMethod, delivery, discount, customerName, customerPhone) {
  const d = new Date();
  const day = ("0" + d.getDate()).slice(-2);
  const month = ("0" + (d.getMonth() + 1)).slice(-2);
  const year = d.getFullYear();
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const formattedDate = `${day}/${month}/${year} ${time}`;

  currentInvoiceData = {
    invoiceId: invoiceId, cartItems: cartItems, subtotal: subtotal, tax: tax, 
    total: total, payMethod: payMethod, delivery: delivery, discount: discount, 
    customerName: customerName, customerPhone: customerPhone, date: formattedDate
  };
  document.getElementById('invoice-modal').style.display = 'flex';
}

function closeInvoiceModal() {
  document.getElementById('invoice-modal').style.display = 'none';
}

function triggerPrint(format) {
  const data = currentInvoiceData;
  const shopName = document.querySelector('.logo h2').innerText || "My POS Shop";
  const addressHTML = document.getElementById('inv-contact-info') ? document.getElementById('inv-contact-info').innerHTML : "";
  const printArea = document.getElementById('invoice-print-area');

  let itemsHtmlPOS = '';
  let itemsHtmlTable = '';
  
  data.cartItems.forEach((item, index) => {
     let itemTotal = item.Price * item.qty;
     let displayQty = item.isLooseTab ? item.qty.toFixed(3) + " " + (item.Unit || "") : item.qty;
     
     itemsHtmlPOS += `
      <div style='display:flex; justify-content:space-between; margin-bottom: 5px; font-size: 13px;'>
        <span>${item.Name} (x${displayQty})</span>
        <span>${POS_CONFIG.CURRENCY} ${itemTotal.toFixed(2)}</span>
      </div>`;
      
     itemsHtmlTable += `
      <tr>
        <td style='border: 1px solid #cbd5e1; padding: 8px;'>${index + 1}</td>
        <td style='border: 1px solid #cbd5e1; padding: 8px;'>${item.Name}</td>
        <td style='border: 1px solid #cbd5e1; padding: 8px; text-align: center;'>${displayQty}</td>
        <td style='border: 1px solid #cbd5e1; padding: 8px; text-align: right;'>${item.Price}</td>
        <td style='border: 1px solid #cbd5e1; padding: 8px; text-align: right;'>${itemTotal.toFixed(2)}</td>
      </tr>`;
  });

  if (format === 'pos') {
    const posHeader = POS_CONFIG.LOGO !== "" 
        ? `<div style='text-align:center;'><img src='${POS_CONFIG.LOGO}' style='max-height: 60px; object-fit: contain; margin-bottom: 5px;'/></div>` 
        : `<h2 style='text-align:center; margin-bottom:5px; font-size: 1.5rem; margin-top:0;'>${shopName}</h2>`;
    
    printArea.innerHTML = `
      <div style='font-family: monospace; color: black;'>
        ${posHeader}
        ${addressHTML}
        <p style='text-align:center; font-size:12px; margin-top:5px;'>Invoice: ${data.invoiceId}<br/>Date: ${data.date}</p>
        ${data.customerName ? `<p style='font-size:12px; border-top:1px dashed #000; padding-top:5px;'>Bill To: ${data.customerName}<br/>Ph: ${data.customerPhone}</p>` : ''}
        <hr style='border-top:1px dashed #000; margin: 10px 0;'/>
        ${itemsHtmlPOS}
        <hr style='border-top:1px dashed #000; margin: 10px 0;'/>
        <div style='display:flex; justify-content:space-between; font-size: 13px;'><span>Subtotal:</span><span>${POS_CONFIG.CURRENCY} ${data.subtotal.toFixed(2)}</span></div>
        <div style='display:flex; justify-content:space-between; font-size: 13px;'><span>Tax:</span><span>${POS_CONFIG.CURRENCY} ${data.tax.toFixed(2)}</span></div>
        ${data.delivery > 0 ? `<div style='display:flex; justify-content:space-between; font-size: 13px;'><span>Delivery:</span><span>${POS_CONFIG.CURRENCY} ${data.delivery.toFixed(2)}</span></div>` : ''}
        ${data.discount > 0 ? `<div style='display:flex; justify-content:space-between; font-size: 13px;'><span>Discount:</span><span>-${POS_CONFIG.CURRENCY} ${data.discount.toFixed(2)}</span></div>` : ''}
        <h3 style='display:flex; justify-content:space-between; margin: 10px 0; font-size: 16px;'><span>Total:</span><span>${POS_CONFIG.CURRENCY} ${data.total.toFixed(2)}</span></h3>
        <p style='text-align:center; font-size:12px; margin-top:15px;'>Paid via: ${data.payMethod}</p>
        <p style='text-align:center; font-size:14px; margin-top:10px; font-weight: bold;'>Thank You!</p>
      </div>`;
  } 
  else {
    const isA4 = (format === 'a4');
    const wrapperBorder = isA4 ? 'none' : '1px solid #cbd5e1';
    const wrapperPadding = isA4 ? '0' : '20px';
    
    const a4Header = POS_CONFIG.LOGO !== "" 
        ? `<img src='${POS_CONFIG.LOGO}' style='max-height: 60px; margin-bottom: 5px;'/>` 
        : `<h1 style='margin: 0; color: #2563eb; font-size: 2rem;'>${shopName}</h1>`;

    printArea.innerHTML = `
      <div style='font-family: Arial, sans-serif; color: black; border: ${wrapperBorder}; padding: ${wrapperPadding}; border-radius: 8px;'>
        <div style='display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 15px;'>
          <div>
            ${a4Header}
            <div style='color: #475569; font-size: 0.9rem; margin-top: 5px;'>${addressHTML.replace(/text-align:center/g, 'text-align:left')}</div>
          </div>
          <div style='text-align: right;'>
            <h2 style='margin: 0; color: #64748b;'>INVOICE</h2>
            <p style='margin: 5px 0 0 0; font-size: 0.9rem;'><strong># ${data.invoiceId}</strong><br/>Date: ${data.date}</p>
          </div>
        </div>
        
        <div style='margin-bottom: 20px; font-size: 0.95rem;'>
          <strong>Billed To:</strong><br/>
          ${data.customerName ? data.customerName : 'Walk-in Customer'}<br/>
          ${data.customerPhone ? data.customerPhone : ''}
        </div>
        
        <table style='width: 100%; border-collapse: collapse; margin-bottom: 20px;'>
          <thead>
            <tr style='background: #f1f5f9; color: #334155;'>
              <th style='border: 1px solid #cbd5e1; padding: 10px; text-align: left;'>SL</th>
              <th style='border: 1px solid #cbd5e1; padding: 10px; text-align: left;'>Item Description</th>
              <th style='border: 1px solid #cbd5e1; padding: 10px; text-align: center;'>Qty</th>
              <th style='border: 1px solid #cbd5e1; padding: 10px; text-align: right;'>Rate</th>
              <th style='border: 1px solid #cbd5e1; padding: 10px; text-align: right;'>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtmlTable}
          </tbody>
        </table>
        
        <div style='display: flex; justify-content: flex-end;'>
          <table style='width: 300px; font-size: 0.95rem;'>
            <tr><td style='padding: 5px; font-weight: bold;'>Subtotal:</td><td style='padding: 5px; text-align: right;'>${POS_CONFIG.CURRENCY} ${data.subtotal.toFixed(2)}</td></tr>
            <tr><td style='padding: 5px; font-weight: bold;'>Tax/VAT:</td><td style='padding: 5px; text-align: right;'>${POS_CONFIG.CURRENCY} ${data.tax.toFixed(2)}</td></tr>
            ${data.delivery > 0 ? `<tr><td style='padding: 5px; font-weight: bold;'>Delivery:</td><td style='padding: 5px; text-align: right;'>${POS_CONFIG.CURRENCY} ${data.delivery.toFixed(2)}</td></tr>` : ''}
            ${data.discount > 0 ? `<tr><td style='padding: 5px; font-weight: bold; color: #ef4444;'>Discount:</td><td style='padding: 5px; text-align: right; color: #ef4444;'>-${POS_CONFIG.CURRENCY} ${data.discount.toFixed(2)}</td></tr>` : ''}
            <tr style='border-top: 2px solid #1e293b;'><td style='padding: 10px 5px; font-weight: bold; font-size: 1.2rem;'>Total:</td><td style='padding: 10px 5px; text-align: right; font-weight: bold; font-size: 1.2rem; color: #2563eb;'>${POS_CONFIG.CURRENCY} ${data.total.toFixed(2)}</td></tr>
          </table>
        </div>
        
        <div style='margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 15px; text-align: center; color: #64748b; font-size: 0.85rem;'>
          <p style='margin: 0;'>Payment Method: ${data.payMethod}</p>
          <p style='margin: 5px 0 0 0; font-weight: bold;'>Thank you for your business!</p>
        </div>
      </div>`;
  }

  document.body.className = `printing-invoice format-${format}`;
  window.print();
  document.body.className = '';
  closeInvoiceModal();
}
  
// ==========================================
// 10. BARCODE GENERATOR and PRODUCT ADD
// ==========================================
function openProductModal() {
  document.getElementById('product-modal').style.display = 'flex';
  generateRandomBarcode(); 
}

function closeModal() {
  document.getElementById('product-modal').style.display = 'none';
}

function generateRandomBarcode() {
  const randomCode = Math.floor(10000000 + Math.random() * 90000000).toString(); 
  document.getElementById('new-p-barcode').value = randomCode;
  updateBarcodePreview();
}

function updateBarcodePreview() {
  const barcode = document.getElementById('new-p-barcode').value || "00000000";
  const pName = document.getElementById('new-p-name').value || "Product Name";
  const pPrice = document.getElementById('new-p-price').value || "0";
  
  const shopName = document.querySelector('.logo h2').innerText || "My Shop";
  
  document.getElementById('bc-shop-name').innerText = shopName;
  document.getElementById('bc-product-name').innerText = pName;
  document.getElementById('bc-price').innerText = `${POS_CONFIG.CURRENCY} ${pPrice}`;
  
  JsBarcode("#barcode-svg", barcode, {
    format: "CODE128",
    width: 1.5,
    height: 40,
    displayValue: true,
    fontSize: 12,
    margin: 0
  });
}

document.getElementById('new-p-name').addEventListener('input', updateBarcodePreview);
document.getElementById('new-p-price').addEventListener('input', updateBarcodePreview);
document.getElementById('new-p-barcode').addEventListener('input', updateBarcodePreview);

function printBarcodeSticker() {
  const printContent = document.getElementById('barcode-print-area').innerHTML;
  const hiddenPrintArea = document.createElement('div');
  hiddenPrintArea.id = 'temp-barcode-print';
  hiddenPrintArea.style.width = '40mm';
  hiddenPrintArea.style.textAlign = 'center';
  hiddenPrintArea.style.padding = '10px';
  hiddenPrintArea.style.background = 'white';
  hiddenPrintArea.innerHTML = printContent;
  
  document.body.appendChild(hiddenPrintArea);
  document.body.classList.add('printing-barcode');
  
  window.print();
  
  document.body.classList.remove('printing-barcode');
  document.body.removeChild(hiddenPrintArea);
}

async function saveNewProduct() {
  const barcode = document.getElementById('new-p-barcode').value;
  const name = document.getElementById('new-p-name').value;
  const category = document.getElementById('new-p-cat').value;
  const brand = document.getElementById('new-p-brand').value; 
  const costPrice = document.getElementById('new-p-cost').value || 0;
  const price = document.getElementById('new-p-price').value;
  const stock = document.getElementById('new-p-stock').value;
  const imageFile = document.getElementById('new-p-image').files[0];

  if(!barcode || !name || !price || !stock) {
    alert("Please fill in Name, Sale Price, Stock, and Barcode!");
    return;
  }

  const saveBtn = document.querySelector('button[onclick="saveNewProduct()"]');
  saveBtn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Uploading and Saving...";
  saveBtn.disabled = true;

  const getBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });

  let imageBase64 = "";
  if (imageFile) {
     try {
       imageBase64 = await getBase64(imageFile);
     } catch(err) {
       console.log("Image read error:", err);
     }
  }

  const requestBody = {
    action: "addProduct",
    sheetId: POS_CONFIG.SHEET_ID,
    barcode: barcode,
    name: name,
    category: category,
    brand: brand,
    costPrice: costPrice,
    price: price,
    stock: stock,
    imageBase64: imageBase64
  };

  try {
    const response = await fetch(POS_CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    
    const result = await response.json();

    if(result.status === "success" || result.status === 'success') {
      alert("Product saved successfully!");
      closeModal(); 
      
      document.getElementById('new-p-name').value = '';
      document.getElementById('new-p-cat').value = '';
      document.getElementById('new-p-brand').value = '';
      document.getElementById('new-p-cost').value = '';
      document.getElementById('new-p-price').value = '';
      document.getElementById('new-p-stock').value = '';
      document.getElementById('new-p-image').value = '';
      
      loadProducts(); 
    } else {
      alert("Error: " + result.message);
    }
  } catch (error) {
    alert("Server connection failed!");
  } finally {
    saveBtn.innerHTML = "<i class='fa-solid fa-save'></i> Save Item";
    saveBtn.disabled = false;
  }
}
  
// ==========================================
// 11. ROLE-BASED LOGIN and SESSION
// ==========================================
function verifyLogin() {
  const enteredPin = document.getElementById('admin-pin').value.trim();
  let loginSuccess = false;

  if (enteredPin === APP_SETTINGS.AdminPIN.toString()) {
    currentUser = { role: 'admin', name: 'Admin' };
    loginSuccess = true;
  } else {
    let salesUsers = APP_SETTINGS.SalesUsers.split(',');
    
    for (let i = 0; i < salesUsers.length; i++) {
       let parts = salesUsers[i].split(':');
       
       if (parts.length === 2 && parts[0].trim() === enteredPin) {
          currentUser = { role: 'salesman', name: parts[1].trim() };
          loginSuccess = true;
          break;
       }
    }
  }

  if (loginSuccess) {
    document.getElementById('login-screen').style.display = 'none';
    localStorage.setItem('pos_login_time', Date.now());
    localStorage.setItem('pos_user_role', currentUser.role);
    localStorage.setItem('pos_user_name', currentUser.name);
    applyRolePermissions();
  } else {
    alert("Incorrect PIN! Please try again.");
    document.getElementById('admin-pin').value = '';
    document.getElementById('admin-pin').focus();
  }
}

function applyRolePermissions() {
  const savedRole = localStorage.getItem('pos_user_role') || 'admin';
  const savedName = localStorage.getItem('pos_user_name') || 'Admin';
  currentUser = { role: savedRole, name: savedName };

  const addProductBtn = document.querySelector('button[onclick="openProductModal()"]');
  const dashBtn = document.getElementById('admin-dash-btn'); 
  const stockInBtn = document.getElementById('stock-in-btn'); 
  const collectDueBtn = document.getElementById('collect-due-btn'); 
  const reportsBtn = document.getElementById('reports-btn'); 
  const logoutText = document.querySelector('.user-info span');

  if (currentUser.role === 'salesman') {
    if(addProductBtn) addProductBtn.style.display = 'none'; 
    if(dashBtn) dashBtn.style.display = 'none'; 
    if(stockInBtn) stockInBtn.style.display = 'none'; 
    if(reportsBtn) reportsBtn.style.display = 'none'; 
    
    if(collectDueBtn) collectDueBtn.style.display = 'inline-block'; 
    
    if(logoutText) logoutText.innerHTML = `<i class='fa-solid fa-user'></i> ${currentUser.name} (Logout)`;
  } else {
    if(addProductBtn) addProductBtn.style.display = 'inline-block'; 
    if(dashBtn) dashBtn.style.display = 'inline-block'; 
    if(stockInBtn) stockInBtn.style.display = 'inline-block'; 
    if(reportsBtn) reportsBtn.style.display = 'inline-block'; 
    if(collectDueBtn) collectDueBtn.style.display = 'inline-block'; 
    
    if(logoutText) logoutText.innerHTML = `<i class='fa-solid fa-user-tie'></i> Admin (Logout)`;
  }
}
  
function logoutPOS() {
  if(confirm("Are you sure you want to logout?")) {
     localStorage.removeItem('pos_login_time');
     localStorage.removeItem('pos_user_role');
     localStorage.removeItem('pos_user_name');
     location.reload(); 
  }
}

// ==========================================
// 12. REWARDS POINT LOGIC (Point System)
// ==========================================
function checkCustomerPoints() {
  const phone = document.getElementById('customer-phone').value.trim();
  const rewardBox = document.getElementById('reward-box');
  const balanceSpan = document.getElementById('reward-balance');
  const nameInput = document.getElementById('customer-name');
  
  appliedRewardPoints = 0;
  currentCustomerBalance = 0;
  document.getElementById('redeem-btn').innerText = "Redeem";
  document.getElementById('redeem-btn').style.background = "#3b82f6";
  updateCartUI();

  if (phone.length >= 10 && APP_SETTINGS.REWARDS_ENABLED) {
    const customer = allCustomers.find(c => c.Phone == phone);
    if (customer) {
      nameInput.value = customer.Name || "";
      currentCustomerBalance = parseFloat(customer['Current Balance']) || 0;
      
      if(currentCustomerBalance > 0) {
        balanceSpan.innerText = currentCustomerBalance;
        rewardBox.style.display = 'flex'; 
      } else {
        rewardBox.style.display = 'none';
      }
    } else {
      rewardBox.style.display = 'none';
    }
  } else {
    rewardBox.style.display = 'none';
  }
}

function applyRewards() {
  if (cart.length === 0) {
    alert("Please add products to cart first!");
    return;
  }
  
  let sub = cart.reduce((sum, item) => sum + (parseFloat(item.Price) * item.qty), 0);
  let tax = sub * (shopTaxRate / 100);
  let del = (APP_SETTINGS.DELIVERY_CHARGE > 0 && sub < APP_SETTINGS.FREE_DELIVERY_OVER) ? APP_SETTINGS.DELIVERY_CHARGE : 0;
  let maxDiscount = sub + tax + del;

  appliedRewardPoints = (currentCustomerBalance >= maxDiscount) ? maxDiscount : currentCustomerBalance;
  
  document.getElementById('redeem-btn').innerText = "Applied";
  document.getElementById('redeem-btn').style.background = "#10b981";
  updateCartUI(); 
}
  
// ==========================================
// 14. MULTIPLE BARCODE PRINT MODULE
// ==========================================
let bcPrintList = [];

function openMultiBarcodeModal() {
  document.getElementById('multi-barcode-modal').style.display = 'flex';
  document.getElementById('bc-search').value = '';
  document.getElementById('bc-search-results').innerHTML = '';
  bcPrintList = [];
  updateBcPrintUI();
}

function closeMultiBarcodeModal() {
  document.getElementById('multi-barcode-modal').style.display = 'none';
}

function searchBcProduct() {
  const q = document.getElementById('bc-search').value.toLowerCase();
  const resDiv = document.getElementById('bc-search-results');
  if (!q) { resDiv.innerHTML = ''; return; }
  
  const matched = allProducts.filter(p => {
    const pName = p.Name ? p.Name.toString().toLowerCase() : "";
    const pCode = p.Barcode ? p.Barcode.toString().toLowerCase() : "";
    return pName.includes(q) || pCode.includes(q);
  }).slice(0, 15);
  
  let html = '';
  matched.forEach(p => {
    let price = p['Sale Price'] || p['Price'] || 0;
    // Fix: Using double quotes around the JS function call
    html += `<div onclick="addBcToList('${p.Barcode}')" style='padding:10px; border-bottom:1px solid #e2e8f0; cursor:pointer; font-size:13px;'>
      <strong>${p.Name}</strong><br/>
      <span style='color:#64748b;'>Barcode: ${p.Barcode} | Price: ${POS_CONFIG.CURRENCY} ${price}</span>
    </div>`;
  });
  resDiv.innerHTML = html;
}

function addBcToList(barcode) {
  const prod = allProducts.find(p => p.Barcode == barcode);
  if(!prod) return;
  const exist = bcPrintList.find(i => i.Barcode == barcode);
  
  if(exist) { 
    exist.qty += 1; 
  } else { 
    let activePrice = prod['Sale Price'] || prod['Price'] || 0;
    bcPrintList.push({ ...prod, printPrice: activePrice, qty: 1 }); 
  }
  updateBcPrintUI();
}

function updateBcPrintUI() {
  const container = document.getElementById('bc-print-list');
  if(bcPrintList.length === 0) {
     container.innerHTML = "<div style='text-align:center; color:#94a3b8; padding:20px;'>No products selected</div>";
     return;
  }

  let html = '';
  bcPrintList.forEach((item, idx) => {
    html += `<div style='display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px dashed #e2e8f0; font-size:13px;'>
      <div style='flex:1; padding-right:10px;'><strong>${item.Name}</strong></div>
      <div style='display:flex; align-items:center; gap:8px;'>
         <button class='qty-btn' onclick='changeBcQty(${idx}, -1)'>-</button>
         <span style='font-weight:bold; width:20px; text-align:center;'>${item.qty}</span>
         <button class='qty-btn' onclick='changeBcQty(${idx}, 1)'>+</button>
         <i class='fa-solid fa-trash' onclick='removeBc(${idx})' style='color:#ef4444; cursor:pointer; margin-left:10px;'></i>
      </div>
    </div>`;
  });
  container.innerHTML = html;
}

function changeBcQty(idx, change) {
  bcPrintList[idx].qty += change;
  if(bcPrintList[idx].qty <= 0) bcPrintList.splice(idx, 1);
  updateBcPrintUI();
}

function removeBc(idx) {
  bcPrintList.splice(idx, 1);
  updateBcPrintUI();
}

function printMultiBarcodes() {
  if(bcPrintList.length === 0) { alert("Please select at least one product to print!"); return; }
  
  const shopName = document.querySelector('.logo h2').innerText || "My POS";
  const printContainer = document.getElementById('multi-print-container');
  printContainer.innerHTML = '';
  
  let svgIndex = 0;
  let html = '';
  
  bcPrintList.forEach(item => {
    for(let i=0; i<item.qty; i++) {
      html += `
      <div class='sticker-box'>
        <div class='sticker-shop'>${shopName}</div>
        <div class='sticker-name'>${item.Name}</div>
        <svg class='sticker-svg' id='bc-svg-${svgIndex}'></svg>
        <div class='sticker-price'>${POS_CONFIG.CURRENCY} ${item.printPrice}</div>
      </div>`;
      svgIndex++;
    }
  });
  
  printContainer.innerHTML = html;
  
  let sIdx = 0;
  bcPrintList.forEach(item => {
    for(let i=0; i<item.qty; i++) {
      JsBarcode("#bc-svg-" + sIdx, item.Barcode, {
        format: "CODE128",
        displayValue: true,
        fontSize: 10,
        margin: 0,
        height: 35,
        width: 1.5
      });
      sIdx++;
    }
  });
  
  document.body.classList.add('printing-multi');
  window.print();
  document.body.classList.remove('printing-multi');
  closeMultiBarcodeModal();
}
  
// ==========================================
// 15. DYNAMIC CATEGORY and PAGINATION MODULE
// ==========================================
let currentPage = 1;
const itemsPerPage = 20; 
let currentCategory = 'All';
let filteredProducts = [];

function renderCategories() {
  const categoryList = document.getElementById('dynamic-category-list');
  if (!categoryList) return;

  const uniqueCategories = [...new Set(allProducts.map(p => p.Category).filter(Boolean))];
  
  let html = "";
  
  let activeAll = (currentCategory === 'All') ? " active" : "";
  html += "<div class='cat-menu-item" + activeAll + "' onclick='selectCategory(\"All\")'><i class='fa-solid fa-list'></i> All Items</div>";
  
  uniqueCategories.forEach(cat => {
    let activeCat = (currentCategory === cat) ? " active" : "";
    html += "<div class='cat-menu-item" + activeCat + "' onclick='selectCategory(\"" + cat + "\")'><i class='fa-solid fa-folder'></i> " + cat + "</div>";
  });
  
  let activeLoose = (currentCategory === 'LooseTab') ? " active" : "";
  html += "<div class='cat-menu-item" + activeLoose + "' id='loose-tab-btn' onclick='showLooseProducts()' style='margin-top: 15px; border-top: 1px dashed #cbd5e1; padding-top: 15px;'><i class='fa-solid fa-scale-unbalanced' style='color:#f59e0b;'></i> Loose Products</div>";  
  categoryList.innerHTML = html;
}

function selectCategory(cat) {
  currentCategory = cat;
  currentPage = 1; 
  renderCategories(); 
  filterAndDisplayProducts();
}

function filterAndDisplayProducts() {
  document.querySelector('.product-area').style.display = 'grid';
  if (currentCategory === 'All') {
    filteredProducts = allProducts;
  } else {
    filteredProducts = allProducts.filter(p => p.Category === currentCategory);
  }
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filteredProducts.slice(startIndex, endIndex);
  
  displayProducts(paginatedItems); 
  
  renderPagination();
}

function renderPagination() {
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginationContainer = document.getElementById('pagination-container');
  
  if (!paginationContainer) return;

  if (totalPages <= 1) {
    paginationContainer.innerHTML = ''; 
    return;
  }

  let html = "<div style='display:flex; justify-content:center; gap:15px; align-items:center;'>";
  
  if (currentPage > 1) {
    html += "<button class='page-btn active' onclick='changePage(-1)'><i class='fa-solid fa-chevron-left'></i> Prev</button>";
  } else {
     html += "<button class='page-btn' disabled='disabled'><i class='fa-solid fa-chevron-left'></i> Prev</button>";
  }
  
  html += "<span style='font-size:14px; font-weight:bold; color:#475569; background:#f1f5f9; padding:5px 15px; border-radius:20px;'>Page " + currentPage + " of " + totalPages + "</span>";
  
   if (currentPage < totalPages) {
    html += "<button class='page-btn active' onclick='changePage(1)'>Next <i class='fa-solid fa-chevron-right'></i></button>";
  } else {
    html += "<button class='page-btn' disabled='disabled'>Next <i class='fa-solid fa-chevron-right'></i></button>";
  }
  
  html += "</div>";
  paginationContainer.innerHTML = html;
}
  
function changePage(step) {
  currentPage += step;
  filterAndDisplayProducts();
}
  
// ==========================================
// 16. ADMIN DASHBOARD and ALERTS
// ==========================================
function openAdminDashboard() {
  if (currentUser.role !== 'admin') {
     alert("Access Denied! Only Admin can view the dashboard.");
     return;
  }
  document.getElementById('admin-dashboard-modal').style.display = 'flex';
  document.getElementById('dash-total-products').innerText = allProducts.length;
  
  let tSales = parseFloat(window.todaysSalesAmount) || 0;
  let tExp = parseFloat(window.todaysExpenseAmount) || 0;
  let net = tSales - tExp;

  document.getElementById('dash-today-sales').innerText = POS_CONFIG.CURRENCY + " " + tSales.toFixed(2);
  document.getElementById('dash-today-expense').innerText = POS_CONFIG.CURRENCY + " " + tExp.toFixed(2);
  document.getElementById('dash-net-balance').innerText = POS_CONFIG.CURRENCY + " " + net.toFixed(2);
  
  generateLowStockAlerts();
}

function closeAdminDashboard() {
  document.getElementById('admin-dashboard-modal').style.display = 'none';
}

function generateLowStockAlerts() {
  const container = document.getElementById('low-stock-list');

  const lowStockItems = allProducts.filter(p => parseInt(p.Stock) <= 5);
  
  if (lowStockItems.length === 0) {
     container.innerHTML = "<p style='color: #10b981; font-weight: bold; padding: 10px; background: #ecfdf5; border-radius: 4px;'><i class='fa-solid fa-check-circle'></i> All products have sufficient stock!</p>";
     return;
  }

  let html = `<table style='width: 100%; border-collapse: collapse; font-size: 0.9rem;'>
                <tr style='background: #f8fafc; text-align: left;'>
                  <th style='padding: 8px; border-bottom: 2px solid #e2e8f0;'>Product Name</th>
                  <th style='padding: 8px; border-bottom: 2px solid #e2e8f0;'>Barcode</th>
                  <th style='padding: 8px; border-bottom: 2px solid #e2e8f0; text-align: center;'>Current Stock</th>
                </tr>`;
                
  lowStockItems.forEach(item => {
     let stockColor = parseInt(item.Stock) === 0 ? "color: #ef4444; font-weight: bold;" : "color: #f59e0b; font-weight: bold;";
     html += `<tr style='border-bottom: 1px solid #e2e8f0;'>
                <td style='padding: 8px;'>${item.Name}</td>
                <td style='padding: 8px; color: #64748b;'>${item.Barcode}</td>
                <td style='padding: 8px; text-align: center; ${stockColor}'>${item.Stock}</td>
              </tr>`;
  });
  html += `</table>`;
  container.innerHTML = html;
}
  
// ==========================================
// 17. EXPENSE MANAGEMENT
// ==========================================
function openExpenseModal() {
  document.getElementById('expense-modal').style.display = 'flex';
}
function closeExpenseModal() {
  document.getElementById('expense-modal').style.display = 'none';
}

async function saveExpense() {
  const category = document.getElementById('exp-category').value.trim();
  const amount = parseFloat(document.getElementById('exp-amount').value);
  const note = document.getElementById('exp-note').value.trim();

   if (!category || !amount || amount <= 0) {
     alert("Please enter valid category and amount!");
     return;
  }

  const btn = document.getElementById('save-exp-btn');
  btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Saving...";
  btn.disabled = true;

  const requestBody = {
     action: "addExpense",
     sheetId: POS_CONFIG.SHEET_ID,
     category: category,
     amount: amount,
     note: note,
     soldBy: currentUser.name
  };

  try {
     const response = await fetch(POS_CONFIG.API_URL, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
     });
     const result = await response.json();

     if (result.status === "success") {
        alert("Expense Added!");
        closeExpenseModal();
        document.getElementById('exp-category').value = '';
        document.getElementById('exp-amount').value = '';
        document.getElementById('exp-note').value = '';
        loadProducts(); 
     } else {
        alert("Error: " + result.message);
     }
  } catch (err) {
     alert("Network Error!");
  } finally {
     btn.innerHTML = "<i class='fa-solid fa-save'></i> Save Expense";
     btn.disabled = false;
  }
}
  
// ==========================================
// 18. QUICK STOCK IN LOGIC
// ==========================================
function openStockInModal() {
  document.getElementById('stock-in-modal').style.display = 'flex';
  document.getElementById('stock-barcode').focus();
}

function closeStockInModal() {
  document.getElementById('stock-in-modal').style.display = 'none';
  document.getElementById('stock-barcode').value = '';
  document.getElementById('stock-add-qty').value = '';
  document.getElementById('stock-product-info').innerText = '';
}

function checkStockProduct() {
  const barcode = document.getElementById('stock-barcode').value.trim();
  const infoDiv = document.getElementById('stock-product-info');
  
  if (!barcode) {
     infoDiv.innerText = "";
     return;
  }

  const product = allProducts.find(p => p.Barcode == barcode);
  if (product) {
     infoDiv.innerHTML = `Product: <span style='color:#1e293b'>${product.Name}</span> <br/>Current Stock: <span style='color:#ef4444'>${product.Stock} Pcs</span>`;
  } else {
     infoDiv.innerHTML = `<span style='color:#ef4444'>Product not found! Add new product first.</span>`;
  }
}

async function saveStockIn() {
  const barcode = document.getElementById('stock-barcode').value.trim();
  const addQty = parseInt(document.getElementById('stock-add-qty').value);

  const product = allProducts.find(p => p.Barcode == barcode);
  if (!product) {
     alert("Invalid Barcode! Product not found.");
     return;
  }

  if (!addQty || addQty < 1) {
     alert("Please enter a valid quantity to add!");
     return;
  }

  const btn = document.getElementById('save-stock-btn');
  btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Updating...";
  btn.disabled = true;

  const requestBody = {
     action: "updateStock",
     sheetId: POS_CONFIG.SHEET_ID,
     barcode: barcode,
     addQty: addQty
  };

  try {
     const response = await fetch(POS_CONFIG.API_URL, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
     });
     const result = await response.json();

     if (result.status === "success") {
        alert("Stock Updated Successfully!");
        closeStockInModal();
        loadProducts(); 
     } else {
        alert("Error: " + result.message);
     }
  } catch (err) {
     alert("Network Error!");
  } finally {
     btn.innerHTML = "<i class='fa-solid fa-save'></i> Update Stock";
     btn.disabled = false;
  }
}
  
// ==========================================
// 19. DUE COLLECTION LOGIC
// ==========================================
function openDueModal() {
  document.getElementById('due-modal').style.display = 'flex';
  document.getElementById('search-due-input').focus();
}

function closeDueModal() {
  document.getElementById('due-modal').style.display = 'none';
  document.getElementById('search-due-input').value = '';
  document.getElementById('due-search-result').innerHTML = '';
  document.getElementById('due-payment-section').style.display = 'none';
}

function searchDueCustomer() {
  const q = document.getElementById('search-due-input').value.toLowerCase().trim();
  const resDiv = document.getElementById('due-search-result');
  const paySec = document.getElementById('due-payment-section');
  
  if (!q) { resDiv.innerHTML = ''; paySec.style.display = 'none'; return; }
  
  const matched = window.allDues.filter(d => d.phone.includes(q) || d.invoice.toLowerCase().includes(q));
  
  if (matched.length === 0) {
     resDiv.innerHTML = `<span style='color:#ef4444; font-size:13px;'>No due found for this number/invoice.</span>`;
     paySec.style.display = 'none';
     return;
  }
  
  let html = '';
  matched.forEach(d => {
     html += `<div onclick='selectDueCustomer(${d.row}, "${d.name}", ${d.due})' style='padding:10px; border:1px solid #cbd5e1; border-radius:6px; margin-bottom:5px; cursor:pointer; background:white;'>
        <strong>${d.name}</strong> (${d.phone})<br/>
        <span style='color:#64748b; font-size:12px;'>Inv: ${d.invoice} | </span>
        <span style='color:#ef4444; font-weight:bold;'>Due: ${POS_CONFIG.CURRENCY} ${d.due}</span>
     </div>`;
  });
  resDiv.innerHTML = html;
  paySec.style.display = 'none';
}

function selectDueCustomer(row, name, dueAmount) {
  document.getElementById('due-search-result').innerHTML = '';
  document.getElementById('search-due-input').value = '';
  
  document.getElementById('due-payment-section').style.display = 'block';
  document.getElementById('due-customer-name').innerText = name;
  document.getElementById('due-current-amount').innerText = `Total Due: ${POS_CONFIG.CURRENCY} ${dueAmount}`;
  document.getElementById('due-row-index').value = row;
}

async function submitDuePayment() {
  const row = document.getElementById('due-row-index').value;
  const payAmount = parseFloat(document.getElementById('due-pay-amount').value);
  
  if (!payAmount || payAmount <= 0) {
     alert("Please enter a valid amount!");
     return;
  }

  const btn = document.getElementById('save-due-btn');
  btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Processing...";
  btn.disabled = true;

  const requestBody = {
     action: "collectDue",
     sheetId: POS_CONFIG.SHEET_ID,
     row: row,
     payAmount: payAmount
  };

  try {
     const response = await fetch(POS_CONFIG.API_URL, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
     });
     const result = await response.json();

     if (result.status === "success") {
        alert("Due Collected Successfully!");
        closeDueModal();
        loadProducts(); 
     } else {
        alert("Error: " + result.message);
     }
  } catch (err) {
     alert("Network Error!");
  } finally {
     btn.innerHTML = "<i class='fa-solid fa-check-circle'></i> Confirm Payment";
     btn.disabled = false;
  }
}
  
// ==========================================
// 20. MONTHLY and YEARLY REPORTS
// ==========================================
function openReportModal() {
  if (currentUser.role !== 'admin') {
     alert("Access Denied! Only Admin can view the reports.");
     return;
  }
  document.getElementById('report-modal').style.display = 'flex';

  let mSales = parseFloat(window.thisMonthSales);
  let mExp = parseFloat(window.thisMonthExpense);
  let ySales = parseFloat(window.thisYearSales);
  let yExp = parseFloat(window.thisYearExpense);

  document.getElementById('rep-month-sales').innerText = POS_CONFIG.CURRENCY + " " + mSales.toFixed(2);
  document.getElementById('rep-month-exp').innerText = POS_CONFIG.CURRENCY + " " + mExp.toFixed(2);
  document.getElementById('rep-month-profit').innerText = POS_CONFIG.CURRENCY + " " + (mSales - mExp).toFixed(2);

  document.getElementById('rep-year-sales').innerText = POS_CONFIG.CURRENCY + " " + ySales.toFixed(2);
  document.getElementById('rep-year-exp').innerText = POS_CONFIG.CURRENCY + " " + yExp.toFixed(2);
  document.getElementById('rep-year-profit').innerText = POS_CONFIG.CURRENCY + " " + (ySales - yExp).toFixed(2);
}

function closeReportModal() {
  document.getElementById('report-modal').style.display = 'none';
}
  
// ==========================================
// 21. LOOSE PRODUCTS MANAGEMENT
// ==========================================
function showLooseProducts() {
  currentCategory = 'LooseTab';
  
  document.querySelectorAll('.cat-menu-item').forEach(el => el.classList.remove('active'));
  const looseTabBtn = document.getElementById('loose-tab-btn');
  if(looseTabBtn) looseTabBtn.classList.add('active');

  const productArea = document.querySelector('.product-area');
  productArea.style.display = 'block'; 
  const pagCont = document.getElementById('pagination-container');
  if(pagCont) pagCont.innerHTML = '';

  let tableHTML = `<table style='width:100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);'>
      <tr style='background: #f1f5f9; text-align: left; color:#475569;'>
          <th style='padding:12px; border-bottom:2px solid #e2e8f0;'>Product Name</th>
          <th style='padding:12px; border-bottom:2px solid #e2e8f0;'>Price</th>
          <th style='padding:12px; border-bottom:2px solid #e2e8f0;'>Quantity</th>
          <th style='padding:12px; border-bottom:2px solid #e2e8f0; text-align:right;'>Action</th>
      </tr>`;

  window.looseProducts.forEach(lp => {
      let price = lp['Sale Price'] || lp['Cost Price'] || 0;
      let unitStr = (lp.Unit || "").toString().toLowerCase().trim();

      let inputHTML = "";
      if (unitStr === 'kg' || unitStr === 'কেজি') {
          inputHTML = `
          <div style='display:flex; gap:5px; align-items:center;'>
              <input class='form-input' id='lqty-${lp.Barcode}' placeholder='Amount' style='margin:0; padding:6px; width:80px;' type='number'/>
              <select class='form-input' id='ltype-${lp.Barcode}' style='margin:0; padding:6px; width:75px; cursor:pointer;'>
                  <option value='kg'>Kg</option>
                  <option selected='selected' value='gm'>Gram</option>
              </select>
          </div>`;
      } else if (unitStr === 'liter' || unitStr === 'লিটার' || unitStr === 'ltr') {
          inputHTML = `
          <div style='display:flex; gap:5px; align-items:center;'>
              <input class='form-input' id='lqty-${lp.Barcode}' placeholder='Amount' style='margin:0; padding:6px; width:80px;' type='number'/>
              <select class='form-input' id='ltype-${lp.Barcode}' style='margin:0; padding:6px; width:75px; cursor:pointer;'>
                  <option value='ltr'>Liter</option>
                  <option value='ml'>ML</option>
              </select>
          </div>`;
      } else {
          inputHTML = `
          <div style='display:flex; gap:5px; align-items:center;'>
              <input class='form-input' id='lqty-${lp.Barcode}' placeholder='Amount' style='margin:0; padding:6px; width:100px;' type='number'/>
              <span style='font-size:13px; color:#64748b; font-weight:bold;'>${lp.Unit}</span>
              <input id='ltype-${lp.Barcode}' type='hidden' value='unit'/>
          </div>`;
      }

      // Fix: Using double quotes around the JS function call
      tableHTML += `<tr style='border-bottom: 1px solid #e2e8f0;'>
          <td style='padding:12px; font-weight:bold; color:#1e293b;'>${lp.Name}</td>
          <td style='padding:12px; color:#2563eb; font-weight:bold;'>${POS_CONFIG.CURRENCY} ${price} <span style='font-size:11px; color:#64748b;'>/${lp.Unit}</span></td>
          <td style='padding:12px;'>${inputHTML}</td>
          <td style='padding:12px; text-align:right;'>
              <button class='checkout-btn' onclick="addLooseItem('${lp.Barcode}')" style='padding:6px 12px; width:auto; font-size:13px; background:#10b981;'><i class='fa-solid fa-cart-plus'></i> Add</button>
          </td>
      </tr>`;
  });
  tableHTML += `</table>`;
  productArea.innerHTML = tableHTML;
}

function addLooseItem(barcode) {
  const product = window.looseProducts.find(p => p.Barcode == barcode);
  if (!product) return;

  const qtyInput = document.getElementById(`lqty-${barcode}`).value;
  const typeInput = document.getElementById(`ltype-${barcode}`).value;
  let finalQty = parseFloat(qtyInput);

  if (!finalQty || finalQty <= 0) {
     alert("Please enter a valid amount!");
     return;
  }

  let displayUnit = product.Unit;
  if (typeInput === 'gm' || typeInput === 'ml') {
      finalQty = finalQty / 1000; 
  }

  const existingItem = cart.find(item => item.Barcode == barcode);
  if (existingItem) {
      if (existingItem.qty + finalQty <= parseFloat(product.Stock)) {
          existingItem.qty += finalQty;
      } else {
          alert(ALERTS[SYS_LANG].stockLimit);
          return;
      }
  } else {
      let price = product['Sale Price'] || product['Cost Price'] || 0;
      cart.push({
          ...product,
          Name: product.Name,
          Price: price,
          qty: finalQty,
          isLooseTab: true,
          Unit: displayUnit
      });
  }

  document.getElementById(`lqty-${barcode}`).value = ''; 
  updateCartUI();
}
  
// ==========================================
// WHATSAPP DIGITAL INVOICE
// ==========================================
function sendWhatsAppInvoice() {
  const phone = currentInvoiceData.customerPhone;
  
  if(!phone || phone.length < 10) { 
     alert("Please enter a valid Customer Phone Number to send WhatsApp invoice!"); 
     return; 
  }
  
  const shopName = document.querySelector('.logo h2').innerText || "Our Shop";
  let text = `*${shopName}*\n`;
  text += `--------------------------------\n`;
  text += `🧾 *Invoice:* #${currentInvoiceData.invoiceId}\n`;
  text += `📅 *Date:* ${currentInvoiceData.date}\n`;
  text += `--------------------------------\n`;
  
  currentInvoiceData.cartItems.forEach(item => {
      let displayQty = item.isLooseTab ? item.qty.toFixed(3) + " " + (item.Unit || "") : item.qty;
      text += `▪ ${item.Name} (x${displayQty}) - ${POS_CONFIG.CURRENCY} ${(item.Price * item.qty).toFixed(2)}\n`;
  });
  
  text += `--------------------------------\n`;
  text += `Subtotal: ${POS_CONFIG.CURRENCY} ${currentInvoiceData.subtotal.toFixed(2)}\n`;
  if(currentInvoiceData.tax > 0) text += `Tax/VAT: ${POS_CONFIG.CURRENCY} ${currentInvoiceData.tax.toFixed(2)}\n`;
  if(currentInvoiceData.delivery > 0) text += `Delivery: ${POS_CONFIG.CURRENCY} ${currentInvoiceData.delivery.toFixed(2)}\n`;
  if(currentInvoiceData.discount > 0) text += `Discount: -${POS_CONFIG.CURRENCY} ${currentInvoiceData.discount.toFixed(2)}\n`;
  text += `*Total Amount: ${POS_CONFIG.CURRENCY} ${currentInvoiceData.total.toFixed(2)}*\n\n`;
  text += `Paid via: ${currentInvoiceData.payMethod}\n\n`;
  text += `*Thank you for shopping with us!* 🛍️`;
  
  let waNumber = phone.startsWith("0") ? "88" + phone : phone;
  const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;
  
  window.open(waUrl, '_blank');
}

// ==========================================
// 22. RETURN ITEM LOGIC
// ==========================================
function openReturnModal() {
  document.getElementById('return-modal').style.display = 'flex';
  document.getElementById('ret-barcode').focus();
}
function closeReturnModal() {
  document.getElementById('return-modal').style.display = 'none';
  document.getElementById('ret-barcode').value = '';
  document.getElementById('ret-qty').value = '';
  document.getElementById('ret-refund').value = '';
  document.getElementById('ret-product-info').innerText = '';
}
function checkReturnProduct() {
  const barcode = document.getElementById('ret-barcode').value.trim();
  const infoDiv = document.getElementById('ret-product-info');
  if(!barcode) { infoDiv.innerText = ""; return; }
  const product = allProducts.find(p => p.Barcode == barcode);
  if(product) {
      infoDiv.innerHTML = `<span style='color:#2563eb'>${product.Name}</span> | Price: ${POS_CONFIG.CURRENCY} ${product['Sale Price'] || product['Price']}`;
  } else {
      infoDiv.innerHTML = `<span style='color:#ef4444'>Product not found!</span>`;
  }
}
async function submitReturn() {
  const barcode = document.getElementById('ret-barcode').value.trim();
  const returnQty = parseFloat(document.getElementById('ret-qty').value);
  const refundAmount = parseFloat(document.getElementById('ret-refund').value);
  if(!barcode || !returnQty || returnQty <= 0) { alert("Valid barcode and quantity required!"); return; }
  
  const btn = document.getElementById('save-return-btn');
  btn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Processing...";
  btn.disabled = true;

  const requestBody = {
      action: "returnItem",
      sheetId: POS_CONFIG.SHEET_ID,
      barcode: barcode,
      returnQty: returnQty,
      refundAmount: refundAmount || 0,
      soldBy: currentUser.name
  };

  try {
      const response = await fetch(POS_CONFIG.API_URL, {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      });
      const result = await response.json();
      if(result.status === "success") {
          alert("Product Returned Successfully!");
          closeReturnModal();
          loadProducts(); // স্টক আপডেট করার জন্য রিলোড
      } else { alert("Error: " + result.message); }
  } catch (err) { alert("Network Error!"); } 
  finally {
      btn.innerHTML = "<i class='fa-solid fa-check-circle'></i> Confirm Return";
      btn.disabled = false;
  }
}

// ==========================================
// 23. DAY END REPORT LOGIC (CASH BASIS)
// ==========================================
function openDayEndModal() {
  document.getElementById('day-end-modal').style.display = 'flex';
  
  let tSales = parseFloat(window.todaysSalesAmount) || 0;
  let tExp = parseFloat(window.todaysExpenseAmount) || 0;
  let tDueGiven = parseFloat(window.todaysDueGiven) || 0;
  let tDueCol = parseFloat(window.todaysDueCollection) || 0;
  
  // আসল ক্যাশবক্সের হিসাব
  let netCash = (tSales - tDueGiven) + tDueCol - tExp;
  
  document.getElementById('de-sales').innerText = POS_CONFIG.CURRENCY + " " + tSales.toFixed(2);
  document.getElementById('de-due-given').innerText = "- " + POS_CONFIG.CURRENCY + " " + tDueGiven.toFixed(2);
  document.getElementById('de-due-col').innerText = "+ " + POS_CONFIG.CURRENCY + " " + tDueCol.toFixed(2);
  document.getElementById('de-exp').innerText = "- " + POS_CONFIG.CURRENCY + " " + tExp.toFixed(2);
  document.getElementById('de-net').innerText = POS_CONFIG.CURRENCY + " " + netCash.toFixed(2);
}

// এই ফাংশনটি আমি আগেরবার মিস করে গিয়েছিলাম! 
function closeDayEndModal() {
  document.getElementById('day-end-modal').style.display = 'none';
}

function printDayEnd() {
  let tSales = parseFloat(window.todaysSalesAmount) || 0;
  let tExp = parseFloat(window.todaysExpenseAmount) || 0;
  let tDueGiven = parseFloat(window.todaysDueGiven) || 0;
  let tDueCol = parseFloat(window.todaysDueCollection) || 0;
  let netCash = (tSales - tDueGiven) + tDueCol - tExp;
  
  const shopName = document.querySelector('.logo h2').innerText || "My POS Shop";
  
  let printContent = `
    <div style='font-family: monospace; text-align:center; width: 100%; color: black;'>
      <h2 style='margin-bottom:5px; font-size:1.5rem;'>${shopName}</h2>
      <h3 style='margin-top:0;'>Day End Cash Report</h3>
      <p style='font-size:12px;'>Date: ${new Date().toLocaleString()}</p>
      <hr style='border-top:1px dashed #000; margin: 10px 0;'/>
      <div style='display:flex; justify-content:space-between; font-size: 13px;'><span>Total Sales:</span><span>${POS_CONFIG.CURRENCY} ${tSales.toFixed(2)}</span></div>
      <div style='display:flex; justify-content:space-between; font-size: 13px;'><span>(-) Unpaid Dues:</span><span>${POS_CONFIG.CURRENCY} ${tDueGiven.toFixed(2)}</span></div>
      <div style='display:flex; justify-content:space-between; font-size: 13px;'><span>(+) Due Collected:</span><span>${POS_CONFIG.CURRENCY} ${tDueCol.toFixed(2)}</span></div>
      <div style='display:flex; justify-content:space-between; font-size: 13px;'><span>(-) Expense/Refund:</span><span>${POS_CONFIG.CURRENCY} ${tExp.toFixed(2)}</span></div>
      <hr style='border-top:1px dashed #000; margin: 10px 0;'/>
      <div style='display:flex; justify-content:space-between; font-size: 16px; font-weight:bold;'><span>Net Cash:</span><span>${POS_CONFIG.CURRENCY} ${netCash.toFixed(2)}</span></div>
      <p style='margin-top:20px; font-size:12px;'>Generated by: ${currentUser.name}</p>
    </div>
  `;
  
  const printArea = document.getElementById('invoice-print-area');
  printArea.innerHTML = printContent;
  document.body.className = 'printing-invoice format-pos';
  window.print();
  document.body.className = '';
  closeDayEndModal();
}
