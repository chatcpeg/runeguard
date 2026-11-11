# -*- coding: utf-8 -*-
"""Build tools/art/production_v2.json: battle-scene art + monsters of the 3 maps (docs/PROPOSAL-maps-daily.md).

Use:  python make_v2.py  →  python gen_art.py production_v2.json
Output images go to D:\\Comfy-Desktop\\ComfyUI-Shared\\output\\Runeguard\\art\\prod_v2\\ (never into the repo).
All designs are original (generic fantasy goblins / slimes / orcs, our own rune-core slime).
"""
import json, os

CHAR = ("Cute chibi anime mobile RPG {kind} art, 2.5-heads-tall proportions, big expressive eyes, soft cel shading with "
        "gentle gradients, clean thin lineart, bright pastel fantasy colors, polished game key-art quality. ")
CHAR_TAIL = " Full body, three-quarter view, centered, isolated on a plain flat light grey background. No text, no logo, no watermark, no frame."
PROP = ("Cute hand-painted mobile RPG game environment prop, soft cel shading with gentle gradients, clean thin dark lineart, "
        "bright pastel fantasy colors, polished game asset quality, seen from a high three-quarter top-down angle like an object "
        "on a game map. ")
PROP_TAIL = (" Single object, the whole object visible with empty margin around it, centered, isolated on a plain flat light grey "
             "background, only a soft contact shadow under it. No characters, no text, no logo, no watermark, no frame.")
GROUND = ("Seamless tileable ground texture for a cute hand-painted mobile RPG battle map, seen straight down from directly above "
          "(orthographic top-down, no perspective, no horizon), soft painterly cel-shaded style that matches chibi anime game art, "
          "colors slightly muted and low contrast so characters stand out on it, even flat lighting, only small details "
          "(no trees, no rocks bigger than pebbles, no paths crossing the frame), the pattern fills the whole square edge to edge. ")
GROUND_TAIL = " No text, no logo, no watermark, no frame, no border, no vignette."

jobs = []
def ch(name, kind, d, seed): jobs.append({"name": name, "seed": seed, "prompt": CHAR.replace("{kind}", kind) + d + CHAR_TAIL})
def pr(name, d, seed, w=1024, h=1024): jobs.append({"name": name, "seed": seed, "w": w, "h": h, "prompt": PROP + d + PROP_TAIL})
def gr(name, d, seed): jobs.append({"name": name, "seed": seed, "prompt": GROUND + d + GROUND_TAIL})

# ---- ground tiles (one per biome + the classic graveyard) ----
gr("gr_haunted", "Dark mossy forest floor of a gentle haunted wood at dusk: deep olive and slate-violet soil, patches of moss, scattered fallen dry leaves, tiny mushrooms, a faint cool purple tint.", 3101)
gr("gr_meadow", "Soft spring meadow grass: short lush green grass with tiny scattered yellow, white and pink flowers and clover, warm sunny green tones.", 3102)
gr("gr_forest", "Pine forest floor: dark green moss and short grass mixed with brown pine needles, small twigs and tiny ferns, deep green tones.", 3103)
gr("gr_ruins", "Old temple courtyard: worn sandy-grey stone slabs with cracks, grass and moss growing in the gaps, a few faint carved rune lines, warm grey tones.", 3104)
gr("gr_grave", "Old graveyard soil at night: dark brown-grey earth, short dry grass tufts, small pebbles, a few fallen leaves, cool muted tones.", 3105)
gr("gr_swamp", "Shallow swamp marsh ground: damp teal-green grass islands with small puddles of clear shallow water, reeds, lily leaves, cool aqua-green tones.", 3106)
gr("gr_canyon", "Red rock canyon ground: rusty red-orange packed dirt and flat stone, small gravel, dry grass tufts, warm red-brown tones.", 3107)

# ---- trees (the game draws the bottom as the trunk under actors, the top as a canopy over them) ----
pr("t_tree_dead0", "A spooky-but-cute leafless dead tree with a twisted dark grey-brown trunk and curling bare branches, a hollow knot like a sleepy face.", 3201)
pr("t_tree_dead1", "A crooked leafless dead tree with dark bark, long drooping grey moss hanging from its bare branches, a tiny lantern hanging from one branch.", 3202)
pr("t_tree_dead2", "A short gnarled dead tree stump-tree with split dark bark, two bare branches, small glowing purple mushrooms at its roots.", 3203)
pr("t_tree_round0", "A round fluffy leafy tree with a short thick brown trunk and a big puffy bright green canopy made of soft cloud-like clumps.", 3211)
pr("t_tree_round1", "A round fluffy tree with a short thick trunk and a puffy canopy covered in soft pink blossoms.", 3212)
pr("t_tree_round2", "A round fluffy leafy tree with a short thick trunk and a puffy green canopy dotted with shiny red apples.", 3213)
pr("t_tree_pine0", "A tall cute pine tree with three layered dark green needle tiers and a straight brown trunk.", 3221)
pr("t_tree_pine1", "A tall cute fir tree with layered blue-green needle tiers, small pine cones, slightly leaning.", 3222)
pr("t_tree_pine2", "A slim cute cypress-pine tree with dense dark green needles and a short brown trunk.", 3223)
# ---- rocks / tombs / pillars ----
pr("t_rock_boulder0", "A big rounded grey boulder with soft moss patches and small grass tufts at its base.", 3301)
pr("t_rock_boulder1", "A cluster of two large grey-brown rocks with a crack and tiny flowers growing beside them.", 3302)
pr("t_rock_boulder2", "A wide flat grey stone with a mossy top and pebbles around it.", 3303)
pr("t_rock_tomb0", "A cute rounded old gravestone with a carved rune cross, mossy edges and a small candle in front.", 3311)
pr("t_rock_tomb1", "A cracked tilted gravestone with a pointed top, ivy climbing it, a few small white flowers.", 3312)
pr("t_rock_tomb2", "A small stone grave marker shaped like a simple rune slab with a wilted flower wreath.", 3313)
pr("t_rock_pillar0", "A tall ancient stone pillar with softly glowing blue rune carvings and green ivy.", 3321)
pr("t_rock_pillar1", "A broken ancient stone pillar, the top half snapped off, faint blue rune carvings, rubble at its base.", 3322)
pr("t_rock_pillar2", "A short toppled stone pillar stump with a carved capital lying beside it, moss and grass.", 3323)
# ---- bushes / water ----
pr("t_bush_thorn0", "A dark green thorny bramble bush with curled thorns and small purple berries.", 3401)
pr("t_bush_thorn1", "A low spiky dry thorn bush with grey-green leaves and red berries.", 3402)
pr("t_bush_flower0", "A round green bush covered in small bright yellow flowers.", 3411)
pr("t_bush_flower1", "A round green bush covered in small pink flowers.", 3412)
pr("t_bush_flower2", "A round green bush covered in small white flowers.", 3413)
pr("t_wet_water0", "A small round clear blue pond with lily pads, a pink lotus and reeds around its rocky grassy edge.", 3501, 1024, 768)
pr("t_wet_water1", "A small oval clear blue pond with stepping stones along one edge, reeds and tiny rocks around it.", 3502, 1024, 768)
pr("t_wet_mud0", "A murky brown mud puddle with a few bubbles, dark reeds and a small rotten log at its edge.", 3511, 1024, 768)
pr("t_wet_mud1", "A wide dark violet-brown bog puddle with small glowing bubbles and dead reeds.", 3512, 1024, 768)
# ---- mountains / cliffs (big hard obstacles) ----
pr("t_mount_rock0", "A big rocky mountain outcrop: a tall layered grey-brown rock mass with steep cliffs, a grassy top with two small pine trees, small rocks at its foot.", 3601)
pr("t_mount_rock1", "A wide rocky hill: stacked boulders and cliffs of warm grey stone, green grass on top.", 3602)
pr("t_mount_haunt0", "A dark craggy rock spire mass of slate-violet stone with glowing purple crystals growing from its cracks and a dead tree on top.", 3603)
pr("t_mount_red0", "A big red sandstone mesa rock with layered rusty red cliffs and dry grass on top.", 3604)
pr("t_mount_crystal0", "A cluster of large pale blue rune crystals growing out of a mossy rock mound, softly glowing.", 3605)
# ---- camps / landmarks for the maps ----
pr("t_fence0", "A short section of goblin camp fence: sharpened wooden stakes tied with rope, leaning slightly, a crude painted wooden shield hung on it.", 3701, 1024, 768)
pr("t_campfire0", "A small campfire with crackling orange flames inside a ring of stones and logs, a spit with a roasting mushroom.", 3702)
pr("t_tent_goblin", "A small patched goblin tent made of brown hides and sticks, a little flag on top.", 3703)
pr("t_tower_orc", "A tall wooden orc watch tower on four log legs with a platform, a rusty red banner and spikes.", 3704, 768, 1024)
pr("t_tent_orc", "A big rusty-red orc war tent with iron spikes and a horned banner.", 3705)
pr("t_wall_log", "A short section of a thick log palisade wall with iron bands, sharpened tops.", 3706, 1024, 768)
pr("t_hotspring", "A small steaming hot spring pool with smooth stones around it and warm turquoise water.", 3707, 1024, 768)
pr("t_altar_rune", "An old round stone rune altar platform with a glowing rune circle carved on top and four small pillars.", 3708)
pr("t_portal", "A glowing magic portal gate: an arch of two mossy stone pillars with a swirling soft blue light between them.", 3709, 768, 1024)
pr("t_chest_gold", "A small wooden treasure chest with gold trim, slightly open with gold coins glinting inside.", 3710)

# ---- goblin forest g1 ----
G = "goblin: a small green-skinned goblin with big pointy ears, a round nose, a mischievous grin and a patched leather vest, "
ch("g_sprout", "monster", "A tiny baby " + G + "very small and round, wearing a leaf on its head, waving a twig.", 4101)
ch("g_grunt", "monster", "A " + G + "holding a big knobby wooden club over its shoulder.", 4102)
ch("g_thrower", "monster", "A " + G + "with a sling and a pouch of stones, winding up to throw a rock.", 4103)
ch("g_spear", "monster", "A " + G + "wearing a small dented helmet, holding a long wooden spear pointed forward.", 4104)
ch("g_thief", "monster", "A sneaky " + G + "wearing a dark bandana mask, carrying a stolen sack of gold coins, tiptoeing.", 4105)
ch("g_boarrider", "monster", "A " + G + "riding a chubby brown wild boar with small tusks, holding reins and a short spear.", 4106)
ch("g_boar", "monster", "A chubby brown wild boar with small white tusks, bristly mane and an angry little face.", 4107)
ch("g_shaman", "monster", "A goblin shaman with a feathered bone headdress, a robe of leaves, holding a crooked staff with a small fire flame on top.", 4108)
ch("g_drummer", "monster", "A " + G + "beating a big round war drum hanging from its neck with two sticks.", 4109)
ch("g_trapper", "monster", "A " + G + "wearing goggles, carrying a bag of spiky caltrops and a small bear trap.", 4110)
ch("g_hob", "monster", "A big muscular hobgoblin with darker green skin, a wooden round shield and a short sword, sturdy stance.", 4111)
ch("gb_king", "boss monster", "The Rust-crown Goblin King as a round chubby chibi goblin: a big rusty iron crown, a red fur cape, a huge spiked club, a proud grin.", 4112)
# ---- slime swamp s1 (our slime: clear jelly with a floating rune core inside, colored by element) ----
S = "slime: a round translucent jelly blob with a small glowing rune stone core floating inside it, big cute eyes, "
ch("s_drop", "monster", "A water " + S + "clear blue like a water drop with a little drip on top.", 4201)
ch("s_ember", "monster", "A fire " + S + "glowing ember red-orange with tiny flames and a charcoal core.", 4202)
ch("s_breeze", "monster", "A wind " + S + "pale mint green and bubbly like a soap bubble, floating with swirling breeze lines.", 4203)
ch("s_pebble", "monster", "An earth " + S + "brown with a cracked pebble-stone shell on its back.", 4204)
ch("s_moss", "monster", "A mossy " + S + "green with moss and tiny leaves growing on its top, sleepy eyes.", 4205)
ch("s_glow", "monster", "A light " + S + "soft golden and glowing warmly with little sparkles, a halo above it.", 4206)
ch("s_shade", "monster", "A dark " + S + "deep violet and half see-through like smoke, glowing purple eyes.", 4207)
ch("s_twin", "monster", "A " + S + "split in two halves, one half fire red and one half water blue, two rune cores.", 4208)
ch("s_big", "monster", "A giant " + S + "big and wobbly teal-green, with several smaller rune stones inside, a determined face.", 4209)
ch("s_merge", "monster", "Three small slimes fused into one lumpy " + S + "with three faces and three rune cores, rainbow-tinted.", 4210)
ch("sb_queen", "boss monster", "The Six-hue Slime Queen: a huge regal translucent slime with a crown of six colored rune gems, a rainbow shimmer and a large glowing core.", 4211)
# ---- orc camp o1 (rusty red iron theme) ----
O = "orc: a stocky muscular grey-green orc with small tusks, a heavy brow and rusty red iron armor pieces, "
ch("o_grunt", "monster", "An " + O + "holding a heavy iron cleaver, a plain helmet.", 4301)
ch("o_archer", "monster", "An " + O + "with a big wooden longbow and a quiver, leather hood.", 4302)
ch("o_shield", "monster", "An " + O + "behind a huge rectangular rusty iron tower shield, peeking over it.", 4303)
ch("o_berserk", "monster", "A wild " + O + "with red war paint, a mohawk and two hand axes, roaring.", 4304)
ch("o_shaman", "monster", "An old orc shaman with a wolf-skull headdress, bone charms and a staff with a dark purple flame.", 4305)
ch("o_rhino", "monster", "An " + O + "riding a stocky grey stone-skinned rhino with a big horn and armor plates.", 4306)
ch("o_horn", "monster", "An " + O + "blowing a huge curved war horn, cheeks puffed.", 4307)
ch("o_bomber", "monster", "A grinning " + O + "carrying a big round black powder barrel bomb with a lit fuse on its back.", 4308)
ch("o_brute", "monster", "A huge hulking " + O + "with a giant blacksmith hammer and an anvil-like chest plate.", 4309)
ch("o_cook", "monster", "A jolly round orc camp cook with an apron and a chef hat, holding a ladle and a roasted drumstick.", 4310)
ch("o_wolf", "monster", "A skeletal bone wolf with glowing purple eyes and dark wisps.", 4311)
ch("ob_warlord", "boss monster", "The Iron-fang Orc Warlord as a big chibi orc: huge iron tusks, a horned rusty helmet, a red cape, a giant two-handed axe.", 4312)

out = {"subdir": "prod_v2", "_note": "scene + 3 maps art (make_v2.py) · original designs", "jobs": jobs}
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "production_v2.json")
json.dump(out, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(jobs), "jobs ->", p)
