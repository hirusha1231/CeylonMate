// High-Resolution Curated Photography for CeylonMate Luxury Platform

export const HERO_VIDEO_FALLBACK = "https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&w=2000&q=85"; // Sigiriya Rock Fortress sunrise

export const DESTINATION_IMAGES = {
  sigiriya: "https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&w=1200&q=80", // Sigiriya Ancient Citadel
  nuwaraEliya: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80", // Tea Country Hill Bungalow
  galle: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1200&q=80", // Galle Dutch Fort Lighthouse
  yala: "https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=1200&q=80", // Wild Leopard Safari
  ella: "https://images.unsplash.com/photo-1578637387939-43c525550085?auto=format&fit=crop&w=1200&q=80", // Nine Arch Bridge Train
  kandy: "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80", // Kandy Lake & Temple
  mirissa: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80", // Southern Coast Riviera
};

export const FLEET_IMAGES = {
  kdhVan: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80", // Luxury Executive VIP Van
  mercedes: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1000&q=80", // Mercedes-Benz E-Class Sedan
  landCruiser: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1000&q=80", // Toyota Land Cruiser V8 Safari Edition
  luxuryCoaster: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=1000&q=80", // Luxury Minibus
};

export const SIGNATURE_PACKAGES_DATA = [
  {
    id: "cultural-heartland",
    title: "The Cultural Heartland & Ancient Wonders",
    duration: "6 Days / 5 Nights",
    image: DESTINATION_IMAGES.sigiriya,
    region: "Cultural Heartland",
    highlights: ["Sigiriya Fortress Sunrise Walk", "Dambulla Cave Temples", "Polonnaruwa Royal Ruins", "Kandy Sacred Relic Sanctuary"],
    priceUsd: 1450,
    description: "Immerse in three millennia of Royal Sinhalese heritage with private expert archeological curators and luxury heritage villa stays.",
    itinerary: [
      { day: 1, title: "Arrival & Private Escort to Cultural Triangle", detail: "VIP airport reception, private luxury transfer to Sigiriya Water Gardens Resort." },
      { day: 2, title: "Sigiriya Citadel & Dambulla Gold Temple", detail: "Early morning ascension of Sigiriya Rock before heat, followed by private lunch in Spice Garden." },
      { day: 3, title: "Ancient Capital of Polonnaruwa", detail: "Curated cycling tour of the 12th-century Royal Palace ruins and Gal Vihara granite Buddha statues." },
      { day: 4, title: "Scenic Highlands Transit to Kandy", detail: "Private chauffeur transfer via Matale spice hills to Kandy Lake resort." },
      { day: 5, title: "Sacred Relic Temple & Botanical Royal Gardens", detail: "Private evening blessing at Temple of the Tooth and Peradeniya Orchid House walk." },
      { day: 6, title: "Departure Escort to Colombo", detail: "Gourmet lunch in Colombo 02 prior to departure flight escort." },
    ]
  },
  {
    id: "highlands-tea-rails",
    title: "The Highlands of Tea & Misty Rails",
    duration: "4 Days / 3 Nights",
    image: DESTINATION_IMAGES.nuwaraEliya,
    region: "Highlands",
    highlights: ["Colonial Tea Bungalow Stays", "First-Class Scenic Train Ride", "Ella Pekoe Trail Trek", "Nuwara Eliya Golf & High Tea"],
    priceUsd: 1180,
    description: "Traverse emerald hill-country slopes, colonial tea estates, and scenic mountain railway routes with terrain-aware 1.25x precision.",
    itinerary: [
      { day: 1, title: "Chauffeur Climb to Ceylon Tea Bungalows", detail: "Ascend through misty tea estates with scenic waterfall stopovers." },
      { day: 2, title: "Private Tea Master Tasting & Plantation Walk", detail: "Pluck hand-selected two-leaves-and-a-bud with master tea tasters." },
      { day: 3, title: "First-Class Scenic Rail Ride to Ella", detail: "Board the iconic blue hill railway across Nine Arch Bridge." },
      { day: 4, title: "Little Adam's Peak & Departure Transit", detail: "Sunrise mountain trail hike followed by luxury vehicle transfer." },
    ]
  },
  {
    id: "untamed-deep-south",
    title: "Untamed Deep South & Yala Leopards",
    duration: "5 Days / 4 Nights",
    image: DESTINATION_IMAGES.yala,
    region: "Yala & Deep South",
    highlights: ["Big Game Private Safaris in Yala Block 1", "Udawalawe Elephant Sanctuary", "Luxury Safari Tented Lodges", "Bundala Coastal Birding"],
    priceUsd: 1620,
    description: "Track elusive Sri Lankan leopards and wild Asian elephant herds with certified master wildlife naturalists in private 4x4 safaris.",
    itinerary: [
      { day: 1, title: "Transfer to Yala Border Sanctuary", detail: "Settle into luxury safari tented camp with evening campfire dining." },
      { day: 2, title: "Dawn Leopard Tracking in Yala Block 1", detail: "Private modified 4x4 safari with certified naturalist guide." },
      { day: 3, title: "Udawalawe Elephant Transit & Rehabilitation Center", detail: "Observe orphaned elephant feeding and wild herd migrations." },
      { day: 4, title: "Bundala Lagoon Wetlands Wildlife Cruise", detail: "Spot migratory flamingoes, crocodiles, and coastal raptors." },
      { day: 5, title: "Coastline Chauffeur Transfer to Airport", detail: "Scenic ocean highway ride back with artisan coconut refreshments." },
    ]
  },
  {
    id: "southern-riviera",
    title: "The Southern Riviera & Heritage Forts",
    duration: "5 Days / 4 Nights",
    image: DESTINATION_IMAGES.galle,
    region: "Southern Riviera",
    highlights: ["Galle Dutch Fort UNESCO Walk", "Private Mirissa Whale Watching Yacht", "Secluded Beach Hideaways", "Stilt Fisherman Sunset"],
    priceUsd: 1350,
    description: "Relax along coconut-fringed golden beaches, colonial fort bastion ramparts, and blue ocean waters home to Blue Whales.",
    itinerary: [
      { day: 1, title: "Ocean Highway Chauffeur Transit to Galle", detail: "Arrive at 17th-century restored Dutch merchant villa inside Galle Fort." },
      { day: 2, title: "Curated Galle Fort Bastion & Architecture Walk", detail: "Explore ramparts, artisan jewelers, and colonial lighthouses." },
      { day: 3, title: "Private Yacht Blue Whale Expedition in Mirissa", detail: "Sail offshore with marine biologists to spot Blue Whales and dolphins." },
      { day: 4, title: "Coastal Relaxation & Sunset Stilt Fishing", detail: "Unwind on secret coral cove beaches with fresh coconut cocktails." },
      { day: 5, title: "Farewell Sri Lanka Escort", detail: "Private transfer on Southern Expressway to Colombo International Airport." },
    ]
  }
];
