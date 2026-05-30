# Flambeau - Luxury Home Fragrance Ecommerce

## 1. Concept & Vision

Flambeau is a premium home fragrance brand that transforms spaces into sanctuaries of scent. The website embodies understated luxury—where every interaction feels intentional, every visual element breathes, and the products speak through elegant restraint. Think: walking into a serene boutique in Paris where light, texture, and fragrance harmonize. The digital experience mirrors the sensory pleasure of burning a perfectly crafted candle.

## 2. Design Language

### Aesthetic Direction
**Reference**: Diptyque meets Aesop—where French perfumery heritage meets modern apothecary minimalism. Clean lines, generous negative space, warm photography, and typography that whispers rather than shouts.

### Color Palette
```
--color-cream:        #FAF8F5    (Primary Background)
--color-beige:        #F5F0E8    (Secondary Background)
--color-sand:         #E8E0D5    (Borders/Dividers)
--color-champagne:    #D4AF37    (Accent Gold)
--color-gold-muted:   #B8956E    (Muted Gold)
--color-charcoal:     #2C2C2C    (Primary Text)
--color-warm-gray:    #6B6560    (Secondary Text)
--color-white:        #FFFFFF    (Cards/Overlays)
```

**NO BLUE, NO PURPLE** — Strict adherence to warm, earthy neutrals with gold accents only.

### Typography
- **Display/Titles**: `Cormorant Garamond` (Serif) — Elegant, editorial, timeless
- **Body/UI**: `Montserrat` (Sans-serif) — Clean, readable, modern
- **Accents/Labels**: `Montserrat` 500 weight, letter-spacing: 0.15em, uppercase

### Spatial System
- Base unit: 8px
- Section padding: 120px vertical (desktop), 80px (tablet), 60px (mobile)
- Container max-width: 1400px
- Product grid gap: 32px
- Card padding: 24px

### Motion Philosophy
- **Principle**: Motion should feel like a gentle exhale—never jarring, never rushed
- **Page load**: Staggered fade-up (opacity 0→1, translateY 30px→0, 600ms ease-out, 100ms stagger)
- **Hover states**: Scale 1.02, 300ms ease-out
- **Cart interactions**: Subtle bounce on add (scale 1.1→1, 200ms)
- **Scroll reveal**: Intersection Observer with 0.15 threshold, once: true
- **Image hovers**: Subtle zoom (scale 1.05) with overlay fade

### Visual Assets
- **Icons**: Lucide Icons (line style, 1.5px stroke)
- **Images**: High-end lifestyle photography, warm lighting, shallow depth of field
- **Decorative**: Thin gold lines as dividers, subtle grain texture overlay (opacity 0.03)

## 3. Layout & Structure

### Information Architecture
```
├── index.html (Single Page Application)
│   ├── Navigation (sticky)
│   ├── Hero Section (100vh, video-led)
│   ├── Brand Story (split layout)
│   ├── Categories (3-column grid)
│   ├── Featured Products (4-column grid)
│   ├── Testimonials (carousel)
│   ├── Newsletter (centered CTA)
│   └── Footer (4-column)
│
├── shop.html (Product listing)
│   ├── Filter sidebar (categories)
│   └── Product grid (responsive)
│
├── product.html (Product detail)
│   ├── Image gallery
│   ├── Product info + add to cart
│   └── Related products
│
├── cart.html (Shopping cart)
│   ├── Cart items list
│   ├── Order summary
│   └── Checkout CTA
│
└── confirmation.html (Order confirmation)
    ├── Success message
    └── Order details
```

### Visual Pacing
- Hero: Full viewport, immersive, breathing space
- Content sections alternate between: full-width imagery, contained text+image, grid layouts
- Rhythm: Dense → Spacious → Dense (prevent monotony)
- Footer: Grounded, informative, elegant closure

### Responsive Strategy
- **Mobile-first** breakpoints: 375px → 768px → 1024px → 1440px
- Navigation: Hamburger menu below 1024px
- Product grid: 1 col (mobile) → 2 col (tablet) → 3-4 col (desktop)
- Hero typography scales: 48px (mobile) → 72px (tablet) → 96px (desktop)

## 4. Features & Interactions

### Navigation
- **Desktop**: Logo left, menu center, cart icon right (with item count badge)
- **Mobile**: Logo center, hamburger left, cart right
- **Behavior**: Sticky on scroll, background opacity transitions from transparent to solid
- **Cart badge**: Gold circle, white text, bounces on item add

### Hero Section
- **Type**: Video-led (autoplay, muted, loop)
- **Fallback**: Gradient background matching video tone (#F5F0E8)
- **Content**: Centered headline (Cormorant Garamond, 96px), tagline below, CTA button
- **Scroll indicator**: Animated chevron at bottom

### Product Cards
- **Image**: 4:5 aspect ratio, hover zoom effect
- **Overlay**: Quick-add button appears on hover
- **Info**: Product name, category tag, price
- **States**: Default, hover (elevated shadow + quick-add), out-of-stock (grayed)

### Shopping Cart
- **Trigger**: Slide-in panel from right (400px width)
- **Empty state**: Elegant illustration + "Your cart is empty" + CTA to shop
- **Item display**: Thumbnail, name, quantity stepper, price, remove button
- **Quantity**: Stepper with minus/plus, direct input
- **Persistence**: localStorage, JSON serialized
- **Total**: Updates live, formatted currency (€)

### Product Filtering (Shop page)
- **Categories**: Bougies, Fondants, Bakhour, Accessoires
- **Style**: Horizontal pills (desktop), dropdown (mobile)
- **Behavior**: Instant filter with fade animation

### Checkout Flow
1. Cart review → 2. Customer info (mock) → 3. Payment (Stripe mock) → 4. Confirmation

### Error States
- **Empty cart**: Illustrated empty state with CTA
- **Form errors**: Inline red text below field, field border turns gold
- **Network error**: Toast notification with retry option

## 5. Component Inventory

### Button (Primary)
- **Default**: Background champagne (#D4AF37), text charcoal, padding 16px 32px
- **Hover**: Background darkens 10%, translateY -2px
- **Active**: Scale 0.98
- **Disabled**: Opacity 0.5, cursor not-allowed
- **Loading**: Spinner replaces text

### Button (Secondary)
- **Default**: Transparent, 1px charcoal border, charcoal text
- **Hover**: Charcoal background, white text

### Product Card
- **Default**: White background, subtle shadow, rounded corners 8px
- **Hover**: Shadow elevated, image scales 1.05, quick-add button fades in
- **Loading**: Skeleton pulse animation
- **Out of stock**: Grayscale image, "Rupture de stock" badge

### Input Field
- **Default**: 1px sand border, cream background, 16px padding
- **Focus**: 2px champagne border, subtle glow
- **Error**: 2px #C4A77D border, error text below
- **Disabled**: Background sand, text muted

### Cart Item
- **Layout**: Image (80x80), info column, quantity stepper, price, remove icon
- **Remove**: Icon button, red on hover, confirms with animation

### Navigation
- **Logo**: Text "Flambeau" in Cormorant Garamond, letter-spacing 0.2em
- **Links**: Montserrat uppercase, 12px, letter-spacing 0.15em
- **Active**: Underline with gold accent

### Toast Notification
- **Position**: Bottom-right, 24px from edges
- **Style**: White background, shadow, gold left border
- **Animation**: Slide up + fade in, auto-dismiss after 4s

## 6. Technical Approach

### Stack
- **HTML5**: Semantic structure (header, nav, main, section, article, footer)
- **CSS3**: Custom properties, Flexbox, Grid, no frameworks
- **JavaScript**: Vanilla ES6+, modules pattern, localStorage for persistence

### Architecture
```
/flambeau-ecommerce
├── index.html
├── shop.html
├── product.html
├── cart.html
├── confirmation.html
├── css/
│   └── styles.css
├── js/
│   ├── main.js
│   ├── cart.js
│   └── products.js
├── imgs/
│   └── (all product/lifestyle images)
└── videos/
    └── hero.mp4
```

### Data Model
```javascript
Product {
  id: string,
  name: string,
  category: 'bougies' | 'fondants' | 'bakhour' | 'accessoires',
  price: number,
  description: string,
  notes: string[],
  weight: string,
  image: string,
  inStock: boolean
}

CartItem {
  productId: string,
  quantity: number
}

Cart {
  items: CartItem[],
  updatedAt: timestamp
}
```

### localStorage Schema
```javascript
'flambeau_cart': JSON.stringify({ items: [{productId, quantity}], updatedAt })
```

### Performance
- Lazy loading: `loading="lazy"` on below-fold images
- CSS: Critical CSS inlined, fonts preloaded
- Images: WebP when possible, srcset for responsive
- Animations: GPU-accelerated (transform, opacity only)

### Accessibility
- ARIA labels on interactive elements
- Focus visible states
- Color contrast ratio ≥ 4.5:1
- Keyboard navigation support
- Skip to content link

## 7. Products Data

### Bougies Parfumées
| ID | Name | Price | Notes | Weight |
|----|------|-------|-------|--------|
| B001 | Fleur d'Oranger | 35€ | Fleur d'oranger, jasmin, bois de santal | 300g |
| B002 | Vanille Bourbon | 32€ | Vanille, fève tonka, caramel | 300g |
| B003 | Rose Damascena | 38€ | Rose, patchouli, musc blanc | 300g |

### Fondants Parfumés
| ID | Name | Price | Notes | Pack |
|----|------|-------|-------|------|
| F001 | Café Gourmet | 18€ | Café, crème, chocolat | 12 units |
| F002 | Lavande Provencale | 16€ | Lavande, camomille, miel | 12 units |

### Bakhour
| ID | Name | Price | Notes | Weight |
|----|------|-------|-------|--------|
| K001 | Oud Royal | 45€ | Oud, ambre, musc | 50g |
| K002 | Mysore Sandalwood | 42€ | Santal, bois de rose, vanille | 50g |

### Accessoires
| ID | Name | Price | Material |
|----|------|-------|----------|
| A001 | Boîtier Bakhour Élégant | 28€ | Métal doré |
| A002 | Coupes chandelles en marbre | 35€ | Pierre naturelle |
