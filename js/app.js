// ========================================
// FLAMBEAU — Script unifié (sans modules ES6)
// Compatible ouverture directe file://
// ========================================

// ---- PRODUITS ----
const PRODUCTS = [
  { id: 'B001', name: "Fleur d'Oranger", category: 'bougies', categoryLabel: 'Bougies', price: 35,
    description: "Une bougie majestueuse qui capture l'essence florale de la fleur d'oranger, illuminant votre intérieur de sa fraîcheur délicate et sophistiquée.",
    notes: ["Fleur d'oranger", 'Jasmin', 'Bois de santal'], weight: '300g',
    stock: 20,
    image: 'imgs/aery-good-vibes-premium-scented-candle-packaging.jpg', inStock: true },

  { id: 'B002', name: 'Vanille Bourbon', category: 'bougies', categoryLabel: 'Bougies', price: 32,
    description: "Une odeur chaleureuse et enveloppante de vanille Bourbon, associée à des notes gourmandes de fève tonka et de caramel fondant.",
    notes: ['Vanille', 'Fève tonka', 'Caramel'], weight: '300g',
    stock: 10,
    image: 'imgs/premium-scented-candle-branding-mockup.jpg', inStock: true },

  { id: 'B003', name: 'Rose Damascena', category: 'bougies', categoryLabel: 'Bougies', price: 38,
    description: "Une rose complexe et mystique, évoquant les jardins Damascènes avec des pétales de rose, du patchouli terreux et du musc blanc velouté.",
    notes: ['Rose', 'Patchouli', 'Musc blanc'], weight: '300g',
    stock: 15,
    image: 'imgs/luxury-scented-candle-lifestyle-photography.jpg', inStock: true },

  { id: 'B004', name: 'Nuit Ambrée', category: 'bougies', categoryLabel: 'Bougies', price: 40,
    description: "Un accord chaud et sensuel d'ambre, de bois précieux et de musc blanc. La bougie idéale pour les soirées d'hiver.",
    notes: ['Ambre', 'Bois de cèdre', 'Musc'], weight: '300g',
    stock: 5,
    image: 'imgs/luxury_scented_candle_warm_lighting_lifestyle.jpg', inStock: true },

  { id: 'F001', name: 'Café Gourmet', category: 'fondants', categoryLabel: 'Fondants', price: 18,
    description: "Un coffret de 12 fondants qui libéreront chez vous l'arôme d'un café artisanal aux notes de crème onctueuse et de chocolat.",
    notes: ['Café', 'Crème', 'Chocolat'], weight: 'Pack 12',
    stock: 20,
    image: 'imgs/premium-scented-candle-luxury-packaging-branding.jpg', inStock: true },

  { id: 'F002', name: 'Lavande Provençale', category: 'fondants', categoryLabel: 'Fondants', price: 16,
    description: "Les champs de lavande en fleurs capturés dans ces fondants apaisants, accompagnés de camomille délicate et de miel doré.",
    notes: ['Lavande', 'Camomille', 'Miel'], weight: 'Pack 12',
    stock: 25,
    image: 'imgs/luxury-scented-candles-and-diffusers-lifestyle.jpg', inStock: true },

  { id: 'K001', name: 'Oud Royal', category: 'bakhour', categoryLabel: 'Bakhour', price: 45,
    description: "Un bakhour d'exception aux notes profondes d'oud, relevées par la chaleur de l'ambre et la sensualité du musc.",
    notes: ['Oud', 'Ambre', 'Musc'], weight: '50g',
    stock: 10,
    image: 'imgs/elegant-gold-geometric-bakhour-burner-home-decor.jpg', inStock: true },

  { id: 'K002', name: 'Mysore Santal', category: 'bakhour', categoryLabel: 'Bakhour', price: 42,
    description: "Un bois de santal précieux du Mysore, associé au bois de rose et à des touches vanillées pour une atmosphère raffinée.",
    notes: ['Santal', 'Bois de rose', 'Vanille'], weight: '50g',
    stock: 15,
    image: 'imgs/elegant-golden-butterfly-bakhour-burner-set.jpg', inStock: true },

  { id: 'A001', name: 'Boîtier Bakhour Élégant', category: 'accessoires', categoryLabel: 'Accessoires', price: 28,
    description: "Un boîtier à bakhour raffiné en métal doré, alliant fonctionnalité et élégance pour sublimer votre rituel olfactif.",
    notes: ['Métal doré'], weight: 'Unique',
    stock: 10,
    image: 'imgs/elegant-gold-bakhour-incense-burner-home-decor.jpg', inStock: true },

  { id: 'A002', name: 'Coupes en Marbre', category: 'accessoires', categoryLabel: 'Accessoires', price: 35,
    description: "Des coupes à chandelles taillées dans la pierre naturelle, pièces uniques qui apportent une touche minérale et luxueuse.",
    notes: ['Pierre naturelle'], weight: 'Unique',
    stock: 15,
    image: 'imgs/white-onyx-marble-candle-holders-luxury-decor.jpg', inStock: true }
];

function getProductById(id) { return PRODUCTS.find(p => p.id === id); }
function getProductsByCategory(cat) { return cat === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.category === cat); }
function getFeaturedProducts() { return PRODUCTS.slice(0, 4); }
function getRelatedProducts(id, limit) {
  var p = getProductById(id);
  if (!p) return [];
  return PRODUCTS.filter(x => x.id !== id && x.category === p.category).slice(0, limit || 4);
}

// ---- PANIER (localStorage) ----
var CART_KEY = 'flambeau_cart';
function getCart() {
  try { var d = localStorage.getItem(CART_KEY); return d ? JSON.parse(d) : { items: [] }; }
  catch(e) { return { items: [] }; }
}
function saveCart(cart) {
  cart.updatedAt = Date.now();
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch(e) {}
}
function addToCart(productId, qty) {
  var cart = getCart();
  var item = cart.items.find(function(i){ return i.productId === productId; });
  if (item) { item.quantity += (qty || 1); }
  else { cart.items.push({ productId: productId, quantity: qty || 1 }); }
  saveCart(cart);
  return cart;
}
function removeFromCart(productId) {
  var cart = getCart();
  cart.items = cart.items.filter(function(i){ return i.productId !== productId; });
  saveCart(cart); return cart;
}
function updateQuantity(productId, quantity) {
  var cart = getCart();
  var item = cart.items.find(function(i){ return i.productId === productId; });
  if (item) {
    if (quantity <= 0) { cart.items = cart.items.filter(function(i){ return i.productId !== productId; }); }
    else { item.quantity = quantity; }
  }
  saveCart(cart); return cart;
}
function clearCart() {
  var empty = { items: [], updatedAt: Date.now() };
  saveCart(empty); return empty;
}
function getCartTotal(cart) {
  return cart.items.reduce(function(total, item) {
    var p = getProductById(item.productId);
    return total + (p ? p.price * item.quantity : 0);
  }, 0);
}
function getCartItemCount(cart) {
  return cart.items.reduce(function(n, i){ return n + i.quantity; }, 0);
}
function formatPrice(price) {
  return price.toFixed(2).replace('.', ',') + ' €';
}

// ---- TOAST ----
function showToast(message) {
  var existing = document.querySelector('.toast');
  if (existing) existing.remove();
  var toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = '<svg class="toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>'
    + '<span class="toast__message">' + message + '</span>'
    + '<button class="toast__close" aria-label="Fermer"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>';
  document.body.appendChild(toast);
  requestAnimationFrame(function(){ toast.classList.add('toast--visible'); });
  toast.querySelector('.toast__close').addEventListener('click', function(){ toast.remove(); });
  setTimeout(function(){ if(toast.parentNode) toast.remove(); }, 4000);
}

// ---- CART DRAWER ----
var cartDrawerEl = null;

function openCart() {
  if (!cartDrawerEl) return;
  cartDrawerEl.classList.add('cart-drawer--open');
  var overlay = document.querySelector('.cart-overlay');
  if (overlay) overlay.classList.add('cart-overlay--visible');
  document.body.style.overflow = 'hidden';
  renderCartDrawer();
}
function closeCart() {
  if (!cartDrawerEl) return;
  cartDrawerEl.classList.remove('cart-drawer--open');
  var overlay = document.querySelector('.cart-overlay');
  if (overlay) overlay.classList.remove('cart-overlay--visible');
  document.body.style.overflow = '';
}

function renderCartDrawer() {
  var cart = getCart();
  var itemsEl = document.querySelector('.cart-drawer__items');
  var emptyEl = document.querySelector('.cart-drawer__empty');
  var footerEl = document.querySelector('.cart-drawer__footer');
  var countEl = document.querySelector('.nav__cart-count');

  // update count badge
  var count = getCartItemCount(cart);
  if (countEl) {
    countEl.textContent = count;
    countEl.classList.toggle('nav__cart-count--visible', count > 0);
  }

  if (!itemsEl) return;

  if (cart.items.length === 0) {
    itemsEl.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'flex';
    if (footerEl) footerEl.style.display = 'none';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';
  if (footerEl) footerEl.style.display = 'block';

  itemsEl.innerHTML = cart.items.map(function(item) {
    var p = getProductById(item.productId);
    if (!p) return '';
    return '<div class="cart-item" data-id="' + item.productId + '">'
      + '<div class="cart-item__image"><img src="' + p.image + '" alt="' + p.name + '" loading="lazy"></div>'
      + '<div class="cart-item__details">'
      + '<div class="cart-item__name">' + p.name + '</div>'
      + '<div class="cart-item__price">' + formatPrice(p.price) + '</div>'
      + '<div class="cart-item__controls">'
      + '<div class="cart-item__quantity">'
      + '<button class="cart-item__qty-btn" data-action="decrease">−</button>'
      + '<span class="cart-item__qty-value">' + item.quantity + '</span>'
      + '<button class="cart-item__qty-btn" data-action="increase">+</button>'
      + '</div>'
      + '<button class="cart-item__remove" data-action="remove">Supprimer</button>'
      + '</div></div></div>';
  }).join('');

  // events
  itemsEl.querySelectorAll('.cart-item').forEach(function(el) {
    var pid = el.dataset.id;
    el.querySelector('[data-action="decrease"]').addEventListener('click', function(){
      var c = getCart(); var it = c.items.find(function(i){return i.productId===pid;});
      if(it){ updateQuantity(pid, it.quantity - 1); renderCartDrawer(); }
    });
    el.querySelector('[data-action="increase"]').addEventListener('click', function(){
      var c = getCart(); var it = c.items.find(function(i){return i.productId===pid;});
      if(it){ updateQuantity(pid, it.quantity + 1); renderCartDrawer(); }
    });
    el.querySelector('[data-action="remove"]').addEventListener('click', function(){
      var p = getProductById(pid);
      removeFromCart(pid);
      renderCartDrawer();
      showToast((p ? p.name : 'Produit') + ' retiré du panier');
    });
  });

  var subtotalEl = document.querySelector('.cart-drawer__subtotal-value');
  if (subtotalEl) subtotalEl.textContent = formatPrice(getCartTotal(cart));
}

// ---- SCROLL REVEAL ----
function initReveal() {
  var els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  var obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) { e.target.classList.add('reveal--visible'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.1 });
  els.forEach(function(el){ obs.observe(el); });
}

// ---- NAVIGATION ----
function initNav() {
  var nav = document.querySelector('.nav');
  var toggle = document.querySelector('.nav__menu-toggle');
  var menu = document.querySelector('.nav__menu');

  if (nav && nav.classList.contains('nav--transparent')) {
    window.addEventListener('scroll', function() {
      nav.classList.toggle('nav--transparent', window.scrollY <= 50);
      nav.classList.toggle('nav--solid', window.scrollY > 50);
    });
  }

  if (toggle && menu) {
    toggle.addEventListener('click', function() {
      var open = menu.classList.toggle('nav__menu--open');
      toggle.setAttribute('aria-expanded', open);
    });
  }

  var cartBtn = document.querySelector('.nav__cart-btn');
  if (cartBtn) cartBtn.addEventListener('click', openCart);

  var overlay = document.querySelector('.cart-overlay');
  if (overlay) overlay.addEventListener('click', closeCart);

  var closeBtn = document.querySelector('.cart-drawer__close');
  if (closeBtn) closeBtn.addEventListener('click', closeCart);

  cartDrawerEl = document.querySelector('.cart-drawer');
  renderCartDrawer();
}

// ---- HOME PAGE ----
function initHome() {
  // Featured products
  var grid = document.querySelector('.featured-products .products-grid');
  if (grid) {
    var featured = getFeaturedProducts();
    grid.innerHTML = featured.map(function(p, i) {
      return '<article class="product-card reveal reveal-delay-' + (i+1) + '">'
        + '<a href="product.html?id=' + p.id + '">'
        + '<div class="product-card__image-container">'
        + '<img src="' + p.image + '" alt="' + p.name + '" class="product-card__image" loading="lazy">'
        + '<div class="product-card__quick-add"><button class="product-card__quick-add-btn" data-id="' + p.id + '">Ajouter au panier</button></div>'
        + '</div>'
        + '<div class="product-card__info">'
        + '<div class="product-card__category">' + p.categoryLabel + '</div>'
        + '<h3 class="product-card__name">' + p.name + '</h3>'
        + '<div class="product-card__price">' + formatPrice(p.price) + '</div>'
        + '</div></a></article>';
    }).join('');

    grid.querySelectorAll('.product-card__quick-add-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        var id = btn.dataset.id;
        addToCart(id, 1);
        renderCartDrawer();
        showToast((getProductById(id).name) + ' ajouté au panier ✓');
        openCart();
      });
    });
    initReveal();
  }

  // Testimonials
  var track = document.querySelector('.testimonials__track');
  var dots = document.querySelector('.testimonials__nav');
  if (track && dots) {
    var testimonials = [
      { quote: "Les bougies Flambeau ont transformé mon salon en un véritable spa. La qualité est exceptionnelle.", author: 'Sophie L., Paris' },
      { quote: "Un savoir-faire remarquable. Chaque produit raconte une histoire et embaume divinement.", author: 'Marc D., Lyon' },
      { quote: "Le bakhour Oud Royal est tout simplement fascinant. Je ne peux plus m'en passer.", author: 'Fatima A., Marseille' }
    ];
    track.innerHTML = testimonials.map(function(t) {
      return '<div class="testimonial"><blockquote class="testimonial__quote">"' + t.quote + '"</blockquote>'
        + '<cite class="testimonial__author">— <span>' + t.author + '</span></cite></div>';
    }).join('');
    dots.innerHTML = testimonials.map(function(_, i) {
      return '<button class="testimonials__dot' + (i===0?' testimonials__dot--active':'') + '" data-i="' + i + '"></button>';
    }).join('');

    var cur = 0;
    function go(i) {
      cur = i;
      track.style.transform = 'translateX(-' + (i * 100) + '%)';
      dots.querySelectorAll('.testimonials__dot').forEach(function(d, j) {
        d.classList.toggle('testimonials__dot--active', j === i);
      });
    }
    dots.querySelectorAll('.testimonials__dot').forEach(function(d) {
      d.addEventListener('click', function(){ go(parseInt(d.dataset.i)); clearInterval(timer); });
    });
    var timer = setInterval(function(){ go((cur + 1) % testimonials.length); }, 5000);
  }

  // Newsletter
  var form = document.querySelector('.newsletter__form');
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      showToast('Inscription confirmée ! Bienvenue chez Flambeau ✦');
      form.reset();
    });
  }
}

// ---- SHOP PAGE ----
function renderShopProducts(category) {
  var container = document.querySelector('.shop-products .products-grid');
  if (!container) return;
  var list = getProductsByCategory(category);
  container.innerHTML = list.map(function(p, i) {
    return '<article class="product-card reveal reveal-delay-' + ((i%4)+1) + '">'
      + '<a href="product.html?id=' + p.id + '">'
      + '<div class="product-card__image-container">'
      + '<img src="' + p.image + '" alt="' + p.name + '" class="product-card__image" loading="lazy">'
      + (!p.inStock ? '<span class="product-card__badge product-card__badge--soldout">Rupture</span>' : '')
      + '<div class="product-card__quick-add"><button class="product-card__quick-add-btn" data-id="' + p.id + '">Ajouter au panier</button></div>'
      + '</div>'
      + '<div class="product-card__info">'
      + '<div class="product-card__category">' + p.categoryLabel + '</div>'
      + '<h3 class="product-card__name">' + p.name + '</h3>'
      + '<div class="product-card__price">' + formatPrice(p.price) + '</div>'
      + '</div></a></article>';
  }).join('');

  container.querySelectorAll('.product-card__quick-add-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      var id = btn.dataset.id;
      addToCart(id, 1);
      renderCartDrawer();
      showToast((getProductById(id).name) + ' ajouté au panier ✓');
      openCart();
    });
  });
  initReveal();
}

function initShop() {
  renderShopProducts('all');
  var btns = document.querySelectorAll('.filter-btn');
  btns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      btns.forEach(function(b){ b.classList.remove('filter-btn--active'); });
      btn.classList.add('filter-btn--active');
      renderShopProducts(btn.dataset.category);
    });
  });
}

// ---- PRODUCT PAGE ----
function initProduct() {
  var params = new URLSearchParams(window.location.search);
  var id = params.get('id');
  if (!id) { window.location.href = 'shop.html'; return; }
  var product = getProductById(id);
  if (!product) { window.location.href = 'shop.html'; return; }

  document.title = product.name + ' | Flambeau';

  var img = document.querySelector('.product-detail__main-image img');
  if (img) { img.src = product.image; img.alt = product.name; }

  var catEl = document.querySelector('.product-detail__category');
  var titleEl = document.querySelector('.product-detail__title');
  var priceEl = document.querySelector('.product-detail__price');
  var descEl = document.querySelector('.product-detail__description');
  var notesEl = document.querySelector('.product-detail__notes-list');
  var weightEl = document.querySelector('[data-weight]');

  if (catEl) catEl.textContent = product.categoryLabel;
  if (titleEl) titleEl.textContent = product.name;
  if (priceEl) priceEl.textContent = formatPrice(product.price);
  if (descEl) descEl.textContent = product.description;
  if (weightEl) weightEl.textContent = product.weight;
  if (notesEl) {
    notesEl.innerHTML = product.notes.map(function(n) {
      return '<span class="product-detail__note">' + n + '</span>';
    }).join('');
  }

  var qty = 1;
  var qtyVal = document.querySelector('.product-detail__qty-value');
  var btns = document.querySelectorAll('.product-detail__qty-btn');
  if (btns[0]) btns[0].addEventListener('click', function(){ if(qty>1){ qty--; if(qtyVal) qtyVal.textContent=qty; } });
  if (btns[1]) btns[1].addEventListener('click', function(){ qty++; if(qtyVal) qtyVal.textContent=qty; });

  var addBtn = document.querySelector('.product-detail__add-btn');
  if (addBtn) {
    addBtn.addEventListener('click', function() {
      addToCart(product.id, qty);
      renderCartDrawer();
      showToast(product.name + ' ajouté au panier ✓');
      openCart();
    });
  }

  // Related
  var relGrid = document.querySelector('.related-products .products-grid');
  if (relGrid) {
    var related = getRelatedProducts(id, 4);
    if (related.length === 0) {
      var relSection = document.querySelector('.related-products');
      if (relSection) relSection.remove();
    } else {
      relGrid.innerHTML = related.map(function(p, i) {
        return '<article class="product-card reveal reveal-delay-' + (i+1) + '">'
          + '<a href="product.html?id=' + p.id + '">'
          + '<div class="product-card__image-container">'
          + '<img src="' + p.image + '" alt="' + p.name + '" class="product-card__image" loading="lazy">'
          + '<div class="product-card__quick-add"><button class="product-card__quick-add-btn" data-id="' + p.id + '">Ajouter au panier</button></div>'
          + '</div><div class="product-card__info">'
          + '<div class="product-card__category">' + p.categoryLabel + '</div>'
          + '<h3 class="product-card__name">' + p.name + '</h3>'
          + '<div class="product-card__price">' + formatPrice(p.price) + '</div>'
          + '</div></a></article>';
      }).join('');
      relGrid.querySelectorAll('.product-card__quick-add-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.preventDefault(); e.stopPropagation();
          var pid = btn.dataset.id;
          addToCart(pid, 1);
          renderCartDrawer();
          showToast(getProductById(pid).name + ' ajouté au panier ✓');
          openCart();
        });
      });
    }
  }
  initReveal();
}

// ---- CART PAGE ----
function renderCartPage() {
  var cart = getCart();
  var itemsEl = document.querySelector('.cart-page__items');
  var emptyEl = document.querySelector('.cart-page__empty');
  var summaryEl = document.querySelector('.cart-page__summary');

  if (!itemsEl) return;

  if (cart.items.length === 0) {
    itemsEl.style.display = 'none';
    if (summaryEl) summaryEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';
  if (summaryEl) summaryEl.style.display = 'block';
  itemsEl.style.display = 'block';

  // Rebuild items list inside cart-page__items (after the header div)
  var existingItems = itemsEl.querySelectorAll('.cart-page__item');
  existingItems.forEach(function(el){ el.remove(); });

  var fragment = document.createDocumentFragment();
  cart.items.forEach(function(item) {
    var p = getProductById(item.productId);
    if (!p) return;
    var div = document.createElement('div');
    div.className = 'cart-page__item';
    div.dataset.id = item.productId;
    div.innerHTML = '<div class="cart-page__item-image"><img src="' + p.image + '" alt="' + p.name + '" loading="lazy"></div>'
      + '<div class="cart-page__item-details">'
      + '<h3 class="cart-page__item-name">' + p.name + '</h3>'
      + '<div class="cart-page__item-price">' + formatPrice(p.price) + '</div>'
      + '<div class="cart-page__item-controls">'
      + '<div class="cart-page__item-quantity">'
      + '<button class="cart-page__item-qty-btn" data-action="decrease">−</button>'
      + '<span class="cart-page__item-qty-value">' + item.quantity + '</span>'
      + '<button class="cart-page__item-qty-btn" data-action="increase">+</button>'
      + '</div>'
      + '<button class="cart-page__item-remove" data-action="remove">Supprimer</button>'
      + '</div></div>'
      + '<div class="cart-page__item-subtotal">' + formatPrice(p.price * item.quantity) + '</div>';
    fragment.appendChild(div);
  });
  itemsEl.appendChild(fragment);

  itemsEl.querySelectorAll('.cart-page__item').forEach(function(el) {
    var pid = el.dataset.id;
    el.querySelector('[data-action="decrease"]').addEventListener('click', function(){
      var c = getCart(); var it = c.items.find(function(i){return i.productId===pid;});
      if(it){ updateQuantity(pid, it.quantity-1); renderCartPage(); renderCartDrawer(); }
    });
    el.querySelector('[data-action="increase"]').addEventListener('click', function(){
      var c = getCart(); var it = c.items.find(function(i){return i.productId===pid;});
      if(it){ updateQuantity(pid, it.quantity+1); renderCartPage(); renderCartDrawer(); }
    });
    el.querySelector('[data-action="remove"]').addEventListener('click', function(){
      removeFromCart(pid);
      showToast('Produit retiré');
      renderCartPage(); renderCartDrawer();
    });
  });

  // Totals
  var subtotal = getCartTotal(cart);
  var shipping = subtotal > 50 ? 0 : 5.90;
  var total = subtotal + shipping;

  var subEl = document.querySelector('.cart-page__subtotal .text-price');
  var shipEl = document.querySelector('.cart-page__shipping .text-price');
  var totEl = document.querySelector('.cart-page__total .text-price');
  if (subEl) subEl.textContent = formatPrice(subtotal);
  if (shipEl) shipEl.textContent = shipping === 0 ? 'Gratuit' : formatPrice(shipping);
  if (totEl) totEl.textContent = formatPrice(total);
}

// ---- CONFIGURATION ----
// Remplacez cette URL par celle de votre Google Apps Script déployé
var GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/u/4/s/AKfycbxmd2o2cJLz1DYp6p527MP0eREVxqwAk-3P-XY3oMGXluoD6zODGfNFcdtnKNFYcYSq/exec';

function submitOrder(orderData) {
  // Envoi vers Google Apps Script (Google Sheets + Gmail)
  if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL !== 'VOTRE_URL_GOOGLE_APPS_SCRIPT_ICI') {
    fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    }).catch(function(err) { console.warn('Erreur envoi commande:', err); });
  }
}

function initCart() {
  renderCartPage();
  var btn = document.querySelector('.cart-page__checkout-btn');
  if (btn) {
    btn.addEventListener('click', function() {
      var cart = getCart();
      if (cart.items.length === 0) { showToast('Votre panier est vide'); return; }

      // Récupération des données du formulaire
      var nom        = (document.getElementById('nom')         || {}).value || '';
      var prenom     = (document.getElementById('prenom')      || {}).value || '';
      var numero     = (document.getElementById('numero')      || {}).value || '';
      var ville      = (document.getElementById('ville')       || {}).value || '';
      var codePostal = (document.getElementById('code-postal') || {}).value || '';
      var adresse    = (document.getElementById('adresse')     || {}).value || '';

      var orderNum = 'FLB-' + Date.now().toString(36).toUpperCase();
      var orderItems = cart.items.map(function(item) {
        var p = getProductById(item.productId);
        return { name: p ? p.name : 'Produit', price: p ? p.price : 0, qty: item.quantity };
      });
      var orderTotal = getCartTotal(cart);

      // Données complètes de la commande
      var orderData = {
        orderNum:   orderNum,
        date:       new Date().toLocaleString('fr-FR'),
        nom:        nom,
        prenom:     prenom,
        telephone:  numero,
        ville:      ville,
        codePostal: codePostal,
        adresse:    adresse,
        items:      orderItems,
        total:      orderTotal
      };

      // Enregistrement Google Sheets + notif Gmail
      submitOrder(orderData);

      try { sessionStorage.setItem('flambeau_last_order', JSON.stringify({ items: orderItems, total: orderTotal })); } catch(e){}
      clearCart(); renderCartDrawer();
      window.location.href = 'confirmation.html?order=' + orderNum;
    });
  }
}

// ---- CONFIRMATION PAGE ----
function initConfirmation() {
  var params = new URLSearchParams(window.location.search);
  var orderNum = params.get('order') || 'FLB-XXXXXX';
  var el = document.getElementById('order-number');
  if (el) el.textContent = orderNum;

  try {
    var saved = sessionStorage.getItem('flambeau_last_order');
    if (saved) {
      var order = JSON.parse(saved);
      var itemsEl = document.getElementById('order-items');
      var totalEl = document.getElementById('order-total-amount');
      if (itemsEl && order.items) {
        itemsEl.innerHTML = order.items.map(function(item) {
          return '<div class="confirmation-page__order-item">'
            + '<span>' + item.name + ' × ' + item.qty + '</span>'
            + '<span>' + formatPrice(item.price * item.qty) + '</span>'
            + '</div>';
        }).join('');
      }
      if (totalEl && order.total) totalEl.textContent = formatPrice(order.total);
      sessionStorage.removeItem('flambeau_last_order');
    }
  } catch(e) {}

  // Confetti
  var colors = ['#D4AF37','#B8956E','#FAF8F5','#2C2C2C'];
  for (var i = 0; i < 60; i++) {
    (function(j){
      setTimeout(function(){
        var dot = document.createElement('div');
        dot.className = 'confetti-dot';
        dot.style.cssText = 'left:' + (Math.random()*100) + 'vw;top:-10px;background:' + colors[j%4]
          + ';animation-duration:' + (1.5+Math.random()*2) + 's;width:' + (4+Math.random()*8) + 'px;height:' + (4+Math.random()*8) + 'px;';
        document.body.appendChild(dot);
        setTimeout(function(){ if(dot.parentNode) dot.remove(); }, 3500);
      }, j * 30);
    })(i);
  }
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', function() {
  initNav();
  initReveal();

  var page = document.body.dataset.page;
  if (page === 'home') initHome();
  else if (page === 'shop') initShop();
  else if (page === 'product') initProduct();
  else if (page === 'cart') initCart();
  else if (page === 'confirmation') initConfirmation();
});
