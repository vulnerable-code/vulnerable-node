// Seed data. Geek merch, same spirit as the original vulnerable-node catalog.

const products = [
  { name: "Mechanical Keyboard MK-ULTRA", description: "Blue switches loud enough to be heard in the standup next door. PBT keycaps, USB-C, no RGB because RGB is for other people.", price_cents: 12900, image: "keyboard.svg", tags: ["hardware", "keyboards", "loud"] },
  { name: "Rubber Duck Pro", description: "Premium desk duck for rubber-duck debugging. Floats in coffee by accident. Explains your bug by saying nothing.", price_cents: 999, image: "duck.svg", tags: ["desk", "debugging", "gift"] },
  { name: "Segfault Mug", description: "Ceramic mug, 350ml. Prints 'Segmentation fault (core dumped)' on the bottom so you find out after the last sip.", price_cents: 1400, image: "mug.svg", tags: ["desk", "cups", "gift"] },
  { name: "Cable Spaghetti 5kg", description: "Five kilograms of assorted USB, HDMI and mystery cables. Every box is a surprise. No returns, obviously.", price_cents: 2500, image: "cables.svg", tags: ["hardware", "cables", "chaos"] },
  { name: "Sticker Pack: Hexadecimal", description: "40 vinyl stickers: 0x00 to 0x27 plus bonus 0xCAFEBABE. Weatherproof, laptop-approved.", price_cents: 800, image: "stickers.svg", tags: ["stickers", "gift", "cheap"] },
  { name: "LED Badge of Shame", description: "Programmable LED badge. Preloaded text: 'it works on my machine'. USB rechargeable.", price_cents: 1900, image: "badge.svg", tags: ["hardware", "wearables", "gag"] },
  { name: "The USB Rocket", description: "USB-powered desk rocket. Functionality: none. Usability: none. The best choice!", price_cents: 2200, image: "rocket.svg", tags: ["hardware", "gag", "classic"] },
  { name: "Potty Putter", description: "The game for the avid golfers. Practice your putt where you spend your best thinking time.", price_cents: 2000, image: "putter.svg", tags: ["gag", "bathroom", "classic"] },
  { name: "Phone Fingers", description: "Phone fingers work perfectly with touchscreens and prevent fingerprints and smudges. 20 disposable caps.", price_cents: 300, image: "phonefingers.svg", tags: ["gag", "classic", "cheap"] },
  { name: "Daddle", description: "Be the best father with Daddle: dad's saddle for horsing around. Weight limit: one (1) small child.", price_cents: 4900, image: "daddle.svg", tags: ["gag", "classic", "parenting"] },
  { name: "Walker Watermelons", description: "Take a walk with your watermelons and make them feel comfortable. Leash included, watermelon not.", price_cents: 1500, image: "watermelon.svg", tags: ["gag", "classic", "summer"] },
  { name: "HD Vision", description: "Reality is not enough for you? Improve your life with the HD vision glasses. Colors pop, disappointment guaranteed.", price_cents: 600, image: "glasses.svg", tags: ["gag", "classic", "cheap"] },
];

const users = [
  { username: "alice",  password: "alice123",  email: "alice@example.com",  role: "customer" },
  { username: "bob",    password: "bob123",    email: "bob@example.com",    role: "customer" },
  { username: "admin",  password: "admin123",  email: "admin@nodebazaar.local", role: "admin" },
];

module.exports = { products, users };