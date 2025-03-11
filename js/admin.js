import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getFirestore, collection, getDocs, getDoc, doc, setDoc, deleteDoc, query, where } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBm2FkZz5G29TjkzeHB2ehqytM6zbnrWeE",
  authDomain: "e-commerce-95a77.firebaseapp.com",
  projectId: "e-commerce-95a77",
  storageBucket: "e-commerce-95a77.appspot.com",
  messagingSenderId: "878404767320",
  appId: "1:878404767320:web:e4bf8fe4f440f7ecbb442d",
  measurementId: "G-EWLX3G4FZ1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
const PAGE_SIZE = 5; // Pagination size

// Main Application Logic
document.getElementById('adminLoginForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  const email = document.getElementById('adminEmail').value;
  const password = document.getElementById('adminPassword').value;
  const loginMessage = document.getElementById('loginMessage');

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    currentUser = cred.user;
    console.log("Logged in user:", currentUser.email, "UID:", currentUser.uid);
    loginMessage.innerText = "Login successful!";
    document.getElementById('loginSection').classList.remove('active');
    document.getElementById('adminPanel').classList.add('active');
    await loadAdminProducts();
  } catch (err) {
    loginMessage.innerText = `Login failed: ${err.message}`;
    console.error("Login error:", err);
  }
});

window.showCategory = function(category) {
  document.querySelectorAll('.category-section').forEach(sec => sec.style.display = 'none');
  const section = document.getElementById(category);
  if (section) {
    section.style.display = 'block';
    if (category === 'transactionHistory') loadTransactionHistory(1);
    if (category === 'topProducts') loadTopProducts(1);
    if (category === 'topCustomers') loadTopCustomers(1);
  }
};

// Product Form Submissions
const categories = ['electronics', 'fashion', 'furniture', 'cosmetics', 'foodAndHealth'];
categories.forEach(category => {
  document.getElementById(`${category}Form`)?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const productId = document.getElementById(`${category}ProductId`).value.trim();
    if (!productId) {
      document.getElementById(`${category}Message`).innerText = "Product ID is required!";
      return;
    }

    const baseData = {
      category,
      name: document.getElementById(`${category}Name`).value || "",
      description: document.getElementById(`${category}Description`).value || "",
      brand: document.getElementById(`${category}Brand`).value || "",
      imageURLs: document.getElementById(`${category}ImageURLs`).value.split(',').map(url => url.trim()).filter(Boolean),
      price: parseInt(document.getElementById(`${category}Price`).value) || 0,
      availability: parseInt(document.getElementById(`${category}Availability`).value) || 0,
      createdAt: new Date()
    };

    let productData = { ...baseData };
    
    if (category === 'electronics') {
      productData.specifications = {
        display: document.getElementById('electronicsDisplay').value || "",
        processor: document.getElementById('electronicsProcessor').value || "",
        battery: document.getElementById('electronicsBattery').value || ""
      };
      productData.isActive = document.getElementById('electronicsIsActive').checked;
    } else {
      productData.specifications = {};
      productData.discountPrice = parseInt(document.getElementById(`${category}DiscountPrice`).value) || undefined;
      productData.warehouseId = document.getElementById(`${category}WarehouseId`).value || "";
      productData.stock = parseInt(document.getElementById(`${category}Stock`).value) || 0;
      productData.soldBy = document.getElementById(`${category}SoldBy`).value || "";
      productData.isActive = document.getElementById(`${category}IsActive`).value === 'true';

      if (category === 'fashion') {
        productData.specifications = {
          size: document.getElementById('fashionSize').value || "",
          color: document.getElementById('fashionColor').value || "",
          material: document.getElementById('fashionMaterial').value || ""
        };
      } else if (category === 'furniture') {
        productData.specifications = {
          dimensions: document.getElementById('furnitureDimensions').value || "",
          material: document.getElementById('furnitureMaterial').value || "",
          weight: parseInt(document.getElementById('furnitureWeight').value) || 0
        };
      } else if (category === 'cosmetics') {
        productData.specifications = {
          type: document.getElementById('cosmeticsType').value || "",
          ingredients: document.getElementById('cosmeticsIngredients').value.split(',').map(i => i.trim()).filter(Boolean),
          expirationDate: document.getElementById('cosmeticsExpirationDate').value || ""
        };
      } else if (category === 'foodAndHealth') {
        productData.specifications = {
          type: document.getElementById('foodAndHealthType').value || "",
          nutritionalInfo: document.getElementById('foodAndHealthNutritionalInfo').value || "",
          shelfLife: document.getElementById('foodAndHealthShelfLife').value || ""
        };
      }
    }

    try {
      await setDoc(doc(db, 'products', productId), productData, { merge: true });
      document.getElementById(`${category}Message`).innerText = `${category} ${productId} added/updated successfully!`;
      document.getElementById(`${category}Form`).reset();
      await loadAdminProducts();
    } catch (err) {
      document.getElementById(`${category}Message`).innerText = `Error: ${err.message}`;
      console.error(`Error saving ${category} product:`, err);
    }
  });
});

document.getElementById('fetchProductForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  const productId = document.getElementById('fetchProductId').value.trim();
  if (!productId) {
    alert("Product ID is required!");
    return;
  }

  try {
    const productRef = doc(db, 'products', productId);
    const docSnap = await getDoc(productRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const category = data.category;
      showCategory(category);

      document.getElementById(`${category}ProductId`).value = productId;
      document.getElementById(`${category}Name`).value = data.name || '';
      document.getElementById(`${category}Description`).value = data.description || '';
      document.getElementById(`${category}Brand`).value = data.brand || '';
      document.getElementById(`${category}ImageURLs`).value = data.imageURLs?.join(',') || '';
      document.getElementById(`${category}Availability`).value = data.availability || 0;
      document.getElementById(`${category}Price`).value = data.price || '';

      if (category !== 'electronics') {
        document.getElementById(`${category}DiscountPrice`).value = data.discountPrice || '';
        document.getElementById(`${category}WarehouseId`).value = data.warehouseId || '';
        document.getElementById(`${category}Stock`).value = data.stock || '';
        document.getElementById(`${category}SoldBy`).value = data.soldBy || '';
        document.getElementById(`${category}IsActive`).value = data.isActive ? 'true' : 'false';
      } else {
        document.getElementById(`${category}IsActive`).checked = data.isActive || false;
      }

      if (category === 'electronics') {
        document.getElementById('electronicsDisplay').value = data.specifications?.display || '';
        document.getElementById('electronicsProcessor').value = data.specifications?.processor || '';
        document.getElementById('electronicsBattery').value = data.specifications?.battery || '';
      } else if (category === 'fashion') {
        document.getElementById('fashionSize').value = data.specifications?.size || '';
        document.getElementById('fashionColor').value = data.specifications?.color || '';
        document.getElementById('fashionMaterial').value = data.specifications?.material || '';
      } else if (category === 'furniture') {
        document.getElementById('furnitureDimensions').value = data.specifications?.dimensions || '';
        document.getElementById('furnitureMaterial').value = data.specifications?.material || '';
        document.getElementById('furnitureWeight').value = data.specifications?.weight || 0;
      } else if (category === 'cosmetics') {
        document.getElementById('cosmeticsType').value = data.specifications?.type || '';
        document.getElementById('cosmeticsIngredients').value = data.specifications?.ingredients?.join(',') || '';
        document.getElementById('cosmeticsExpirationDate').value = data.specifications?.expirationDate || '';
      } else if (category === 'foodAndHealth') {
        document.getElementById('foodAndHealthType').value = data.specifications?.type || '';
        document.getElementById('foodAndHealthNutritionalInfo').value = data.specifications?.nutritionalInfo || '';
        document.getElementById('foodAndHealthShelfLife').value = data.specifications?.shelfLife || '';
      }
    } else {
      alert(`Product ${productId} not found!`);
    }
  } catch (err) {
    alert(`Error fetching product: ${err.message}`);
    console.error("Fetch product error:", err);
  }
});

document.getElementById('deleteProductForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  const productId = document.getElementById('deleteProductId').value.trim();
  if (!productId) {
    alert("Product ID is required!");
    return;
  }

  try {
    await deleteDoc(doc(db, 'products', productId));
    alert(`Product ${productId} deleted successfully!`);
    await loadAdminProducts();
  } catch (err) {
    alert(`Error deleting product: ${err.message}`);
    console.error("Delete product error:", err);
  }
});

async function loadAdminProducts() {
  const productsListDiv = document.getElementById('adminProductsList');
  if (!productsListDiv) return;
  productsListDiv.innerHTML = "Loading products...";

  try {
    const categoryProducts = {};
    await Promise.all(categories.map(category => 
      getDocs(query(collection(db, 'products'), where('category', '==', category)))
        .then(snapshot => {
          categoryProducts[category] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        })
    ));

    productsListDiv.innerHTML = "";
    categories.forEach(category => {
      const catDiv = document.createElement('div');
      catDiv.innerHTML = `<h2>${category.charAt(0).toUpperCase() + category.slice(1)}</h2>`;
      if (!categoryProducts[category]?.length) {
        catDiv.innerHTML += `<p>No products in this category.</p>`;
      } else {
        const prodList = document.createElement('div');
        prodList.classList.add('product-list');
        categoryProducts[category].forEach(prod => {
          const imageUrl = prod.imageURLs?.[0] || 'assets/images/nothing.png';
          const prodDiv = document.createElement('div');
          prodDiv.classList.add('product');
          let specsHTML = '';
          if (category === 'electronics') {
            specsHTML = `<br>Display: ${prod.specifications?.display || 'N/A'}<br>Processor: ${prod.specifications?.processor || 'N/A'}<br>Battery: ${prod.specifications?.battery || 'N/A'}`;
          } else if (category === 'fashion') {
            specsHTML = `<br>Size: ${prod.specifications?.size || 'N/A'}<br>Color: ${prod.specifications?.color || 'N/A'}<br>Material: ${prod.specifications?.material || 'N/A'}`;
          } else if (category === 'furniture') {
            specsHTML = `<br>Dimensions: ${prod.specifications?.dimensions || 'N/A'}<br>Material: ${prod.specifications?.material || 'N/A'}<br>Weight: ${prod.specifications?.weight || 0} kg`;
          } else if (category === 'cosmetics') {
            specsHTML = `<br>Type: ${prod.specifications?.type || 'N/A'}<br>Ingredients: ${prod.specifications?.ingredients?.join(', ') || 'N/A'}<br>Expiration: ${prod.specifications?.expirationDate || 'N/A'}`;
          } else if (category === 'foodAndHealth') {
            specsHTML = `<br>Type: ${prod.specifications?.type || 'N/A'}<br>Nutrition: ${prod.specifications?.nutritionalInfo || 'N/A'}<br>Shelf Life: ${prod.specifications?.shelfLife || 'N/A'}`;
          }
          prodDiv.innerHTML = `
            <img src="${imageUrl}" alt="${prod.name || 'Product'}" onerror="this.src='assets/images/nothing.png'">
            <br><strong>${prod.name || 'Unnamed'}</strong> (ID: ${prod.id})
            <br><small>${prod.description || 'No description'}</small>
            ${specsHTML}
            <br>Availability: ${prod.availability || 0}
            <br>Price: $${prod.discountPrice || prod.price || 'N/A'}
            <br>Active: ${prod.isActive ? 'Yes' : 'No'}
          `;
          prodList.appendChild(prodDiv);
        });
        catDiv.appendChild(prodList);
      }
      productsListDiv.appendChild(catDiv);
    });
  } catch (err) {
    productsListDiv.innerHTML = `Error loading products: ${err.message}`;
    console.error("Load products error:", err);
  }
}

// Payment Form Logic
document.getElementById('paymentForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  const orderId = document.getElementById('orderId').value.trim();
  const amount = parseFloat(document.getElementById('paymentAmount').value);
  const paymentMethod = document.getElementById('paymentMethod').value;
  const paymentMessage = document.getElementById('paymentMessage');

  if (!orderId || !amount || !paymentMethod) {
    paymentMessage.innerText = "All fields are required!";
    return;
  }

  try {
    console.log(`Processing payment for Order ${orderId}: $${amount} via ${paymentMethod}`);
    paymentMessage.innerText = `Payment of $${amount} for Order ${orderId} processed successfully via ${paymentMethod}!`;
    document.getElementById('paymentForm').reset();
    document.getElementById('paymentMethod').value = '';
    document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('active'));
  } catch (err) {
    paymentMessage.innerText = `Error processing payment: ${err.message}`;
    console.error("Payment error:", err);
  }
});

// Payment Method Selection
document.querySelectorAll('.payment-option').forEach(option => {
  option.addEventListener('click', function() {
    document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('active'));
    this.classList.add('active');
    document.getElementById('paymentMethod').value = this.dataset.method;
  });
});

// Transaction History with Pagination
async function loadTransactionHistory(page) {
  const reportDiv = document.getElementById('transactionHistoryReport');
  if (!reportDiv) return;
  reportDiv.innerHTML = "Loading transaction history...";

  try {
    const snapshot = await getDocs(collection(db, 'orders'));
    if (snapshot.empty) {
      reportDiv.innerHTML = "<p>No orders found in the database.</p>";
      console.log("No orders found in Firestore.");
      return;
    }

    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const totalPages = Math.ceil(orders.length / PAGE_SIZE);
    page = Math.max(1, Math.min(page, totalPages));

    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const paginatedOrders = orders.slice(start, end);

    let html = '<div class="report-section"><table><tr><th>Order ID</th><th>User ID</th><th>Products</th><th>Total Amount</th><th>Date</th></tr>';
    paginatedOrders.forEach(order => {
      const productsList = (order.products || []).map(p => `${p.name || 'Unknown'} (x${p.quantity || 0})`).join(', ');
      const userId = order.userId || 'N/A';
      const amount = order.totalAmount || 0;
      const date = order.timestamp ? new Date(order.timestamp).toLocaleString() : 'N/A';
      html += `
        <tr>
          <td>${order.id}</td>
          <td>${userId}</td>
          <td>${productsList}</td>
          <td>$${amount}</td>
          <td>${date}</td>
        </tr>
      `;
    });
    html += '</table></div>';
    reportDiv.innerHTML = html;

    const prevBtn = document.getElementById('transactionPrev');
    const nextBtn = document.getElementById('transactionNext');
    const pageInfo = document.getElementById('transactionPageInfo');
    pageInfo.textContent = `Page ${page} of ${totalPages}`;
    prevBtn.disabled = page === 1;
    nextBtn.disabled = page === totalPages;
    prevBtn.onclick = () => loadTransactionHistory(page - 1);
    nextBtn.onclick = () => loadTransactionHistory(page + 1);
  } catch (err) {
    reportDiv.innerHTML = `Error loading transaction history: ${err.message}`;
    console.error("Transaction history error:", err);
  }
}

// Top Products with Pagination (Updated to Ensure Data Loads)
async function loadTopProducts(page) {
  const reportDiv = document.getElementById('topProductsReport');
  if (!reportDiv) return;
  reportDiv.innerHTML = "Loading top products...";

  try {
    // Fetch orders from Firestore
    const snapshot = await getDocs(collection(db, 'orders'));
    console.log("Orders snapshot size:", snapshot.size);
    console.log("Raw orders data:", snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    if (snapshot.empty) {
      reportDiv.innerHTML = "<p>No orders found in the database. Please add orders to see top products.</p>";
      console.log("No orders found in Firestore.");
      return;
    }

    // Aggregate product sales
    const productSales = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log("Processing order:", data);
      if (!data.products || !Array.isArray(data.products)) {
        console.warn(`Order ${doc.id} has no valid products array:`, data.products);
        return;
      }
      data.products.forEach(product => {
        const productId = product.productId || 'Unknown';
        const quantity = Number(product.quantity) || 0;
        const price = Number(product.price) || 0;
        if (productSales[productId]) {
          productSales[productId].quantity += quantity;
          productSales[productId].revenue += price * quantity;
        } else {
          productSales[productId] = {
            name: product.name || 'Unknown',
            quantity: quantity,
            revenue: price * quantity
          };
        }
      });
    });

    console.log("Aggregated product sales:", productSales);

    if (Object.keys(productSales).length === 0) {
      reportDiv.innerHTML = "<p>No product sales data found in orders. Ensure orders contain product details.</p>";
      console.log("No product sales aggregated.");
      return;
    }

    // Sort products by units sold
    const sortedProducts = Object.entries(productSales)
      .sort((a, b) => b[1].quantity - a[1].quantity);

    console.log("Sorted products:", sortedProducts);

    // Pagination
    const totalPages = Math.ceil(sortedProducts.length / PAGE_SIZE);
    page = Math.max(1, Math.min(page, totalPages));
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const paginatedProducts = sortedProducts.slice(start, end);

    console.log("Paginated products (page", page, "):", paginatedProducts);

    // Render table
    let html = '<div class="report-section"><table><tr><th>Product ID</th><th>Name</th><th>Units Sold</th><th>Revenue</th></tr>';
    paginatedProducts.forEach(([productId, data]) => {
      html += `
        <tr>
          <td>${productId}</td>
          <td>${data.name}</td>
          <td>${data.quantity}</td>
          <td>$${data.revenue.toFixed(2)}</td>
        </tr>
      `;
    });
    html += '</table></div>';
    reportDiv.innerHTML = html;

    // Update pagination controls
    const prevBtn = document.getElementById('productsPrev');
    const nextBtn = document.getElementById('productsNext');
    const pageInfo = document.getElementById('productsPageInfo');
    pageInfo.textContent = `Page ${page} of ${totalPages}`;
    prevBtn.disabled = page === 1;
    nextBtn.disabled = page === totalPages;
    prevBtn.onclick = () => loadTopProducts(page - 1);
    nextBtn.onclick = () => loadTopProducts(page + 1);
  } catch (err) {
    reportDiv.innerHTML = `Error loading top products: ${err.message}`;
    console.error("Top products error:", err);
  }
}

// Top Customers with Pagination
async function loadTopCustomers(page) {
  const reportDiv = document.getElementById('topCustomersReport');
  if (!reportDiv) return;
  reportDiv.innerHTML = "Loading top customers...";

  try {
    const snapshot = await getDocs(collection(db, 'orders'));
    if (snapshot.empty) {
      reportDiv.innerHTML = "<p>No orders found in the database.</p>";
      console.log("No orders found in Firestore.");
      return;
    }

    const customerSpending = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      const userId = data.userId || 'Unknown';
      if (customerSpending[userId]) {
        customerSpending[userId].totalSpent += data.totalAmount || 0;
        customerSpending[userId].orderCount += 1;
      } else {
        customerSpending[userId] = {
          email: data.userId === currentUser?.uid ? currentUser.email : userId,
          totalSpent: data.totalAmount || 0,
          orderCount: 1
        };
      }
    });

    const sortedCustomers = Object.entries(customerSpending).sort((a, b) => b[1].totalSpent - a[1].totalSpent);
    const totalPages = Math.ceil(sortedCustomers.length / PAGE_SIZE);
    page = Math.max(1, Math.min(page, totalPages));

    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const paginatedCustomers = sortedCustomers.slice(start, end);

    let html = '<div class="report-section"><table><tr><th>Customer ID</th><th>Email/ID</th><th>Total Spent</th><th>Orders</th></tr>';
    paginatedCustomers.forEach(([customerId, data]) => {
      html += `
        <tr>
          <td>${customerId}</td>
          <td>${data.email}</td>
          <td>$${data.totalSpent.toFixed(2)}</td>
          <td>${data.orderCount}</td>
        </tr>
      `;
    });
    html += '</table></div>';
    reportDiv.innerHTML = html;

    const prevBtn = document.getElementById('customersPrev');
    const nextBtn = document.getElementById('customersNext');
    const pageInfo = document.getElementById('customersPageInfo');
    pageInfo.textContent = `Page ${page} of ${totalPages}`;
    prevBtn.disabled = page === 1;
    nextBtn.disabled = page === totalPages;
    prevBtn.onclick = () => loadTopCustomers(page - 1);
    nextBtn.onclick = () => loadTopCustomers(page + 1);
  } catch (err) {
    reportDiv.innerHTML = `Error loading top customers: ${err.message}`;
    console.error("Top customers error:", err);
  }
}

window.logout = function() {
  signOut(auth).then(() => {
    currentUser = null;
    alert("Logged out successfully.");
    document.getElementById('adminPanel').classList.remove('active');
    document.getElementById('loginSection').classList.add('active');
    window.location.href = 'index.html';
  }).catch(err => {
    alert(`Logout failed: ${err.message}`);
    console.error("Logout error:", err);
  });
};

onAuthStateChanged(auth, user => {
  currentUser = user;
  if (user) {
    console.log("Auth state changed - User logged in:", user.email, "UID:", user.uid);
    loadAdminProducts().catch(err => console.error("Initial load error:", err));
  } else {
    console.log("Auth state changed - No user logged in");
    if (document.getElementById('adminPanel')?.classList.contains('active')) {
      document.getElementById('adminPanel').classList.remove('active');
      document.getElementById('loginSection').classList.add('active');
    }
  }
});

document.querySelectorAll('.category-section').forEach(sec => sec.style.display = 'none');