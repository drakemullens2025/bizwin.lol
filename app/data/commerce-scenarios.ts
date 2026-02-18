import { tier1Scenarios } from './tier1-scenarios';
import { tier2Scenarios } from './tier2-scenarios';
import { tier3Scenarios } from './tier3-scenarios';

export interface CommerceScenario {
  id: string;
  tier: number;
  category: 'market_analysis' | 'pricing' | 'store_design' | 'operations' | 'scaling';
  difficulty: number;
  title: string;
  context: string;
  challenge: string;
  optimalApproach: string;
  keyInsights: string[];
  commonMistakes: string[];
  requiresCatalog: boolean;
  nextLevel: string[];
}

// Category metadata for display
export const categoryMeta: Record<string, { label: string; color: string; icon: string }> = {
  market_analysis: { label: 'Market Analysis', color: 'var(--primary-500)', icon: '?' },
  pricing: { label: 'Pricing', color: 'var(--accent-500)', icon: '$' },
  store_design: { label: 'Store Design', color: 'var(--warning-500)', icon: '#' },
  operations: { label: 'Operations', color: 'var(--success-500)', icon: '!' },
  scaling: { label: 'Scaling', color: 'var(--neutral-600)', icon: '*' },
};

export const tier0Scenarios: CommerceScenario[] = [
  // Market Analysis (5 scenarios)
  {
    id: 'CS-001',
    tier: 0,
    category: 'market_analysis',
    difficulty: 1,
    title: 'The Niche Finder',
    context: 'You\'re browsing CJDropshipping\'s catalog and notice several product categories. You have $0 in startup capital but plenty of time to research. Your goal is to find a niche that\'s viable for a new dropshipping store.',
    challenge: 'Choose a niche from the CJ catalog and explain your reasoning. What factors make a niche viable for a beginner dropshipper? How would you validate demand before committing?',
    optimalApproach: 'Start by identifying product categories with multiple related items (enables cross-selling). Look for niches where products solve specific problems rather than being generic commodities. Validate demand using Google Trends, search volume, and social media engagement. Check competition by searching the product on Amazon/eBay — moderate competition means demand exists, zero competition often means no market.',
    keyInsights: [
      'Viable niches solve specific problems for identifiable audiences',
      'Cross-sell potential (related products) increases average order value',
      'Moderate competition validates demand — no competition usually means no market',
      'Google Trends and social media reveal demand trajectory, not just current state',
    ],
    commonMistakes: [
      'Choosing a niche based on personal interest without validating demand',
      'Picking oversaturated commodity markets (phone cases, generic jewelry)',
      'Ignoring shipping times and their impact on customer satisfaction',
      'Not considering the cost of customer acquisition in that niche',
    ],
    requiresCatalog: true,
    nextLevel: ['CS-002', 'CS-006'],
  },
  {
    id: 'CS-002',
    tier: 0,
    category: 'market_analysis',
    difficulty: 2,
    title: 'The Competition Map',
    context: 'You\'ve identified a potential niche: home office accessories. You found 15+ relevant products in the CJ catalog priced between $3-$25 (supplier cost). Before building your store, you need to understand the competitive landscape.',
    challenge: 'How would you map the competition for a home office accessories dropshipping store? What specific data points would you look for? How do you identify gaps competitors are missing?',
    optimalApproach: 'Search for "home office accessories" stores on Google, Instagram, and TikTok. For each competitor: note their price points, product range, branding quality, shipping promises, and review sentiment. Look for gaps: are they all targeting the same demographic? Are there product categories they\'re ignoring? What do negative reviews complain about (usually shipping speed and quality)? Map competitors on a 2x2: price (low/high) vs product range (narrow/wide). Find the quadrant with fewest players.',
    keyInsights: [
      'Competition mapping is about finding gaps, not avoiding competition entirely',
      'Negative reviews reveal unmet needs you can address',
      'Competitors\' weaknesses (slow shipping, poor photos) are your opportunities',
      'The 2x2 framework (price vs range) reveals strategic positioning options',
    ],
    commonMistakes: [
      'Looking only at Amazon — missing niche stores on Shopify/Etsy',
      'Assuming lower prices always win (ignoring brand value)',
      'Not checking review quality and quantity on competitor stores',
      'Ignoring social media presence as a competition indicator',
    ],
    requiresCatalog: false,
    nextLevel: ['CS-003', 'CS-006'],
  },
  {
    id: 'CS-003',
    tier: 0,
    category: 'market_analysis',
    difficulty: 2,
    title: 'The Demand Signal',
    context: 'A friend tells you that "pet tech" is the next big thing — smart feeders, GPS collars, pet cameras. You see several of these products on CJ with costs ranging from $8-$40. Before investing your time, you need to separate hype from real demand.',
    challenge: 'Design a demand validation process for pet tech products. What signals would confirm real, sustainable demand? What signals would warn you it\'s just hype? Be specific about what data you\'d gather and how you\'d interpret it.',
    optimalApproach: 'Layer multiple demand signals: (1) Google Trends — look for sustained growth, not spikes. (2) Amazon best-seller rankings in pet tech — high rank = proven demand. (3) Social media: TikTok/Instagram hashtag volume and engagement rates. (4) Reddit/forums: are real people asking for recommendations? (5) Competitor revenue signals: are established players running consistent ads? If a product is being advertised for months, it\'s profitable. Check Facebook Ad Library for ad longevity.',
    keyInsights: [
      'Single data points lie — layer multiple demand signals for confidence',
      'Sustained Google Trends growth beats viral spikes (spikes fade)',
      'If competitors run ads for months, the product is profitable (they\'d stop otherwise)',
      'User-generated demand (forums, Reddit) is stronger than influencer-driven demand',
    ],
    commonMistakes: [
      'Trusting a single data source (just Google Trends OR just social media)',
      'Confusing virality with sustainable demand',
      'Not distinguishing between product demand and category demand',
      'Ignoring the "who is buying" question — knowing the buyer matters as much as demand volume',
    ],
    requiresCatalog: false,
    nextLevel: ['CS-004'],
  },
  {
    id: 'CS-004',
    tier: 0,
    category: 'market_analysis',
    difficulty: 3,
    title: 'The Unit Economics Test',
    context: 'You\'ve found a promising product: a LED desk organizer on CJ for $12.50 supplier cost, with estimated $3.50 shipping to US customers. You\'re planning to sell it for $34.99. Before going further, you need to check if the math works.',
    challenge: 'Calculate the full unit economics for this product. Account for ALL costs a beginner might overlook. Is $34.99 the right price? What\'s the minimum number of units you\'d need to sell monthly to make this worthwhile?',
    optimalApproach: 'Full unit economics: Supplier cost $12.50 + Shipping $3.50 + Payment processing ~3% ($1.05) + Platform/hosting ~$0.50/order + Returns/refunds ~5% ($1.75) + Customer acquisition cost (CAC). At $34.99 retail: gross margin = $34.99 - $12.50 - $3.50 - $1.05 - $0.50 - $1.75 = $15.69 (44.8%). But CAC is the killer — if Facebook ads cost $10/conversion, real margin is $5.69 (16.3%). Need ~175 sales/month at $5.69 profit to make $1,000/month. At $10 CAC that\'s $1,750/month ad spend. Break-even requires consistent 3.5x ROAS.',
    keyInsights: [
      'The hidden costs (processing, returns, hosting) eat 5-10% of every sale',
      'Customer acquisition cost (CAC) is usually the largest expense — not product cost',
      'A product needs 40%+ gross margin to survive after ad costs',
      'Break-even ROAS (Return on Ad Spend) determines viability more than margin percentage',
    ],
    commonMistakes: [
      'Forgetting payment processing fees (2.9% + $0.30 per transaction)',
      'Not accounting for returns and refunds (5-10% in dropshipping)',
      'Setting price purely on markup without considering customer willingness to pay',
      'Ignoring customer acquisition cost — the biggest variable cost',
    ],
    requiresCatalog: false,
    nextLevel: ['CS-005', 'CS-006'],
  },
  {
    id: 'CS-005',
    tier: 0,
    category: 'market_analysis',
    difficulty: 3,
    title: 'The Seasonal Trap',
    context: 'It\'s September. You\'re looking at Christmas-themed products on CJ — LED string lights ($4.20), ornament organizers ($6.80), gift wrapping sets ($3.50). The margins look incredible and demand is about to spike. Every instinct says "go for it."',
    challenge: 'Should you build a seasonal store for Q4? Analyze the risks and rewards. If you do proceed, what\'s your timeline and exit strategy? If not, what would you do instead?',
    optimalApproach: 'Seasonal stores are high-risk for beginners. Pros: guaranteed demand spike, lower CAC during gift-buying season. Cons: (1) You have 8 weeks to set up, source, and start marketing. (2) Shipping from CJ takes 7-17 days — any delays push past Christmas. (3) After December, demand craters to zero. (4) Returns spike in January. (5) Ad costs spike 200-300% in Q4. Better approach: pick evergreen products that ALSO work as gifts. LED desk lamps work year-round but sell more in Q4. Build a sustainable store that gets a seasonal boost, not a store that dies in January.',
    keyInsights: [
      'Seasonal products have a narrow profit window — one shipping delay kills the business',
      'Q4 ad costs spike 200-300% — your margins get crushed from both sides',
      'Evergreen products with seasonal appeal beat pure seasonal products',
      'Post-holiday returns can wipe out December profits',
    ],
    commonMistakes: [
      'Underestimating setup time (store + ads + optimization takes 4-6 weeks minimum)',
      'Not accounting for shipping delays during peak holiday season',
      'Ignoring that ad costs triple during Q4 competition',
      'Building a business with a built-in expiration date',
    ],
    requiresCatalog: false,
    nextLevel: ['CS-006'],
  },

  // Pricing (5 scenarios)
  {
    id: 'CS-006',
    tier: 0,
    category: 'pricing',
    difficulty: 1,
    title: 'The Markup Myth',
    context: 'A popular YouTube "guru" says the rule of thumb is 3x markup — buy for $10, sell for $30. You have a product that costs $8.50 from CJ with $3 shipping. Following the rule, you\'d sell at $25.50.',
    challenge: 'Is the 3x markup rule valid? When does it work and when does it fail? What\'s a better framework for pricing a dropshipped product?',
    optimalApproach: 'The 3x rule is a starting heuristic, not a strategy. It fails when: (1) The product has direct Amazon/Walmart competitors at lower prices. (2) CAC is higher than expected (eating your margin). (3) Perceived value doesn\'t justify the price. Better framework: Price = max(Cost × 2.5, Competitor floor × 0.9, Perceived value ceiling × 0.7). Always validate with the "would I pay this?" test and competitor price anchoring. For the $11.50 total cost product, 3x = $34.50. But if Amazon sells similar for $24.99, you need differentiation (better photos, bundle, brand story) to justify the premium.',
    keyInsights: [
      'Markup rules are starting points, not strategies — context determines the right price',
      'Competitor pricing sets the ceiling unless you offer clear differentiation',
      'Perceived value can be increased through branding, photography, and storytelling',
      'Price anchoring (showing a "compare at" price) justifies higher prices psychologically',
    ],
    commonMistakes: [
      'Applying a flat markup without checking competitor prices',
      'Pricing too low to "beat competition" and destroying margins',
      'Not testing different price points to find the optimum',
      'Ignoring that price communicates quality — too cheap signals "junk"',
    ],
    requiresCatalog: false,
    nextLevel: ['CS-007', 'CS-008'],
  },
  {
    id: 'CS-007',
    tier: 0,
    category: 'pricing',
    difficulty: 2,
    title: 'The Free Shipping Illusion',
    context: 'Your product costs $15 from CJ. Shipping to US customers costs $5.50. You\'re debating two pricing approaches: Option A: $39.99 + $5.50 shipping = $45.49 total. Option B: $44.99 with "FREE shipping" = $44.99 total.',
    challenge: 'Which pricing approach is better and why? Are there situations where charging for shipping is actually smarter? What psychological principles are at play?',
    optimalApproach: 'Option B (free shipping at $44.99) almost always wins for several psychological reasons: (1) Shipping costs trigger "loss aversion" — paying for shipping feels like a penalty. (2) Free shipping is the #1 conversion driver in e-commerce. (3) Amazon Prime trained consumers to expect free shipping. (4) $44.99 looks cheaper than $39.99 + $5.50 even though it\'s less total. However, charging for shipping works when: (a) offering premium/express shipping options, (b) the product is so unique there\'s no alternative, or (c) you want a lower headline price for ads. Best approach: bake shipping into product price, then offer "Free Shipping" prominently.',
    keyInsights: [
      'Free shipping is the #1 conversion driver — it reduces cart abandonment by 20-30%',
      'Consumers perceive shipping fees as a "penalty" not a cost (loss aversion)',
      'The total price matters less than how it\'s framed psychologically',
      'Amazon trained an entire generation to expect free shipping as default',
    ],
    commonMistakes: [
      'Charging separately for shipping without a strategic reason',
      'Not factoring shipping into the base price when offering "free shipping"',
      'Offering free shipping but not communicating it prominently',
      'Assuming customers do the math — they react emotionally, not rationally',
    ],
    requiresCatalog: false,
    nextLevel: ['CS-008'],
  },
  {
    id: 'CS-008',
    tier: 0,
    category: 'pricing',
    difficulty: 2,
    title: 'The Bundle Builder',
    context: 'You sell a portable laptop stand for $29.99 (CJ cost $9). You notice related products on CJ: a laptop cooling pad ($7), cable organizer ($3), and webcam light ($5). Your average order value is $32 and you want to increase it.',
    challenge: 'Design a bundling strategy using these products. How would you price the bundles? What psychological tactics make bundles compelling? Calculate margins for each option.',
    optimalApproach: 'Create tiered bundles: (1) "Essentials" — Stand + Cable Organizer: Cost $12, sell $39.99 (70% margin, $10 savings vs separate). (2) "Pro Setup" — Stand + Cooling Pad + Cable Organizer: Cost $19, sell $54.99 (65% margin, $20 savings messaging). (3) "Complete Workspace" — All four: Cost $24, sell $69.99 (66% margin, $35 savings messaging). Price anchoring: show individual prices crossed out next to bundle price. The "savings" percentage motivates the upgrade. Middle bundle should be the target — it looks like the best value compared to basic and premium. Present bundles on product page as default selection.',
    keyInsights: [
      'Bundles increase AOV while maintaining or improving margins (lower per-item fulfillment cost)',
      'Three-tier pricing exploits the "compromise effect" — most people pick the middle option',
      'Showing individual prices crossed out creates powerful savings perception',
      'Complementary products (used together) bundle better than random products',
    ],
    commonMistakes: [
      'Bundling unrelated products that don\'t make logical sense together',
      'Pricing bundles too low and destroying margins',
      'Not showing the "value" (individual prices) alongside the bundle price',
      'Offering too many bundle options causing decision paralysis',
    ],
    requiresCatalog: true,
    nextLevel: ['CS-009'],
  },
  {
    id: 'CS-009',
    tier: 0,
    category: 'pricing',
    difficulty: 3,
    title: 'The Price Test',
    context: 'You\'ve been selling a minimalist desk lamp for $34.99 (CJ cost $11, fully loaded cost $16). You\'re getting consistent sales — about 3/day. You suspect you might be leaving money on the table or pricing yourself out of higher volume. You have budget for a 2-week test.',
    challenge: 'Design a price testing strategy. What prices would you test? How would you run the test fairly? What metrics determine the winner — and it\'s not just revenue?',
    optimalApproach: 'Test 3 prices: current ($34.99), lower ($27.99), higher ($42.99). Run each for equal time periods (5 days each) with equal ad spend. Don\'t just compare revenue — calculate profit per visitor. Metrics: (1) Conversion rate at each price. (2) Revenue per 100 visitors. (3) PROFIT per 100 visitors (the real winner). (4) Return rate at each price point. $27.99 might convert 50% more but generate less profit. $42.99 might convert 30% less but generate more profit per sale. The winner maximizes profit per visitor, not conversion rate or revenue alone.',
    keyInsights: [
      'Profit per visitor is the metric that matters — not conversion rate or revenue alone',
      'Lower prices don\'t always mean more profit (higher volume × lower margin can lose)',
      'Price tests must control for all other variables (same ads, same audience, same time)',
      'Return rates often change with price — cheaper items get more impulse buys and returns',
    ],
    commonMistakes: [
      'Optimizing for conversion rate instead of profit',
      'Testing too many prices at once (limits statistical significance)',
      'Running tests during different days/times (Tuesday vs Saturday behave differently)',
      'Not running tests long enough to get meaningful data',
    ],
    requiresCatalog: false,
    nextLevel: ['CS-010'],
  },
  {
    id: 'CS-010',
    tier: 0,
    category: 'pricing',
    difficulty: 3,
    title: 'The Anchor Effect',
    context: 'You\'re launching a premium version of your best-selling LED desk lamp. The standard version sells at $34.99. The premium version has more features and costs $18 from CJ (vs $11 for standard). You need to price the premium to maximize revenue from BOTH products.',
    challenge: 'How would you price the premium to maximize total revenue? Consider: the premium\'s standalone value, its effect on standard model sales, and the psychology of product line pricing.',
    optimalApproach: 'Price the premium at $59.99 (not $49.99). Counterintuitive, but the premium serves two roles: (1) Its own sales at high margin. (2) Making the $34.99 standard look like a great deal (anchor effect). At $49.99, the standard looks "almost as good for $15 less" — cannibalizes premium sales. At $59.99, the gap is large enough that: price-sensitive buyers feel smart getting the standard, and quality-focused buyers feel the premium is justified. Add a "compare" table showing features side by side. Consider adding a $79.99 "Ultimate" bundle as a price anchor that makes $59.99 look reasonable.',
    keyInsights: [
      'Premium products anchor the standard — making it look like better value',
      'The price gap between tiers matters more than absolute price',
      'A decoy option (highest price) can make the mid-tier look like the best deal',
      'Product line pricing optimizes total revenue, not individual product revenue',
    ],
    commonMistakes: [
      'Pricing the premium too close to standard (cannibalization)',
      'Not adding a feature comparison table (customers need to see the difference)',
      'Pricing based only on cost markup without considering positioning',
      'Forgetting that the premium lifts standard sales through anchoring',
    ],
    requiresCatalog: false,
    nextLevel: ['CS-001'],
  },

  // Store Design (5 scenarios)
  {
    id: 'CS-011',
    tier: 0,
    category: 'store_design',
    difficulty: 1,
    title: 'The Store Name Game',
    context: 'You\'re launching a dropshipping store focused on home office accessories. You need a store name that works as a brand. Your shortlist: "OfficeHub365", "DeskCraft Co.", "Modern Workspace", "JD\'s Office Supplies".',
    challenge: 'Evaluate each name. Which is strongest and why? What makes a good dropshipping store name? Propose a better name if none of these work.',
    optimalApproach: 'Evaluation: "OfficeHub365" — generic, sounds like a software tool, forgettable. "DeskCraft Co." — BEST option. Suggests craftsmanship, "Co." adds legitimacy, memorable, works as a brand. "Modern Workspace" — too generic, hard to trademark, describes a category not a brand. "JD\'s Office Supplies" — personal names limit growth, "supplies" is commodified. Good store names: (1) Suggest quality without describing the product literally. (2) Are short and memorable. (3) Work as a domain and social handle. (4) Don\'t limit future product expansion. (5) Sound like a real brand, not a dropshipping store.',
    keyInsights: [
      'Brand names suggest quality — category descriptions sound like marketplaces',
      'Short, memorable names that work across all platforms (domain, social, logo)',
      'Adding "Co.", "Studio", or "Supply" can add perceived legitimacy',
      'Names should allow product expansion — don\'t box yourself into one category',
    ],
    commonMistakes: [
      'Using personal names that limit brand perception and resale value',
      'Choosing overly descriptive names that sound generic',
      'Not checking domain availability and social handle availability first',
      'Picking names that are hard to spell or pronounce',
    ],
    requiresCatalog: false,
    nextLevel: ['CS-012'],
  },
  {
    id: 'CS-012',
    tier: 0,
    category: 'store_design',
    difficulty: 2,
    title: 'The Product Page Anatomy',
    context: 'You have a product: a bamboo monitor stand with built-in USB hub ($14 CJ cost, selling at $44.99). You have 5 product images from CJ. You need to build a product page that converts visitors to buyers.',
    challenge: 'Design the anatomy of a high-converting product page. What goes above the fold? Below the fold? What copy elements are essential? What would you add beyond what CJ provides?',
    optimalApproach: 'Above the fold: (1) Hero image showing product in a styled desk setup (not white background). (2) Product title with key benefit ("Bamboo Monitor Stand — Declutter Your Desk"). (3) Price with crossed-out "compare at" price. (4) Star rating (even empty state counts). (5) Key features as icon bullets (3 max). (6) Add to Cart button. Below the fold: (1) Lifestyle image gallery (product in use). (2) Features section with benefit-oriented copy (not specs). (3) Size/dimensions with visual reference. (4) FAQ section addressing objections (shipping time, returns, quality). (5) Customer reviews. Beyond CJ images: shoot your own or use mockup tools. CJ images are also used by every other seller — same images = same store perception.',
    keyInsights: [
      'Above-the-fold content determines if visitors scroll — hero image is the most important element',
      'Benefits sell, features inform — "Declutter your desk" beats "15.7 x 9.4 inches"',
      'FAQs preemptively address objections that prevent purchase',
      'Unique images differentiate you from every other store selling the same CJ product',
    ],
    commonMistakes: [
      'Using only CJ-provided white background images (same as every competitor)',
      'Writing feature-focused copy instead of benefit-focused copy',
      'Not addressing the #1 objection upfront (usually shipping time for dropshipping)',
      'Cluttering above-the-fold with too much information',
    ],
    requiresCatalog: false,
    nextLevel: ['CS-013', 'CS-014'],
  },
  {
    id: 'CS-013',
    tier: 0,
    category: 'store_design',
    difficulty: 2,
    title: 'The Trust Builder',
    context: 'A potential customer lands on your store for the first time. They\'ve never heard of you. Your store sells home organization products at premium prices ($35-$65). They\'re used to buying from Amazon. You have 8 seconds before they leave.',
    challenge: 'What trust signals must your store communicate in the first 8 seconds? What elements make a dropshipping store feel like a legitimate brand versus a fly-by-night operation? Be specific.',
    optimalApproach: 'First 8 seconds: (1) Professional logo (not text-only). (2) Clean, fast-loading design (slow = scammy). (3) High-quality hero image (not stock photos). (4) Social proof above the fold (review count, "10,000+ happy customers"). (5) Trust badges (secure checkout, money-back guarantee icons). Long-term trust elements: (6) "About Us" page with a real story (not generic). (7) Clear shipping and return policies (easy to find). (8) Real customer photos in reviews. (9) Professional product photography. (10) Active social media links (dead socials = red flag). (11) Contact information (email + response time). The key insight: trust is built by consistency across every touchpoint, not any single element.',
    keyInsights: [
      'Trust is the #1 conversion factor for unknown brands — more important than price',
      'Professional design is table stakes — poor design = immediate exit',
      'Social proof (reviews, customer count) is the fastest trust builder',
      'Accessibility of policies (shipping, returns) signals confidence and legitimacy',
    ],
    commonMistakes: [
      'Using stock photos that feel generic and impersonal',
      'Hiding shipping times or return policies (creates suspicion)',
      'No About page or a generic one that reads like AI wrote it',
      'Dead social media links or no social presence at all',
    ],
    requiresCatalog: false,
    nextLevel: ['CS-014', 'CS-015'],
  },
  {
    id: 'CS-014',
    tier: 0,
    category: 'store_design',
    difficulty: 3,
    title: 'The Collection Strategy',
    context: 'Your store sells 12 products from CJ, all in the desk accessories niche. Currently they\'re all in one "Shop All" page. You notice most visitors browse 1-2 products and leave. Average time on site is 45 seconds.',
    challenge: 'Reorganize these products into collections that increase browsing time and average order value. How many collections? What logic? How do collections affect the customer journey?',
    optimalApproach: 'Create 3-4 themed collections, not category collections: (1) "The Minimalist Desk" — clean-line products, neutral colors. (2) "Productivity Essentials" — functional items that solve workflow problems. (3) "Gift-Ready" — products that work as gifts with premium feel. (4) "Under $35" — price-anchored collection for budget-conscious shoppers. Each collection tells a story and creates a shopping context. On the homepage, feature collections as visual blocks (not product lists). Each collection page should cross-link to related products in other collections. This transforms random browsing into curated discovery — visitors explore 3-4 products instead of 1-2.',
    keyInsights: [
      'Story-based collections ("The Minimalist Desk") outperform category collections ("Stands")',
      'Collections create a browsing journey that increases time on site and AOV',
      'Price-anchored collections ("Under $35") capture different buyer segments',
      'Cross-linking between collections creates a web of discovery paths',
    ],
    commonMistakes: [
      'Creating collections based on product type instead of customer intent',
      'Having only one "Shop All" page with no curation',
      'Too many collections (more than 5 creates decision paralysis)',
      'Not featuring collections prominently on the homepage',
    ],
    requiresCatalog: false,
    nextLevel: ['CS-015'],
  },
  {
    id: 'CS-015',
    tier: 0,
    category: 'store_design',
    difficulty: 3,
    title: 'The Mobile-First Moment',
    context: 'Your analytics show 78% of visitors are on mobile. Your store was designed desktop-first and "works on mobile" but isn\'t optimized for it. Mobile conversion rate is 0.8% vs 2.4% desktop. That\'s money on the table.',
    challenge: 'What specific changes would you make to optimize the mobile experience? Think about the entire journey: landing → browsing → product page → cart → checkout. What mobile-specific UX principles apply?',
    optimalApproach: 'Key mobile optimizations: (1) LANDING: Sticky header with cart icon and hamburger menu. Hero should be one compelling image + one CTA. Remove anything that requires horizontal scrolling. (2) BROWSING: Single-column product grid (2-column max). Large tap targets. Quick-add buttons visible without scrolling into the card. (3) PRODUCT PAGE: Swipeable image gallery. Sticky "Add to Cart" bar at bottom. Collapse description into expandable sections. Size/variant selectors must be thumb-friendly. (4) CART: Slide-out drawer (not full page redirect). Easy quantity edit. Visible totals at all times. (5) CHECKOUT: Guest checkout default. Auto-fill everything. Apple Pay / Google Pay at top. Minimize form fields. The principle: every tap is a potential exit point — minimize taps to purchase.',
    keyInsights: [
      'Every additional tap on mobile is a 10-20% drop in conversion',
      'Sticky Add to Cart bar is the single highest-impact mobile optimization',
      'Mobile users scroll vertically — never require horizontal interaction',
      'Apple Pay / Google Pay can reduce checkout friction by 50%',
    ],
    commonMistakes: [
      'Testing only on desktop and assuming mobile "works"',
      'Small tap targets that cause mis-taps (frustration = exit)',
      'Full-page cart instead of slide-out drawer (loses browsing context)',
      'Requiring account creation before checkout (mobile users won\'t do it)',
    ],
    requiresCatalog: false,
    nextLevel: ['CS-001'],
  },
];

// All Tier 0 scenarios combined
export const allTier0Scenarios = tier0Scenarios;

// Get scenarios by tier
export function getScenariosByTier(tier: number): CommerceScenario[] {
  switch (tier) {
    case 0: return allTier0Scenarios;
    case 1: return tier1Scenarios;
    case 2: return tier2Scenarios;
    case 3: return tier3Scenarios;
    default: return [];
  }
}

// Get scenario by ID
export function getScenarioById(id: string): CommerceScenario | undefined {
  return [...allTier0Scenarios, ...tier1Scenarios, ...tier2Scenarios, ...tier3Scenarios].find(s => s.id === id);
}
