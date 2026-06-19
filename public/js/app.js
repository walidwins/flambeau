// ========================================
// FLAMBEAU — Script unifié (sans modules ES6)
// Compatible ouverture directe file://
// ========================================

// ---- PRODUITS ----
var PRODUCTS = [];
var DEFAULT_PRODUCT_IMAGE = 'imgs/aery-good-vibes-premium-scented-candle-packaging.jpg';
var DEFAULT_FRAGRANCES = [
  'Oud',
  'Musc',
  'Ambre',
  'Vanille',
  "Fleur d'oranger",
  'Rose',
  'Gardenia',
  'Herbal',
  'Magnolia précieuse',
  'Fruits rouges',
  'Lavande',
  'Thé vert',
  'Jasmin de damas',
  'Chocolat noir',
  'Cannelle orange',
  'Citron',
  'Caramel',
  'Bois de oud',
  'Orchidée',
  'Khalij',
  'Ylang ylang',
  'Cerise'
];
var FRAGRANCE_CATEGORIES = ['fondants', 'bougies', 'bakhour', 'boukhour', 'poudre', 'poudre-parfumee'];
var PRODUCT_USAGE_CATEGORIES = ['fondants', 'bougies', 'bakhour', 'boukhour', 'diffuseurs', 'poudre', 'poudre-parfumee'];

function normalizeCategoryName(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, '-');
}

function requiresFragranceChoice(product) {
  return product && FRAGRANCE_CATEGORIES.indexOf(normalizeCategoryName(product.category)) !== -1;
}

function isProductAvailable(product) {
  return !!product && product.inStock !== false;
}

function getProductActionLabel(product) {
  if (!isProductAvailable(product)) return 'Rupture';
  return requiresFragranceChoice(product) ? 'Choisir parfum' : 'Ajouter au panier';
}

function getProductFragrances(product) {
  var fragrances = DEFAULT_FRAGRANCES.slice();
  if (product && Array.isArray(product.fragrances) && product.fragrances.length > 0) {
    product.fragrances.forEach(function(name) {
      name = String(name || '').trim();
      if (name && fragrances.indexOf(name) === -1) {
        fragrances.push(name);
      }
    });
  }
  return fragrances;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeImageUrl(value) {
  var url = String(value || '').trim();
  if (!url) return DEFAULT_PRODUCT_IMAGE;
  if (/^imgs\/[-a-zA-Z0-9_./]+$/.test(url)) return url;
  if (/^https:\/\/[^\s"'<>]+$/i.test(url)) return url;
  return DEFAULT_PRODUCT_IMAGE;
}

function safeProductId(value) {
  return encodeURIComponent(String(value || ''));
}

function normalizeProductKeyPart(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function loadProductsFromBackend(callback) {
  var done = false;

  function finish() {
    if (done) return;
    done = true;
    callback();
  }

  try {
    localStorage.removeItem('flambeau_products_cache_v1');
    localStorage.removeItem('flambeau_products_cache_v2');
  } catch(e) {}

  function normalizeProducts(products) {
    if (products && Array.isArray(products.products)) {
      products = products.products;
    } else if (products && Array.isArray(products.data)) {
      products = products.data;
    }

    if (!Array.isArray(products)) {
      return [];
    }

    var seenIds = {};
    var seenKeys = {};

    return products
      .filter(function(p) {
        var id = p.id || p.ID || p.Id;
        var name = p.name || p.nom || p.Nom || p.Name;
        var price = p.price || p.prix || p.Prix || p.Price;
        var image = p.image || p.Image || p.imageUrl || p.url || p.URL;
        return id && name && price && image;
      })
      .map(function(p) {
        var category = p.category || p.categorie || p['catégorie'] || p.Category || 'bougies';
        var notes = p.notes || p.Notes || '';
        var fragrances = p.fragrances || p.Fragrances || p.parfums || p.Parfums || '';
        return {
          id: String(p.id || p.ID || p.Id),
          name: String(p.name || p.nom || p.Nom || p.Name),
          category: String(category).toLowerCase(),
          categoryLabel: p.categoryLabel || p.CategoryLabel || p.label || p.Label || category || 'Bougies',
          price: Number(p.price || p.prix || p.Prix || p.Price || 0),
          description: p.description || p.Description || '',
          notes: Array.isArray(notes)
            ? notes
            : String(notes || '').split(',').map(function(n) {
                return n.trim();
              }).filter(Boolean),
          fragrances: Array.isArray(fragrances)
            ? fragrances.map(function(n) { return String(n).trim(); }).filter(Boolean)
            : String(fragrances || '').split(',').map(function(n) {
                return n.trim();
              }).filter(Boolean),
          weight: p.weight || p.poids || p.Poids || '',
          stock: Number(p.stock || p.Stock || 0),
          image: safeImageUrl(p.image || p.Image || p.imageUrl || p.url || p.URL || ''),
          inStock: String(p.inStock).toUpperCase() !== 'FALSE'
        };
      })
      .filter(function(p) {
        var key = normalizeProductKeyPart(p.category) + '::' + normalizeProductKeyPart(p.name);
        if (seenIds[p.id] || seenKeys[key]) return false;
        seenIds[p.id] = true;
        seenKeys[key] = true;
        return true;
      });
  }

  fetch('/api/products')
    .then(function(response) {
      if (!response.ok) throw new Error('API produits indisponible');
      return response.json();
    })
    .then(function(products) {
      var cleanProducts = normalizeProducts(products);
      PRODUCTS = cleanProducts;
      finish();
    })
    .catch(function(error) {
      console.warn('Impossible de charger les produits depuis le backend:', error);
      PRODUCTS = [];
      finish();
    });
}

function getProductById(id) {
  return PRODUCTS.find(function(p) {
    return p.id === id;
  });
}
function getProductsByCategory(cat) {
  return cat === 'all' ? PRODUCTS : PRODUCTS.filter(function(p) {
    return p.category === cat;
  });
}
function getFeaturedProducts() { return PRODUCTS.slice(0, 4); }
function getRelatedProducts(id, limit) {
  var p = getProductById(id);
  if (!p) return [];
  return PRODUCTS.filter(function(x) {
    return x.id !== id && x.category === p.category;
  }).slice(0, limit || 4);
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
function getItemFragrance(item) {
  return item ? String(item.fragrance || item.parfum || '').trim() : '';
}

function addToCart(productId, qty, fragrance) {
  var cart = getCart();
  fragrance = String(fragrance || '').trim();
  var item = cart.items.find(function(i){
    return i.productId === productId && getItemFragrance(i) === fragrance;
  });
  if (item) {
    item.quantity += (qty || 1);
    item.fragrance = fragrance;
    delete item.parfum;
  }
  else { cart.items.push({ productId: productId, quantity: qty || 1, fragrance: fragrance }); }
  saveCart(cart);
  return cart;
}
function removeFromCart(productId, fragrance) {
  fragrance = String(fragrance || '').trim();
  var cart = getCart();
  cart.items = cart.items.filter(function(i){
    return !(i.productId === productId && getItemFragrance(i) === fragrance);
  });
  saveCart(cart); return cart;
}
function updateQuantity(productId, quantity, fragrance) {
  fragrance = String(fragrance || '').trim();
  var cart = getCart();
  var item = cart.items.find(function(i){
    return i.productId === productId && getItemFragrance(i) === fragrance;
  });
  if (item) {
    if (quantity <= 0) {
      cart.items = cart.items.filter(function(i){
        return !(i.productId === productId && getItemFragrance(i) === fragrance);
      });
    }
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
  return Number(price || 0).toFixed(2).replace('.', ',') + ' DH';
}

// ---- TOAST ----
function showToast(message) {
  var existing = document.querySelector('.toast');
  if (existing) existing.remove();
  var toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = '<svg class="toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>'
    + '<span class="toast__message">' + escapeHtml(message) + '</span>'
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
    var fragrance = getItemFragrance(item);
    return '<div class="cart-item" data-id="' + escapeHtml(item.productId) + '" data-fragrance="' + escapeHtml(fragrance) + '">'
      + '<div class="cart-item__image"><img src="' + escapeHtml(safeImageUrl(p.image)) + '" alt="' + escapeHtml(p.name) + '" loading="lazy"></div>'
      + '<div class="cart-item__details">'
      + '<div class="cart-item__name">' + escapeHtml(p.name) + '</div>'
      + (fragrance ? '<div class="cart-item__fragrance">Parfum choisi : ' + escapeHtml(fragrance) + '</div>' : '')
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
    var fragrance = el.dataset.fragrance || '';
    el.querySelector('[data-action="decrease"]').addEventListener('click', function(){
      var c = getCart(); var it = c.items.find(function(i){return i.productId===pid && getItemFragrance(i) === fragrance;});
      if(it){ updateQuantity(pid, it.quantity - 1, fragrance); renderCartDrawer(); }
    });
    el.querySelector('[data-action="increase"]').addEventListener('click', function(){
      var c = getCart(); var it = c.items.find(function(i){return i.productId===pid && getItemFragrance(i) === fragrance;});
      if(it){ updateQuantity(pid, it.quantity + 1, fragrance); renderCartDrawer(); }
    });
    el.querySelector('[data-action="remove"]').addEventListener('click', function(){
      var p = getProductById(pid);
      removeFromCart(pid, fragrance);
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
      document.body.classList.toggle('nav-open', open);
    });
  }
    menu.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', function() {
        menu.classList.remove('nav__menu--open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('nav-open');
      });
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

// ---- HOME PAGE ----
function initHome() {
  // Featured products
  var grid = document.querySelector('.featured-products .products-grid');
  if (grid) {
    var featured = getFeaturedProducts();
    grid.innerHTML = featured.map(function(p, i) {
      return '<article class="product-card reveal reveal-delay-' + (i+1) + '">'
        + '<a href="product.html?id=' + safeProductId(p.id) + '">'
        + '<div class="product-card__image-container">'
        + '<img src="' + escapeHtml(safeImageUrl(p.image)) + '" alt="' + escapeHtml(p.name) + '" class="product-card__image" loading="lazy" decoding="async">'
        + (!isProductAvailable(p) ? '<span class="product-card__badge product-card__badge--soldout">Rupture</span>' : '')
        + '<div class="product-card__quick-add"><button class="product-card__quick-add-btn" data-id="' + escapeHtml(p.id) + '"' + (!isProductAvailable(p) ? ' disabled' : '') + '>' + getProductActionLabel(p) + '</button></div>'
        + '</div>'
        + '<div class="product-card__info">'
        + '<div class="product-card__category">' + escapeHtml(p.categoryLabel) + '</div>'
        + '<h3 class="product-card__name">' + escapeHtml(p.name) + '</h3>'
        + '<div class="product-card__price">' + formatPrice(p.price) + '</div>'
        + '</div></a></article>';
    }).join('');

    grid.querySelectorAll('.product-card__quick-add-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        var id = btn.dataset.id;
        var product = getProductById(id);
        if (!isProductAvailable(product)) {
          showToast('Ce produit est en rupture de stock');
          return;
        }
        if (requiresFragranceChoice(product)) {
          window.location.href = 'product.html?id=' + safeProductId(id);
          return;
        }
        addToCart(id, 1);
        renderCartDrawer();
        showToast(product.name + ' ajouté au panier ✓');
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
  if (list.length === 0) {
    container.innerHTML = '<div class="products-empty">Aucun produit disponible pour le moment.</div>';
    return;
  }

  container.innerHTML = list.map(function(p, i) {
    return '<article class="product-card reveal reveal-delay-' + ((i%4)+1) + '">'
      + '<a href="product.html?id=' + safeProductId(p.id) + '">'
      + '<div class="product-card__image-container">'
      + '<img src="' + escapeHtml(safeImageUrl(p.image)) + '" alt="' + escapeHtml(p.name) + '" class="product-card__image" loading="lazy" decoding="async">'
      + (!isProductAvailable(p) ? '<span class="product-card__badge product-card__badge--soldout">Rupture</span>' : '')
      + '<div class="product-card__quick-add"><button class="product-card__quick-add-btn" data-id="' + escapeHtml(p.id) + '"' + (!isProductAvailable(p) ? ' disabled' : '') + '>' + getProductActionLabel(p) + '</button></div>'
      + '</div>'
      + '<div class="product-card__info">'
      + '<div class="product-card__category">' + escapeHtml(p.categoryLabel) + '</div>'
      + '<h3 class="product-card__name">' + escapeHtml(p.name) + '</h3>'
      + '<div class="product-card__price">' + formatPrice(p.price) + '</div>'
      + '</div></a></article>';
  }).join('');

  container.querySelectorAll('.product-card__quick-add-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault(); e.stopPropagation();
      var id = btn.dataset.id;
      var product = getProductById(id);
      if (!isProductAvailable(product)) {
        showToast('Ce produit est en rupture de stock');
        return;
      }
      if (requiresFragranceChoice(product)) {
        window.location.href = 'product.html?id=' + safeProductId(id);
        return;
      }
      addToCart(id, 1);
      renderCartDrawer();
      showToast(product.name + ' ajouté au panier ✓');
      openCart();
    });
  });
  initReveal();
}

function initShop() {
  var initialCategory = window.location.hash ? window.location.hash.replace('#', '') : 'all';
  var activeCategory = initialCategory || 'all';
  var btns = document.querySelectorAll('.filter-btn');
  var hasCategory = false;
  btns.forEach(function(btn) {
    if (btn.dataset.category === activeCategory) {
      hasCategory = true;
    }
  });
  if (!hasCategory) {
    activeCategory = 'all';
  }
  renderShopProducts(activeCategory);
  btns.forEach(function(btn) {
    btn.classList.toggle('filter-btn--active', btn.dataset.category === activeCategory);
  });
  btns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      btns.forEach(function(b){ b.classList.remove('filter-btn--active'); });
      btn.classList.add('filter-btn--active');
      if (btn.dataset.category && btn.dataset.category !== 'all') {
        window.location.hash = btn.dataset.category;
      } else {
        history.replaceState(null, '', window.location.pathname);
      }
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
  if (img) { img.src = safeImageUrl(product.image); img.alt = product.name; }

  var catEl = document.querySelector('.product-detail__category');
  var titleEl = document.querySelector('.product-detail__title');
  var priceEl = document.querySelector('.product-detail__price');
  var descEl = document.querySelector('.product-detail__description');
  var notesEl = document.querySelector('.product-detail__notes-list');
  var detailsEl = document.querySelector('[data-product-details]');
  var infoEl = document.querySelector('[data-product-info]');
  var productCategory = normalizeCategoryName(product.category);
  var showUsageInfo = PRODUCT_USAGE_CATEGORIES.indexOf(productCategory) !== -1;

  if (catEl) catEl.textContent = product.categoryLabel;
  if (titleEl) titleEl.textContent = product.name;
  if (priceEl) priceEl.textContent = formatPrice(product.price);
  if (descEl) descEl.textContent = product.description;
  if (detailsEl) {
    if (showUsageInfo) {
      detailsEl.innerHTML =
        '<section class="product-detail__summary" aria-label="Informations rapides produit">'
        + '<div class="product-detail__summary-row"><strong>Poids :</strong> environ 12 g par fondant</div>'
        + '<div class="product-detail__summary-row"><strong>Durée de diffusion :</strong> jusqu’à 10 heures</div>'
        + '</section>';
    } else {
      detailsEl.innerHTML = '';
    }
  }
  if (infoEl) {
    if (showUsageInfo) {
      infoEl.innerHTML =
        '<section class="product-detail__usage">'
        + '<h2 class="product-detail__usage-title">Mode d\'emploi</h2>'
        + '<ul class="product-detail__usage-list">'
        + '<li><strong>Utilisation :</strong> Placez votre fondant parfumé dans la coupelle du brûle-parfum, puis insérez une bougie chauffe-plat allumée en dessous pour diffuser la senteur.</li>'
        + '<li><strong>Réutilisation :</strong> Un même fondant peut être utilisé à plusieurs reprises, selon l\'intensité du parfum.</li>'
        + '<li><strong>Entretien :</strong> Lorsque le fondant ne diffuse plus d\'odeur, vous pouvez absorber la cire liquide avec un mouchoir. Si la cire est figée, placez le brûle-parfum au congélateur pendant 15 minutes : le bloc de cire se décollera facilement à l\'aide d\'une pointe de couteau ou d\'une cuillère.</li>'
        + '</ul>'
        + '<h3 class="product-detail__usage-subtitle">Composition et engagement qualité</h3>'
        + '<p>Nos fondants sont le fruit d\'un travail artisanal réalisé avec soin au cœur de notre atelier à Oujda. Pour vous offrir une expérience olfactive saine et durable, nous avons sélectionné des matières premières rigoureuses :</p>'
        + '<ul class="product-detail__usage-list">'
        + '<li><strong>Cire de soja 100 % végétale :</strong> Sans OGM ni pesticides.</li>'
        + '<li><strong>Parfums de qualité :</strong> Garantis sans substances toxiques pour préserver la qualité de l\'air dans votre maison.</li>'
        + '<li><strong>Pigments naturels :</strong> Pour colorer nos créations tout en respectant notre engagement envers une composition naturelle.</li>'
        + '</ul>'
        + '</section>';
    } else {
      infoEl.innerHTML =
        '<div class="product-detail__meta-item"><span>Poids :</span><span>' + escapeHtml(product.weight || '300g') + '</span></div>'
        + '<div class="product-detail__meta-item"><span>Livraison :</span><span>2–5 jours ouvrés, partout au Maroc</span></div>'
        + '<div class="product-detail__meta-item"><span>Fabrication :</span><span>Artisanale, cire naturelle, sans phtalates</span></div>';
    }
  }
  if (notesEl) {
    if (requiresFragranceChoice(product)) {
      notesEl.closest('.product-detail__notes').style.display = '';
      notesEl.innerHTML = '<select id="product-fragrance" class="product-detail__fragrance-select" required>'
      + '<option value="">Choisissez votre parfum</option>'
      + getProductFragrances(product).map(function(name) {
        return '<option value="' + escapeHtml(name) + '">' + escapeHtml(name) + '</option>';
      }).join('')
      + '</select>';
    } else {
      notesEl.closest('.product-detail__notes').style.display = 'none';
    }
  }

  var qty = 1;
  var qtyVal = document.querySelector('.product-detail__qty-value');
  var btns = document.querySelectorAll('.product-detail__qty-btn');
  if (btns[0]) btns[0].addEventListener('click', function(){ if(qty>1){ qty--; if(qtyVal) qtyVal.textContent=qty; } });
  if (btns[1]) btns[1].addEventListener('click', function(){ qty++; if(qtyVal) qtyVal.textContent=qty; });

  var addBtn = document.querySelector('.product-detail__add-btn');
  if (addBtn) {
    if (!isProductAvailable(product)) {
      addBtn.textContent = 'Rupture de stock';
      addBtn.disabled = true;
    }
    addBtn.addEventListener('click', function() {
      if (!isProductAvailable(product)) {
        showToast('Ce produit est en rupture de stock');
        return;
      }
      var fragranceSelect = document.getElementById('product-fragrance');
      var fragrance = fragranceSelect ? fragranceSelect.value : '';
      if (requiresFragranceChoice(product) && !fragrance) {
        showToast('Choisissez votre parfum avant d’ajouter au panier');
        if (fragranceSelect) fragranceSelect.focus();
        return;
      }
      addToCart(product.id, qty, fragrance);
      renderCartDrawer();
      showToast(product.name + (fragrance ? ' - ' + fragrance : '') + ' ajouté au panier ✓');
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
          + '<a href="product.html?id=' + safeProductId(p.id) + '">'
          + '<div class="product-card__image-container">'
          + '<img src="' + escapeHtml(safeImageUrl(p.image)) + '" alt="' + escapeHtml(p.name) + '" class="product-card__image" loading="lazy" decoding="async">'
          + (!isProductAvailable(p) ? '<span class="product-card__badge product-card__badge--soldout">Rupture</span>' : '')
          + '<div class="product-card__quick-add"><button class="product-card__quick-add-btn" data-id="' + escapeHtml(p.id) + '"' + (!isProductAvailable(p) ? ' disabled' : '') + '>' + getProductActionLabel(p) + '</button></div>'
          + '</div><div class="product-card__info">'
          + '<div class="product-card__category">' + escapeHtml(p.categoryLabel) + '</div>'
          + '<h3 class="product-card__name">' + escapeHtml(p.name) + '</h3>'
          + '<div class="product-card__price">' + formatPrice(p.price) + '</div>'
          + '</div></a></article>';
      }).join('');
      relGrid.querySelectorAll('.product-card__quick-add-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.preventDefault(); e.stopPropagation();
          var pid = btn.dataset.id;
          var product = getProductById(pid);
          if (!isProductAvailable(product)) {
            showToast('Ce produit est en rupture de stock');
            return;
          }
          if (requiresFragranceChoice(product)) {
            window.location.href = 'product.html?id=' + safeProductId(pid);
            return;
          }
          addToCart(pid, 1);
          renderCartDrawer();
          showToast(product.name + ' ajouté au panier ✓');
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
    var fragrance = getItemFragrance(item);
    div.className = 'cart-page__item';
    div.dataset.id = item.productId;
    div.dataset.fragrance = fragrance;
    div.innerHTML = '<div class="cart-page__item-image"><img src="' + escapeHtml(safeImageUrl(p.image)) + '" alt="' + escapeHtml(p.name) + '" loading="lazy" decoding="async"></div>'
      + '<div class="cart-page__item-details">'
      + '<h3 class="cart-page__item-name">' + escapeHtml(p.name) + '</h3>'
      + (fragrance ? '<div class="cart-page__item-fragrance">Parfum choisi : ' + escapeHtml(fragrance) + '</div>' : '')
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
    var fragrance = el.dataset.fragrance || '';
    el.querySelector('[data-action="decrease"]').addEventListener('click', function(){
      var c = getCart(); var it = c.items.find(function(i){return i.productId===pid && getItemFragrance(i) === fragrance;});
      if(it){ updateQuantity(pid, it.quantity-1, fragrance); renderCartPage(); renderCartDrawer(); }
    });
    el.querySelector('[data-action="increase"]').addEventListener('click', function(){
      var c = getCart(); var it = c.items.find(function(i){return i.productId===pid && getItemFragrance(i) === fragrance;});
      if(it){ updateQuantity(pid, it.quantity+1, fragrance); renderCartPage(); renderCartDrawer(); }
    });
    el.querySelector('[data-action="remove"]').addEventListener('click', function(){
      removeFromCart(pid, fragrance);
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

function submitOrder(orderData) {
  return fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  }).then(function(response) {
    return response.text().then(function(text) {
      var data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        data = { raw: text };
      }

      if (!response.ok) {
        var message = data.error || data.details || data.message || text || 'Commande refusée par le serveur';
        throw new Error(message);
      }

      return data;
    });
  });
}

function initCart() {
  renderCartPage();
  var form = document.getElementById('orderForm');
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();

      if (form.reportValidity && !form.reportValidity()) {
        return;
      }

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
        return { productId: item.productId, name: p ? p.name : 'Produit', fragrance: getItemFragrance(item), price: p ? p.price : 0, qty: item.quantity };
      });
      var orderTotal = getCartTotal(cart);

      // Données complètes de la commande
      var orderData = {
        action: 'order',
        orderNum: orderNum,
        date: new Date().toLocaleString('fr-FR'),
        nom: nom,
        prenom: prenom,
        telephone: numero,
        ville: ville,
        codePostal: codePostal,
        adresse: adresse,
        items: orderItems,
        total: orderTotal
      };

      var submitBtn = form.querySelector('.cart-page__checkout-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Envoi en cours...';
      }

      // Enregistrement Google Sheets + notif Gmail
      submitOrder(orderData).then(function(result) {
        if (result && result.orderNum) {
          orderNum = result.orderNum;
        }
        try { sessionStorage.setItem('flambeau_last_order', JSON.stringify({ items: orderItems, total: orderTotal })); } catch(e){}
        clearCart(); renderCartDrawer();
        window.location.href = 'confirmation.html?order=' + orderNum;
      }).catch(function(error) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Passer la commande';
        }
        showToast(error.message || 'Impossible d’envoyer la commande');
      });
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
            + '<span>' + escapeHtml(item.name) + (item.fragrance ? ' - Parfum : ' + escapeHtml(item.fragrance) : '') + ' × ' + escapeHtml(item.qty) + '</span>'
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

  loadProductsFromBackend(function() {
    var page = document.body.dataset.page;

    if (page === 'home') initHome();
    else if (page === 'shop') initShop();
    else if (page === 'product') initProduct();
    else if (page === 'cart') initCart();
    else if (page === 'confirmation') initConfirmation();
  });
});
