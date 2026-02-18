export interface StoreTemplate {
  id: string;
  name: string;
  description: string;
  theme: {
    primary: string;
    bg: string;
    accent: string;
    font: string; // 'system' | 'serif' | 'mono'
    heroStyle: string; // 'banner' | 'minimal' | 'split'
    cardStyle: string; // 'minimal' | 'detailed' | 'overlay'
  };
  layoutConfig: {
    hero: boolean;
    gridCols: number; // 2, 3, or 4
    showBanner: boolean;
    roundedCards: boolean;
  };
}

export const storeTemplates: StoreTemplate[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean whitespace, focused on products',
    theme: { primary: '#111111', bg: '#ffffff', accent: '#6366f1', font: 'system', heroStyle: 'minimal', cardStyle: 'minimal' },
    layoutConfig: { hero: false, gridCols: 3, showBanner: false, roundedCards: false },
  },
  {
    id: 'bold',
    name: 'Bold',
    description: 'High-contrast, attention-grabbing',
    theme: { primary: '#ef4444', bg: '#0a0a0a', accent: '#fbbf24', font: 'system', heroStyle: 'banner', cardStyle: 'detailed' },
    layoutConfig: { hero: true, gridCols: 2, showBanner: true, roundedCards: true },
  },
  {
    id: 'luxury',
    name: 'Luxury',
    description: 'Dark backgrounds, gold accents, elegant',
    theme: { primary: '#1a1a2e', bg: '#0f0f0f', accent: '#d4af37', font: 'serif', heroStyle: 'split', cardStyle: 'overlay' },
    layoutConfig: { hero: true, gridCols: 3, showBanner: true, roundedCards: false },
  },
  {
    id: 'playful',
    name: 'Playful',
    description: 'Bright colors, rounded corners, fun',
    theme: { primary: '#8b5cf6', bg: '#fef3c7', accent: '#ec4899', font: 'system', heroStyle: 'banner', cardStyle: 'detailed' },
    layoutConfig: { hero: true, gridCols: 3, showBanner: false, roundedCards: true },
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Corporate clean, trustworthy blue tones',
    theme: { primary: '#1e40af', bg: '#f8fafc', accent: '#059669', font: 'system', heroStyle: 'minimal', cardStyle: 'minimal' },
    layoutConfig: { hero: false, gridCols: 4, showBanner: false, roundedCards: false },
  },
];
