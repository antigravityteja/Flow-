// FLOW — Flavours on Wheels Official Menu Source of Truth
const INITIAL_MENU_CATEGORIES = [
  {
    id: 'cat-1',
    name: 'BURGERS',
    display_order: 1,
    items: [
      { id: 'b1', name: 'Classic Veg Burger', price: 120, description: null },
      { id: 'b2', name: 'Veg Cheese Burger', price: 150, description: null },
      { id: 'b3', name: 'Crispy Chicken Patty Burger', price: 150, description: null },
      { id: 'b4', name: 'Chicken Cheese Burger', price: 180, description: null }
    ]
  },
  {
    id: 'cat-2',
    name: 'FRENCH FRIES',
    display_order: 2,
    items: [
      { id: 'f1', name: 'Regular', price: 120, description: null },
      { id: 'f2', name: 'Loaded Fries (Veg)', price: 150, description: null },
      { id: 'f3', name: 'Loaded Fries (Chicken)', price: 200, description: null }
    ]
  },
  {
    id: 'cat-3',
    name: 'MOMOS',
    display_order: 3,
    items: [
      { id: 'm1', name: 'Veg Steamed Momos', price: 120, description: null },
      { id: 'm2', name: 'Paneer Steamed Momos', price: 140, description: null },
      { id: 'm3', name: 'Chicken Steamed Momos', price: 140, description: null },
      { id: 'm4', name: 'Veg Fried Momos', price: 140, description: null },
      { id: 'm5', name: 'Paneer Fried Momos', price: 160, description: null },
      { id: 'm6', name: 'Chicken Fried Momos', price: 160, description: null },
      { id: 'm7', name: 'Veg Kurkure Momos', price: 160, description: null },
      { id: 'm8', name: 'Paneer Kurkure Momos', price: 180, description: null },
      { id: 'm9', name: 'Chicken Kurkure Momos', price: 180, description: null }
    ]
  },
  {
    id: 'cat-4',
    name: 'FRIED CHICKEN QUICK BITES',
    display_order: 4,
    items: [
      { id: 'c1', name: 'Chicken Popcorn (10 pcs)', price: 180, description: null },
      { id: 'c2', name: 'Chicken Crunchy Bites (10 pcs)', price: 180, description: null },
      { id: 'c3', name: 'Chicken Boneless Strips (5 pcs)', price: 180, description: null },
      { id: 'c4', name: 'Chicken Wings (4 pcs)', price: 180, description: null },
      { id: 'c5', name: 'Chicken Drumsticks (2 pcs)', price: 180, description: null },
      { id: 'c6', name: 'Chicken Nuggets (6 pcs)', price: 180, description: null }
    ]
  },
  {
    id: 'cat-5',
    name: 'ROLLS N WRAPS',
    display_order: 5,
    items: [
      { id: 'r1', name: 'Veg Roll', price: 120, description: null },
      { id: 'r2', name: 'Paneer Grilled Roll', price: 150, description: null },
      { id: 'r3', name: 'Chicken Tikka Grilled Roll', price: 180, description: null }
    ]
  },
  {
    id: 'cat-6',
    name: 'VEG QUICK BITES',
    display_order: 6,
    items: [
      { id: 'v1', name: 'Veg Cheese Balls (6 pcs)', price: 150, description: null },
      { id: 'v2', name: 'Veg Cheese Nuggets (6 pcs)', price: 150, description: null },
      { id: 'v3', name: 'Veg Nuggets (10 pcs)', price: 150, description: null },
      { id: 'v4', name: 'Potato Smiles (10 pcs)', price: 150, description: null }
    ]
  },
  {
    id: 'cat-7',
    name: 'SHAWARMAS',
    display_order: 7,
    items: [
      { id: 's1', name: 'Chicken Shawarma with Salad', price: 150, description: null },
      { id: 's2', name: 'Chicken Stuffed Flow Special Shawarma', price: 180, description: null }
    ]
  },
  {
    id: 'cat-8',
    name: 'MOJITOS',
    display_order: 8,
    items: [
      { id: 'j1', name: 'Ocean Blue Mojito', price: 100, description: null },
      { id: 'j2', name: 'Green Lemon & Mint Mojito', price: 100, description: null },
      { id: 'j3', name: 'Virgin Mojito', price: 100, description: null }
    ]
  },
  {
    id: 'cat-9',
    name: 'DESSERTS',
    display_order: 9,
    items: [
      { id: 'd1', name: 'Maska Bun', price: 100, description: null },
      { id: 'd2', name: 'Chocolate Donut', price: 80, description: null },
      { id: 'd3', name: 'Plain Donut', price: 50, description: null },
      { id: 'd4', name: 'Flow Special Cakes', price: 150, description: '(based on availability)' }
    ]
  }
];
