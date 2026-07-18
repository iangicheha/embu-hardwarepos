/**
 * product-images.ts
 *
 * Hand-curated map of product name (lowercased, trimmed) -> image filename
 * served from /products/<filename>.png.
 *
 * Add new entries here when:
 *   - a new product image is added to frontend/public/products/
 *   - an existing product needs to be matched to an image
 *
 * Matching is case-insensitive and exact. If a name isn't in this map, the
 * Orders tab falls back to the gray placeholder.
 */

export const PRODUCT_IMAGE_MAP: Record<string, string> = {
  // --- Adjustable spanners (all sizes) ---
  "adjustable spanner 8 inch": "adjustablespanner.png",
  "adjustable spanner 10 inch": "adjustablespanner.png",
  "adjustable spanner 12 inch": "adjustablespanner.png",
  "adjustable spanner 14 inch": "adjustablespanner.png",

  // --- Generic / un-categorised entries ---
  "cement": "simbacement.png",
  "fork jembe": "simbacement.png",
  "wall paint 4l": "lubricationoil.png",
  "steel wire": "ropes.png",
  "claw hammer": "hammer.png",

  // --- Valves & taps ---
  "ball valve - cistern": "ballvalve.png",
  "brass ball valve - lirlee": "brassballvalve.png",
  "brass gate valve - lirlee": "brassballvalve.png",
  "brass gate valve - pegler": "brassballvalve.png",
  "ppr gate valve": "pprgatevalve.png",
  "plastic tap": "plastictap.png",
  "wall tap": "walltap.png",
  "wall tap - star handle": "walltap.png",
  "water tap - lirlee": "walltap.png",
  "water tap - pegler": "walltap.png",
  "cartoon lockable tap": "cartoonlockabletap.png",

  // --- Sinks ---
  "sink - double hole": "doublebowlsink.png",
  "double bowl sink": "doublebowlsink.png",
  "sink - single one hole": "sinkonehole.png",
  "sink one hole": "sinkonehole.png",
  "sink - single medium": "sinkonehole.png",
  "sink - light heavy": "sinkonehole.png",

  // --- Hammers (all variants) ---
  "hammer (ksh 1200 type) - new stock": "hammer.png",
  "hammer (ksh 500 type) - new stock": "hammer.png",
  "hammer - juakali": "juakalihammer.png",
  "hammer - juakali - new stock": "juakalihammer.png",
  "hammer - rubber handle": "hammer.png",
  "hammer - rubber handle (1200)": "hammer.png",
  "hammer - small (ksh 250 type)": "hammer.png",
  "hammer": "hammer.png",
  "tag hammer": "taghammer.png",

  // --- Pliers (all variants) ---
  "combination pliers - big": "combinationpliers.png",
  "combination pliers - small": "combinationpliers.png",
  "pliers - intco": "pliersingco.png",
  "pliers - knicker (ksh 220 type)": "knickerpliers.png",
  "pliers - knicker (ksh 250 type)": "knickerpliers.png",
  "pliers 6 inch - fuxiang": "pliersfuxiang.png",
  "pliers 8 inch - fuxiang": "pliersfuxiang.png",
  "combination pliers": "combinationpliers.png",

  // --- Spanners ---
  "open end spanner 10x11 - chrome": "openendspanner.png",
  "open end spanner 25x28 - normal": "openendspanner.png",
  "open end spanner": "openendspanner.png",
  "ring spanner 12x13 - normal": "ringspanner.png",
  "ring spanner 14x15 - chrome": "ringspanner.png",
  "ring spanner 14x15 - normal": "ringspanner.png",
  "ring spanner": "ringspanner.png",
  "single ring/open end spanner 14x14 - chrome": "singleopenendspanner.png",
  "single open end spanner": "singleopenendspanner.png",

  // --- Screwdrivers ---
  "screwdriver - baku": "screwdriverbaku.png",
  "screwdriver - exclusive": "screwdriverinco.png",
  "screwdriver - fine durable": "screwdriverfinedurable.png",
  "screwdriver - goodmate": "screwdriverinco.png",
  "screwdriver - intco": "screwdriverinco.png",
  "screwdriver - mosi": "screwdriverinco.png",
  "screwdriver": "screwdriverinco.png",

  // --- Tape measures ---
  "tape measure 3m - bsmtis brand": "tapemeasurebsmtis.png",
  "tape measure 3m - knicker brand": "tapemeasureknicker.png",
  "tape measure 5m - kenyos brand": "tapemeasurekenyos.png",
  "tape measure 5m - knicker brand": "tapemeasureknicker.png",
  "tape measure 7.5m - knicker brand": "tapemeasureknicker.png",
  "tape measure": "tapemeasureknicker.png",

  // --- Padlocks (all sizes) ---
  "padlock": "padlock.png",
  "padlock 25mm": "padlock.png",
  "padlock 32mm": "padlock.png",
  "padlock 38mm": "padlock.png",
  "padlock 50mm": "padlock.png",
  "padlock 63mm": "padlock.png",

  // --- Screws & nails ---
  "concrete nails 1 inch (pack)": "concretenails.png",
  "concrete nails 1.5 inch (pack)": "concretenails.png",
  "concrete nails 2 inch (pack)": "concretenails.png",
  "concrete nails 2.5 inch (pack)": "concretenails.png",
  "concrete nails 3 inch (pack)": "concretenails.png",
  "concrete nails 4 inch (pack)": "concretenails.png",
  "concrete nails": "concretenails.png",
  "gypsum screws 40mm (pack)": "gypsumscwer.png",
  "mdf screws 25mm (pack)": "mdfscrew.png",
  "mdf screw": "mdfscrew.png",
  "wood screw 1.5 inch (packet)": "woodscrew.png",
  "wood screw 3 inch (packet)": "woodscrew.png",
  "wood screw": "woodscrew.png",
  "star screw (ksh 220 type)": "woodscrew.png",
  "star screw (ksh 70 type)": "woodscrew.png",
  "flat screw": "woodscrew.png",

  // --- Window / lock fittings ---
  "bed nuts": "bednuts.png",
  "bed nuts - juakali": "bednuts.png",
  "lock bolt - juakali": "charpin.png",
  "lock bolt - new": "charpin.png",
  "lock bolt juakali (ksh 100 type)": "charpin.png",
  "lock bolt juakali (ksh 120 type)": "charpin.png",
  "lock bolt juakali (ksh 210 type)": "charpin.png",
  "lock bolt juakali (ksh 50 type)": "charpin.png",
  "tower bolt": "towelbolt.png",
  "chair pins (pack)": "charpin.png",
  "window fastener": "windowfastener.png",
  "window stay": "windowstay.png",

  // --- Plumbing / bathroom fixtures ---
  "angle valve": "walltap.png",
  "flush handle - heavy gauge": "walltap.png",
  "flush handle - light gauge": "walltap.png",
  "high level flush": "plastictap.png",
  "syphon cistern": "plastictap.png",
  "top flush plastic cistern": "plastictap.png",
  "plastic cistern fitting": "plastictap.png",
  "shower head": "walltap.png",
  "toilet bowl": "sinkonehole.png",
  "toilet pan": "sinkonehole.png",
  "toilet pump - big": "sinkonehole.png",
  "toilet pump - small": "sinkonehole.png",
  "toilet seat cover": "sinkonehole.png",
  "waste gully trap": "sinkonehole.png",
  "water tank float valve - lirlee": "ballvalve.png",
  "water tank float valve - peckler": "ballvalve.png",
  "bathroom fittings (general)": "walltap.png",
  "flex tube metallic - long": "sinkonehole.png",
  "flex tube metallic - small": "sinkonehole.png",
  "flexible cable 1/2 by 30": "sinkonehole.png",
  "flexible magic connector": "sinkonehole.png",
  "connection tubes": "sinkonehole.png",
  "super tubes": "sinkonehole.png",
  "plug": "plastictap.png",
  "plug - medium": "plastictap.png",
  "plug - small": "plastictap.png",
  "sink hole": "sinkonehole.png",
  "male adapter": "pprgatevalve.png",
  "male adapter 3/4 by 1/2": "pprgatevalve.png",
  "male elbow 3/4 by 1/2": "pprgatevalve.png",
  "male tee 1/2 by 1/2": "pprgatevalve.png",
  "male-female tee 3/4 by 1/2": "pprgatevalve.png",
  "female adapter 3/4 by 1/2": "pprgatevalve.png",
  "female adapter 3/4 by 3/4": "pprgatevalve.png",
  "female elbow 3/4 by 1/2": "pprgatevalve.png",
  "female tee 1/2 by 1/2": "pprgatevalve.png",
  "female tee 3/4 by 1/2": "pprgatevalve.png",
  "female tee 3/4 by 3/4": "pprgatevalve.png",
  "ppr elbow 3/4": "pprgatevalve.png",
  "ppr plain socket 3/4": "pprgatevalve.png",
  "ppr tee 3/4": "pprgatevalve.png",
  "pvc fitting and piping 100ml": "pprgatevalve.png",
  "pvc fitting and piping 50ml": "pprgatevalve.png",
  "pvc male connector 1/2 inch": "pprgatevalve.png",
  "pvc male connector 3/4 inch": "pprgatevalve.png",
  "pvc socket 1/2 inch": "pprgatevalve.png",
  "pvc socket 3/4 inch": "pprgatevalve.png",
  "piping 1 1/2 inch": "pprgatevalve.png",
  "piping 1 1/4 inch": "pprgatevalve.png",
  "piping 2 inch": "pprgatevalve.png",
  "big bend 1 inch": "pprgatevalve.png",
  "t-pipe 1/2 inch": "pprgatevalve.png",
  "second pile 1/2 inch": "pprgatevalve.png",
  "second pile 3/4 inch": "pprgatevalve.png",
  "contact pipe 100ml": "pprgatevalve.png",
  "bottle trap 1 1/2 inch": "sinkonehole.png",
  "thread seal tape - big": "plastictap.png",
  "thread seal tape - small": "plastictap.png",

  // --- Garden tools ---
  "axe head": "simbacement.png",
  "fork jembe head (type 1)": "simbacement.png",
  "fork jembe head (type 2)": "simbacement.png",
  "jembe head": "simbacement.png",
  "pickaxe head": "simbacement.png",
  "panga - alligator": "taghammer.png",
  "panga - knicker big": "taghammer.png",
  "panga - knicker small": "taghammer.png",
  "spade": "simbacement.png",
  "slasher": "taghammer.png",
  "raking": "simbacement.png",
  "rake (full, with handle)": "simbacement.png",
  "rake head only": "simbacement.png",
  "curved pruning saw": "wirebrush.png",
  "hack saw": "wirebrush.png",
  "handsaw wood 16 inch": "wirebrush.png",
  "handsaw wood 20 inch": "wirebrush.png",
  "handsaw wood 24 inch": "wirebrush.png",
  "other saw": "wirebrush.png",
  "fencing shear - plastic handle": "wirebrush.png",
  "fencing shear - wood handle": "wirebrush.png",
  "sprayer": "lubricationoil.png",

  // --- Hand tools ---
  "iron jack plane": "ironjackplane.png",
  "chisel scraper": "chieselscrapper.png",
  "file (120 type)": "files.png",
  "file (150 type)": "files.png",
  "file": "files.png",
  "wire brush": "wirebrush.png",
  "spirit level (ksh 170 type)": "spiritlevel.png",
  "spirit level (ksh 200 type)": "spiritlevel.png",
  "spirit level (ksh 220 type)": "spiritlevel.png",
  "spirit level": "spiritlevel.png",
  "tile cutter": "tilecutter.png",
  "tin cutter - big": "tilecutter.png",
  "tin cutter - small": "tilecutter.png",
  "try square (type 1)": "trysquare.png",
  "try square (type 2)": "trysquare.png",
  "try square (type 3)": "trysquare.png",
  "try square": "trysquare.png",
  "stainless steel trowel": "stainlesssteeltowel.png",
  "stainless steel trowel - knicker (ksh 120 type)": "stainlesssteeltowel.png",
  "stainless steel trowel - knicker (ksh 150 type)": "stainlesssteeltowel.png",
  "trowel - juakali": "stainlesssteeltowel.png",
  "trowel - plastic handle": "stainlesssteeltowel.png",
  "steel trowel (price not provided)": "stainlesssteeltowel.png",
  "broom brush (brush only)": "wirebrush.png",
  "broom brush (ksh 450 type)": "wirebrush.png",

  // --- Building materials / adhesives ---
  "water proof cement": "simbacement.png",
  "simbacement": "simbacement.png",
  "simba cement": "simbacement.png",
  "battery water chloride oxide": "lubricationoil.png",
  "lubricating oil": "lubricationoil.png",
  "lubrication oil": "lubricationoil.png",
  "gasket maker (rtv silicon)": "lubricationoil.png",
  "gp silicon": "lubricationoil.png",
  "wood glue - type 1": "lubricationoil.png",
  "wood glue - type 2": "lubricationoil.png",
  "roof sealer - bodex 1kg": "lubricationoil.png",
  "roof sealer - bodex 200g": "lubricationoil.png",
  "roof sealer - bodex 300g": "lubricationoil.png",
  "polythene bag (1m roll)": "ropes.png",
  "chicken wire (1m roll)": "ropes.png",

  // --- Ropes ---
  "rope (general)": "ropes.png",
  "rope (many colors) 16ply": "ropes.png",
  "rope (many colors) 42ply": "ropes.png",
  "rope 10x10": "ropes.png",
  "rope 6x10": "ropes.png",
  "rope 7x10": "ropes.png",
  "rope 8x10": "ropes.png",
  "rope 9x10": "ropes.png",
  "rope": "ropes.png",

  // --- Painting tools ---
  "paint brush 2 inch": "wirebrush.png",
  "paint brush 25mm": "wirebrush.png",
  "paint brush 3 inch": "wirebrush.png",
  "paint brush 3/4 inch": "wirebrush.png",
  "paint brush 4 inch": "wirebrush.png",
  "paint brush 5 inch": "wirebrush.png",
  "paint brush 6 inch": "wirebrush.png",
  "paint brush": "wirebrush.png",
  "paint roller": "wirebrush.png",
  "thinner 1 litre (brand a)": "lubricationoil.png",
  "thinner 1 litre (brand b)": "lubricationoil.png",
  "turpentine 1 litre": "lubricationoil.png",
  "turpentine 500ml": "lubricationoil.png",

  // --- Electrical items ---
  "bulb 5w": "lubricationoil.png",
  "bulb 7w": "lubricationoil.png",
  "bulb 9w": "lubricationoil.png",
  "black tape": "screwdriverbaku.png",
  "white tape": "screwdriverbaku.png",
  "cable clips 10mm (packet)": "charpin.png",
  "cable clips 12mm (packet)": "charpin.png",
  "cable clips 9mm (packet)": "charpin.png",
  "voltage tester": "screwdriverbaku.png",
  "electric coil": "screwdriverbaku.png",
  "junction box (black)": "screwdriverbaku.png",
  "lampholder": "screwdriverbaku.png",
  "double pole switch": "screwdriverbaku.png",
  "double switch box (black)": "screwdriverbaku.png",
  "double switch box (white)": "screwdriverbaku.png",
  "single socket": "screwdriverbaku.png",
  "socket double 2 gang": "screwdriverbaku.png",
  "single switch box (black)": "screwdriverbaku.png",
  "single switch box (white)": "screwdriverbaku.png",
  "switch 1 gang 2 way": "screwdriverbaku.png",
  "plugs": "screwdriverbaku.png",

  // --- Motorcycle & bicycle parts ---
  "bike battery": "lubricationoil.png",
  "bearing": "charpin.png",
  "brake shoes": "charpin.png",
  "motorcycle chain": "ropes.png",
  "motorcycle flasher": "screwdriverbaku.png",
  "turn signal": "screwdriverbaku.png",
  "signal bulb": "screwdriverbaku.png",
  "patches": "screwdriverbaku.png",
  "bicycle bell (ksh 150 type)": "charpin.png",
  "bicycle bell (ksh 200 type)": "charpin.png",

  // --- Brackets & hinges ---
  "butt hinge 2 inch": "charpin.png",
  "butt hinge 2.5 inch": "charpin.png",
  "jua kali hinge - big": "charpin.png",
  "jua kali hinge - small": "charpin.png",
  "steel hinge 4x3 inch": "charpin.png",
  "shelf bracket 10x12": "charpin.png",
  "shelf bracket 6x8": "charpin.png",
  "shelf bracket 8x10": "charpin.png",

  // --- Fasteners ---
  "expand nails with screw (pack)": "concretenails.png",
  "open screw hook (pack)": "charpin.png",
  "tapin screw 25mm (pack)": "mdfscrew.png",
  "tapin screw 40mm (pack)": "mdfscrew.png",

  // --- Household fittings ---
  "door lock - type 1": "padlock.png",
  "door lock - type 2": "padlock.png",
  "double curtain rod - with lock": "towelbolt.png",
  "double curtain rod - without lock": "towelbolt.png",
  "mop head": "wirebrush.png",

  // --- Safety ---
  "safety goggles": "safetygoggles.png",

  // --- Other ---
  "plumb bob": "plumbbob.png",
};

/**
 * Look up the image filename for a product. Returns the public URL path
 * (e.g. "/products/hammer.png") or null if no match.
 */
export function imageFor(productName: string): string | null {
  const key = productName.toLowerCase().trim();
  const file = PRODUCT_IMAGE_MAP[key];
  if (!file) return null;
  // Normalize: strip any leading slash and re-prefix so we always return a
  // canonical "/products/<filename>" path. Spaces are URL-encoded so filenames
  // with spaces (e.g. legacy "gypsum scwer.png") don't break the request.
  const normalized = file.replace(/^\/+/, "");
  return `/products/${encodeURIComponent(normalized)}`;
}
