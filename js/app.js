const firebaseConfig = {
  apiKey: "AIzaSyBm2FkZz5G29TjkzeHB2ehqytM6zbnrWeE",
  authDomain: "e-commerce-95a77.firebaseapp.com",
  projectId: "e-commerce-95a77",
  storageBucket: "e-commerce-95a77.firebasestorage.app",
  messagingSenderId: "878404767320",
  appId: "1:878404767320:web:e4bf8fe4f440f7ecbb442d",
  measurementId: "G-EWLX3G4FZ1"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const { jsPDF } = window.jspdf;

let currentUser = null;
let currentOrder = null;

function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
  document.getElementById(sectionId).classList.add('active');
  if (sectionId === 'cart' && currentUser) loadCart();
  if (sectionId === 'history' && currentUser) loadHistory();
  if (sectionId === 'home') loadProducts();
}

document.getElementById('registerForm').addEventListener('submit', e => {
  e.preventDefault();
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const userData = {
    name: document.getElementById('regName').value,
    age: parseInt(document.getElementById('regAge').value),
    gender: document.getElementById('regGender').value,
    phone: document.getElementById('regPhone').value,
    dateOfBirth: document.getElementById('regDob').value,
    email: email,
    cart: [],
    orderHistory: [],
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastLogin: null,
    preferences: {}
  };

  auth.createUserWithEmailAndPassword(email, password)
    .then(cred => {
      currentUser = cred.user;
      document.getElementById('regMessage').innerText = "Registration successful!";
      return db.collection('users').doc(currentUser.uid).set(userData);
    })
    .then(() => {
      showSection('home');
    })
    .catch(err => document.getElementById('regMessage').innerText = `Error: ${err.message}`);
});

document.getElementById('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  auth.signInWithEmailAndPassword(email, password)
    .then(cred => {
      currentUser = cred.user;
      document.getElementById('loginMessage').innerText = "Login successful!";
      db.collection('users').doc(currentUser.uid).update({
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      });
      showSection('home');
    })
    .catch(err => document.getElementById('loginMessage').innerText = `Error: ${err.message}`);
});

function loadProducts() {
  const productsListDiv = document.getElementById('productsList');
  productsListDiv.innerHTML = "Loading products...";
  const categories = ['electronics', 'fashion', 'furniture', 'cosmetics', 'foodAndHealth'];
  const categoryProducts = {};

  Promise.all(categories.map(category => 
    db.collection('products')
      .where('isActive', '==', true)
      .where('category', '==', category)
      .get()
      .then(snapshot => {
        categoryProducts[category] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      })
  )).then(() => {
    productsListDiv.innerHTML = '';
    categories.forEach(cat => {
      const catDiv = document.createElement('div');
      catDiv.innerHTML = `<h1>${cat.charAt(0).toUpperCase() + cat.slice(1)}</h1>`;
      const prodList = document.createElement('div');
      prodList.classList.add('product-list');
      
      if (categoryProducts[cat].length === 0) {
        catDiv.innerHTML += '<p>No products available in this category.</p>';
      } else {
        categoryProducts[cat].forEach(prod => {
          const prodDiv = document.createElement('div');
          prodDiv.classList.add('product');
          const imageUrl = prod.imageURLs?.[0] || 'assets/images/nothing.png';
          let specsHTML = getProductSpecsHTML(prod);
          
          prodDiv.innerHTML = `
            <img src="${imageUrl}" alt="${prod.name}" onerror="this.src='assets/images/nothing.png'">
            <br><strong>${prod.name}</strong> (ID: ${prod.id})
            <br><small>${prod.description}</small>
            ${specsHTML}
            <br>Availability: ${prod.availability}
            <br>Price: $<span id="price-${prod.id}">${prod.discountPrice || prod.price || 'N/A'}</span>
            <br><button onclick="addToCart('${prod.id}', '${prod.name}')">Add to Cart</button>
          `;
          prodList.appendChild(prodDiv);
        });
      }
      catDiv.appendChild(prodList);
      productsListDiv.appendChild(catDiv);
    });
  }).catch(err => {
    productsListDiv.innerHTML = `Error loading products: ${err.message}`;
  });
}

function getProductSpecsHTML(prod) {
  let specsHTML = '';
  if (prod.category === 'electronics') {
    specsHTML = `<br>Display: ${prod.specifications.display || 'N/A'}<br>Processor: ${prod.specifications.processor || 'N/A'}<br>Battery: ${prod.specifications.battery || 'N/A'}`;
  } else if (prod.category === 'fashion') {
    specsHTML = `<br>Size: ${prod.specifications.size || 'N/A'}<br>Color: ${prod.specifications.color || 'N/A'}<br>Material: ${prod.specifications.material || 'N/A'}`;
  } else if (prod.category === 'furniture') {
    specsHTML = `<br>Dimensions: ${prod.specifications.dimensions || 'N/A'}<br>Material: ${prod.specifications.material || 'N/A'}<br>Weight: ${prod.specifications.weight || 0} kg`;
  } else if (prod.category === 'cosmetics') {
    specsHTML = `<br>Type: ${prod.specifications.type || 'N/A'}<br>Ingredients: ${prod.specifications.ingredients?.join(', ') || 'N/A'}<br>Expiration: ${prod.specifications.expirationDate || 'N/A'}`;
  } else if (prod.category === 'foodAndHealth') {
    specsHTML = `<br>Type: ${prod.specifications.type || 'N/A'}<br>Nutrition: ${prod.specifications.nutritionalInfo || 'N/A'}<br>Shelf Life: ${prod.specifications.shelfLife || 'N/A'}`;
  }
  return specsHTML;
}

function addToCart(productId, name) {
  if (!currentUser) {
    alert("Please login to add items to your cart!");
    showSection('login');
    return;
  }
  db.collection('products').doc(productId).get()
    .then(doc => {
      if (!doc.exists) throw new Error("Product not found!");
      const prod = doc.data();
      const price = prod.discountPrice || prod.price || 0;
      const imageUrl = prod.imageURLs?.[0] || 'assets/images/nothing.png';
      const cartRef = db.collection('users').doc(currentUser.uid).collection('cart');
      cartRef.where('productId', '==', productId).get()
        .then(snapshot => {
          if (snapshot.empty) {
            cartRef.add({
              productId: productId,
              name: name,
              price: price,
              quantity: 1,
              imageUrl: imageUrl,
              addedAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
              alert(`${name} added to cart.`);
              loadCart();
            });
          } else {
            const doc = snapshot.docs[0];
            cartRef.doc(doc.id).update({
              quantity: doc.data().quantity + 1
            }).then(() => {
              alert(`${name} quantity updated in cart.`);
              loadCart();
            });
          }
        });
    })
    .catch(err => console.error("Cart error:", err));
}

function loadCart() {
  if (!currentUser) {
    alert("Please login first!");
    showSection('login');
    return;
  }
  const cartListDiv = document.getElementById('cartList');
  cartListDiv.innerHTML = "Loading cart...";
  db.collection('users').doc(currentUser.uid).collection('cart').get()
    .then(snapshot => {
      cartListDiv.innerHTML = "";
      if (snapshot.empty) {
        cartListDiv.innerHTML = "Your cart is empty.";
        return;
      }
      snapshot.forEach(doc => {
        const item = doc.data();
        const totalPrice = item.price * item.quantity;
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('cart-item');
        itemDiv.innerHTML = `
          <img src="${item.imageUrl || 'assets/images/nothing.png'}" alt="${item.name}" width="100" onerror="this.src='assets/images/nothing.png'">
          <br><strong>${item.name} x${item.quantity}</strong> (ID: ${item.productId})
          <br>Total Price: $${totalPrice}
          <br><button onclick="updateCartQuantity('${doc.id}', ${item.quantity + 1})">+</button>
          <button onclick="updateCartQuantity('${doc.id}', ${item.quantity - 1})">-</button>
        `;
        cartListDiv.appendChild(itemDiv);
      });
    })
    .catch(err => {
      cartListDiv.innerHTML = "Error loading cart.";
    });
}

function updateCartQuantity(docId, newQuantity) {
  const cartRef = db.collection('users').doc(currentUser.uid).collection('cart').doc(docId);
  if (newQuantity <= 0) {
    cartRef.delete().then(() => loadCart());
  } else {
    cartRef.update({ quantity: newQuantity }).then(() => loadCart());
  }
}

function placeOrder() {
  if (!currentUser) {
    alert("Please login first!");
    showSection('login');
    return;
  }
  const userCartRef = db.collection('users').doc(currentUser.uid).collection('cart');
  userCartRef.get().then(snapshot => {
    if (snapshot.empty) {
      alert("Your cart is empty!");
      return;
    }
    let cartItems = [];
    snapshot.forEach(doc => cartItems.push({ id: doc.id, ...doc.data() }));
    const variants = cartItems.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
      name: item.name,
      imageUrl: item.imageUrl
    }));
    const totalAmount = variants.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    db.collection('orders').add({
      userId: currentUser.uid,
      items: variants,
      totalAmount: totalAmount,
      status: 'pending',
      paymentStatus: 'pending',
      orderDate: firebase.firestore.FieldValue.serverTimestamp()
    }).then(orderRef => {
      currentOrder = { id: orderRef.id, totalAmount, cartItems: snapshot };
      document.getElementById('paymentAmount').innerText = totalAmount;
      document.getElementById('paymentModal').style.display = 'flex';
    });
  });
}

function processPayment() {
  if (!currentOrder || !currentUser) return;
  const paymentMethod = document.getElementById('paymentMethod').value;
  const transactionId = `TXN${Date.now()}`;
  setTimeout(() => {
    db.collection('payments').add({
      userId: currentUser.uid,
      orderId: currentOrder.id,
      amount: currentOrder.totalAmount,
      paymentMethod: paymentMethod,
      transactionId: transactionId,
      status: 'completed',
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      db.collection('orders').doc(currentOrder.id).update({
        status: 'confirmed',
        paymentStatus: 'paid'
      });
      currentOrder.cartItems.forEach(doc => doc.ref.delete());
      db.collection('users').doc(currentUser.uid).update({
        orderHistory: firebase.firestore.FieldValue.arrayUnion(currentOrder.id)
      });
      alert("Payment successful! Order confirmed.");
      downloadBill(currentOrder, transactionId, paymentMethod);
      closePaymentModal();
      loadCart();
      currentOrder = null;
    });
  }, 1000);
}

function downloadBill(order, transactionId, paymentMethod) {
  const doc = new jsPDF();
  const date = new Date().toLocaleString();
  const items = order.cartItems.docs.map(doc => doc.data());

  doc.setFontSize(18);
  doc.text("SWIFTCART Invoice", 20, 20);
  doc.setFontSize(12);
  doc.text(`Order ID: ${order.id}`, 20, 30);
  doc.text(`Date: ${date}`, 20, 40);
  doc.text(`Transaction ID: ${transactionId}`, 20, 50);
  doc.text(`Payment Method: ${paymentMethod}`, 20, 60);
  doc.setLineWidth(0.5);
  doc.line(20, 70, 190, 70);
  doc.text("Item", 20, 80);
  doc.text("Qty", 100, 80);
  doc.text("Price", 130, 80);
  doc.text("Total", 170, 80);
  doc.line(20, 85, 190, 85);

  let y = 95;
  items.forEach(item => {
    const total = item.price * item.quantity;
    doc.text(item.name, 20, y);
    doc.text(item.quantity.toString(), 100, y);
    doc.text(`$${item.price}`, 130, y);
    doc.text(`$${total}`, 170, y);
    y += 10;
  });

  doc.line(20, y, 190, y);
  doc.text(`Total Amount: $${order.totalAmount}`, 130, y + 10);
  doc.text("Thank you for shopping with SWIFTCART!", 20, y + 20);
  doc.save(`SwiftCart_Bill_${order.id}.pdf`);
}

function closePaymentModal() {
  document.getElementById('paymentModal').style.display = 'none';
}

function loadHistory() {
  if (!currentUser) {
    alert("Please login first!");
    showSection('login');
    return;
  }
  const historyListDiv = document.getElementById('historyList');
  historyListDiv.innerHTML = "Loading history...";
  db.collection('orders').where("userId", "==", currentUser.uid).get()
    .then(snapshot => {
      historyListDiv.innerHTML = "";
      if (snapshot.empty) historyListDiv.innerHTML = "No orders yet.";
      snapshot.forEach(doc => {
        const order = doc.data();
        const orderDiv = document.createElement('div');
        orderDiv.classList.add('order-item');
        const orderDate = order.orderDate.toDate().toLocaleString();
        orderDiv.innerHTML = `<strong>Order on ${orderDate}:</strong><br>Total: $${order.totalAmount}<br>Status: ${order.paymentStatus}<br>`;
        order.items.forEach(item => {
          db.collection('products').doc(item.productId).get().then(prodDoc => {
            const prod = prodDoc.data();
            orderDiv.innerHTML += `
              <img src="${item.imageUrl || 'assets/images/nothing.png'}" alt="${item.name}" width="100" onerror="this.src='assets/images/nothing.png'">
              <br>${item.name} x${item.quantity} (ID: ${item.productId}) - $${item.price * item.quantity}
              <br><small>Category: ${prod.category}, ${getProductSpecsHTML(prod)}</small><br>
            `;
          });
        });
        historyListDiv.appendChild(orderDiv);
      });
    });
}

function logout() {
  auth.signOut().then(() => {
    currentUser = null;
    alert("Logged out successfully.");
    showSection('home');
    window.location.href = 'index.html';
  });
}

auth.onAuthStateChanged(user => {
  currentUser = user;
  loadProducts();
});

window.onload = () => loadProducts();