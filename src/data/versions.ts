// Recipe versions from the comparison sheets. Each column of a comparison
// sheet is its own recipe; recipes that share a `family` are versions of the
// same dish and can be switched between and compared side by side.

import type { Recipe } from '../types';
import { recipe } from './seedHelpers';

const COOKIES = 'Cookie Recipes.xlsx';
const THANKSGIVING = 'Thanksgiving 2024 recipe comparisons.xlsx';
const CHANTILLY = 'Chantilly Cake recipes.xlsx';
const CHOCOLATE = 'Chocolate Cake Recipes.xlsx';
const YELLOW = 'Yellow cake recipes.xlsx';
const WRITTEN = 'Steps were written to match; the sheet lists ingredients only.';

export type VersionPatch = Pick<Recipe, 'family' | 'version' | 'title'> & Partial<Pick<Recipe, 'description' | 'notes'>>;

/** Changes to recipes imported earlier: they become one version of their dish,
 *  and their notes no longer need to summarize the other versions. */
export const VERSION_PATCHES: Record<string, VersionPatch> = {
  'molasses-cookies': {
    family: 'molasses-cookies', version: 'ChatGPT Chewy', title: 'Molasses Cookies (ChatGPT Chewy)',
    notes: 'You made this version. It may need a little more sugar because of the extra flour.\n¾ tsp salt was fine but less sweet; try ½ tsp. Ginger should be 1 tsp (not 2). Maybe ¼ tsp nutmeg, allspice or cardamom too.\nBaked at 350°F; try 375°F with a test batch of 5. Used 2 tsp vanilla like Preppy Kitchen.\nExtra soft: add 1 Tbsp milk. Spicier: add ½ tsp black pepper.',
  },
  'chocolate-chip-cookies': {
    family: 'chocolate-chip-cookies', version: 'My Version', title: 'Chocolate Chip Cookies (My Version)',
    description: 'Gooey chocolate chip walnut cookies. Your adjusted version of The Slow Roasted Italian’s recipe.',
    notes: '3/15/26: 2 eggs and 1½–2 tsp vanilla were good. Salted butter was good. 1 cup walnuts, not ½. Blue-bag chips need a bit more sugar; 7 oz is plenty. Bake only 8–9 minutes; 11–12 minutes to brown them wasn’t as good.\n3/20/26: 208 g dark brown sugar was too much; use 160 g split light and dark. At 375°F, 9½ minutes wasn’t enough; 10½ was good.\n4/20/26: 53 g sugar, could try 55 g. Add a little more flour or chill longer so it’s less sticky. Skipped cornstarch and it wasn’t bad.',
  },
  'pumpkin-bread': {
    family: 'pumpkin-bread', version: 'Copycat Starbucks', title: 'Pumpkin Bread (Copycat Starbucks)',
    notes: 'You made this one with changes and it came out moist and good: 1 cup pumpkin, ½ cup applesauce, ¼ cup melted unsalted butter (instead of the oil), ¾ cup organic raw sugar, ¼ cup light brown sugar, 3 eggs, and a pinch (under ⅛ tsp) of ginger. Curious about adding more liquid.\nOther ideas: walnuts in the batter, pumpkin seeds on top, applesauce for the oil.\n\n' + WRITTEN,
  },
  'pumpkin-pudding': {
    family: 'pumpkin-pudding', version: 'Food Channel L', title: 'Pumpkin Pudding (Food Channel L)',
    notes: 'Probably use less sugar.',
  },
  'pumpkin-roll': {
    family: 'pumpkin-roll', version: 'Libby’s', title: 'Pumpkin Roll (Libby’s)',
    notes: 'You made this one. The baking powder made it a little puffy; try baking soda only next time. Added 1 tsp vanilla. Used 2 Tbsp butter (Libby’s says 6). The cake was a little sticky.',
  },
  'pumpkin-cheesecake': {
    family: 'pumpkin-cheesecake', version: 'My Recipe', title: 'Pumpkin Cheesecake (My Recipe)',
    notes: 'This is the “Recipe that I have” column. That column has no crust butter, so 6 Tbsp is taken from Natasha’s Kitchen. The ¼ cup sugar in the crust was too sweet.\nThe sheet also names Paula Deen’s Easy Pumpkin Cheesecake but only lists its crust (1¾ cups graham crumbs).\n\n' + WRITTEN,
  },
  'cinnamon-pecans': {
    family: 'cinnamon-pecans', version: 'Mel’s Kitchen', title: 'Cinnamon Sugar Pecans (Mel’s Kitchen)',
    notes: WRITTEN,
  },
  'chantilly-cake': {
    family: 'chantilly-cake', version: 'Cakes by MK', title: 'Berry Chantilly Cake (Cakes by MK)',
    notes: 'You made this cake and it came out good, but the vegetable oil sits in your stomach. You can use 325 g cake flour instead.\nBerry filling: you tripled it for a triple-layer cake and had extra, so doubling is enough. You once used ¾ tsp cornstarch by accident and it was still thick and good.\nThis follows the Cakes by MK column, which matches the PDF. The sheet stops after step 5 of the cake; the remaining steps were written to match.',
  },
  'best-chocolate-cake': {
    family: 'best-chocolate-cake', version: 'The Best Ever', title: 'Chocolate Cake (The Best Ever)',
    notes: '10/24/21: Needs the full 2 cups of sugar; 385 g wasn’t sweet enough. The cake was good.\nThe sheet has no steps for this one; they follow the Fudgiest cake’s method.',
  },
  'fluffy-butter-chocolate-cake': { family: 'best-chocolate-cake', version: 'Fluffy Butter', title: 'Chocolate Cake (Fluffy Butter)' },
  'bakery-chocolate-cake': { family: 'best-chocolate-cake', version: 'Bakery-Style', title: 'Chocolate Cake (Bakery-Style)' },
  'yellow-cake': {
    family: 'yellow-cake', version: 'My Version', title: 'Yellow Cake (My Version)',
    notes: 'Your note: “3 cups flour, 1 egg, 3 yolks and 2 whites (meringue), 8 oz butter, 1 Tbsp baking powder, 1¼ c buttermilk, cream of tartar for the whites, 1¾ cups sugar. Cake was fine/good but I want it lighter.” The cupcakes ended up dry.\nFor more moisture: replace ½ cup of the liquid with sour cream or yogurt, or brush the layers with simple syrup.\nThe sheet also names The Best One Bowl Yellow Cake but only lists 2¼ cups sugar, 3 cups cake flour and ¾ tsp salt.',
  },
};

// ---------- Shared steps ----------

const MOLASSES_STEPS = [
  'Heat the oven to 350°F and line baking sheets with parchment.',
  'Sift the flour, baking soda, salt and spices together.',
  'Cream the butter and sugar until light and fluffy, 2 to 3 minutes.',
  'Beat in the egg, molasses and vanilla until smooth.',
  'Mix in the dry ingredients just until combined.',
  'Chill the dough 30 to 45 minutes.',
  'Roll into 1½-inch balls, roll in sugar, and place 2 inches apart.',
  'Bake 8 to 10 minutes, until the edges are set and the tops crackle. Centers should look slightly underbaked.',
  'Cool 5 minutes on the sheet, then move to a rack.',
];

const chipSteps = (temp: number, minutes: string) => [
  `Heat the oven to ${temp}°F and line baking sheets with parchment.`,
  'Cream the butter and sugars until light and fluffy.',
  'Beat in the egg and vanilla.',
  'Whisk the flour and the rest of the dry ingredients, and mix in just until combined.',
  'Fold in the chocolate chips (and walnuts, if using).',
  `Scoop onto the sheets and bake ${minutes} minutes, until the edges are golden and the centers still look soft.`,
  'Cool on the sheet a few minutes before moving to a rack.',
];

const DOWNEAST_STEPS = [
  'Heat the oven to 350°F and grease two 9×5-inch loaf pans.',
  'Whisk the flour, baking soda, salt and spices.',
  'In a large bowl, beat the eggs and sugar, then mix in the pumpkin, oil and liquid.',
  'Stir in the dry ingredients just until combined.',
  'Divide between the pans and bake about 1 hour, until a toothpick comes out clean.',
  'Cool 10 minutes in the pans, then turn out to cool completely.',
];

const STOVETOP_PUDDING = [
  'In a saucepan, whisk the sugar, cornstarch, salt and spices.',
  'Whisk in the milk, eggs and pumpkin until smooth.',
  'Cook over medium heat, stirring constantly, until it bubbles and thickens.',
  'Remove from the heat and stir in the butter (if using) and vanilla.',
  'Pour into cups, cover the surface, and chill until set.',
];

const ROLL_STEPS = [
  'Heat the oven to 375°F. Line a 15×10-inch jelly roll pan with greased parchment. Dust a thin towel with powdered sugar.',
  'Whisk the flour, salt, leavening and spices.',
  'Beat the eggs and sugar until thick, then beat in the pumpkin (and vanilla). Stir in the dry ingredients.',
  'Spread in the pan and bake 13 to 15 minutes, until the top springs back.',
  'Turn the cake out onto the towel, peel off the parchment, and roll up cake and towel together from the short end. Cool completely.',
  'Beat the cream cheese, butter, vanilla and powdered sugar until smooth.',
  'Unroll the cake, spread with the filling, and roll it back up without the towel.',
  'Wrap and chill at least 1 hour before slicing.',
];

const CHEESECAKE_STEPS = [
  'Heat the oven to 325°F. Mix the crust ingredients and press into a 9-inch springform pan. Bake 10 minutes.',
  'Beat the cream cheese and sugars until smooth.',
  'Beat in the pumpkin, vanilla, salt, spices, sour cream and flour or cornstarch.',
  'Add the eggs one at a time on low speed, just until blended.',
  'Pour over the crust and bake 60 to 70 minutes, until the edges are set and the center barely jiggles.',
  'Turn off the oven and leave the cheesecake inside with the door cracked for 1 hour.',
  'Chill at least 4 hours, or overnight.',
];

const PECAN_STEPS = [
  'Heat the oven to 250°F and line a rimmed baking sheet with parchment.',
  'Whisk the egg white (and water) until frothy. Toss the pecans in it.',
  'Mix the sugar, cinnamon and salt, and toss with the pecans until coated.',
  'Spread on the pan and bake 1 hour, stirring every 15 minutes.',
  'Cool completely and break apart.',
];

const CHANTILLY_FINISH = [
  'Cook the berries, sugar, cornstarch, lemon juice (and water) over medium heat until thick and jammy, about 5 minutes. Chill.',
  'Beat the cream cheese, mascarpone, powdered sugar and flavorings until smooth. Add the cold cream and whip to stiff peaks.',
  'Layer the cakes with frosting and the berry filling, frost the outside, and top with fresh berries. Chill before slicing.',
];

const ONE_BOWL_CHOCOLATE = [
  'Heat the oven to 350°F. Grease and line two 9-inch round pans.',
  'Whisk the flour, sugars, cocoa, baking soda, baking powder (if using) and salt.',
  'Add the eggs, buttermilk or sour cream, oil and vanilla, and beat until smooth.',
  'Slowly stir in the hot water or coffee. The batter will be thin.',
  'Divide between the pans and bake 30 to 35 minutes, until a toothpick comes out with a few moist crumbs.',
  'Cool 10 minutes in the pans, then turn out to cool completely before frosting.',
];

const CREAMED_YELLOW = [
  'Heat the oven to 350°F. Grease and line two 9-inch round pans.',
  'Whisk the flour, baking powder, baking soda (if using) and salt.',
  'Cream the butter (and oil) with the sugar until pale and fluffy, 3 to 4 minutes.',
  'Beat in the eggs one at a time, then the vanilla.',
  'Add the flour mixture in 3 parts, alternating with the milk or buttermilk. Mix just until combined.',
  'Divide between the pans and bake 25 to 30 minutes, until a toothpick comes out clean.',
  'Cool 10 minutes in the pans, then turn out to cool completely.',
];

const COOKIE = { categoryIds: ['desserts', 'cookies'], cuisine: 'American', yieldUnit: 'cookies', difficulty: 'Easy' as const };
const PUMPKIN = { cuisine: 'American', createdAt: Date.UTC(2024, 10, 1) };
const CAKE = { categoryIds: ['desserts', 'cakes'], cuisine: 'American' };

export const NEW_VERSIONS: Recipe[] = [
  // ---------- Cookie Recipes.xlsx: Molasses Cookies ----------
  recipe({
    ...COOKIE, id: 'molasses-cookies-preppy-kitchen', family: 'molasses-cookies', version: 'Preppy Kitchen',
    title: 'Molasses Cookies (Preppy Kitchen)',
    description: 'Soft, crackly molasses cookies rolled in sugar.',
    tags: ['holiday', 'spice', 'christmas'],
    prepMinutes: 20, cookMinutes: 10, totalMinutes: 20 + 10 + 45, servings: 24,
    ingredients: [
      '2½ cups flour (300 g)', '2 tsp baking soda', '¾ tsp salt', '1½ tsp ground cinnamon', '1 tsp ground ginger', '½ tsp ground cloves',
      '¾ cup unsalted butter (170 g), room temperature', '¾ cup dark brown sugar (165 g)', '⅓ cup unsulphured molasses (80 mL)',
      '1 egg, room temperature', '2 tsp vanilla', '¼ cup granulated sugar (50 g), for rolling',
    ],
    steps: MOLASSES_STEPS,
    notes: 'The sheet shares one set of steps across all four versions.',
    source: { label: 'Preppy Kitchen', file: COOKIES },
    createdAt: Date.UTC(2025, 11, 14),
  }),
  recipe({
    ...COOKIE, id: 'molasses-cookies-chatgpt', family: 'molasses-cookies', version: 'ChatGPT',
    title: 'Molasses Cookies (ChatGPT)',
    description: 'A lighter molasses cookie made with granulated sugar instead of brown.',
    tags: ['holiday', 'spice', 'christmas'],
    prepMinutes: 20, cookMinutes: 10, totalMinutes: 20 + 10 + 45, servings: 24,
    ingredients: [
      '2¼ cups flour', '2 tsp baking soda', '½ tsp salt', '1 tsp ground cinnamon', '1½ tsp ground ginger', '¼ tsp ground cloves',
      '¾ cup unsalted butter, room temperature', '¼ cup unsulphured molasses', '1 egg, room temperature', '1 tsp vanilla',
      '1 cup granulated sugar, plus more for rolling',
    ],
    steps: MOLASSES_STEPS,
    notes: 'This column has no brown sugar; cream the butter with the granulated sugar and keep a little back for rolling.',
    source: { label: 'ChatGPT', file: COOKIES },
    createdAt: Date.UTC(2025, 11, 14),
  }),
  recipe({
    ...COOKIE, id: 'molasses-cookies-king-arthur', family: 'molasses-cookies', version: 'King Arthur',
    title: 'Molasses Cookies (King Arthur)',
    description: 'King Arthur’s molasses cookies, as far as the sheet lists them.',
    tags: ['holiday', 'spice', 'christmas'],
    prepMinutes: 20, cookMinutes: 10, servings: 24,
    ingredients: [
      '2 cups flour (240 g)', '½ tsp baking soda', '½ tsp salt', '1 tsp ground cinnamon', '1 tsp ground ginger', '¼ tsp ground cloves',
      '5 Tbsp unsalted butter (71 g), room temperature', '½ cup granulated sugar (99 g)',
    ],
    steps: MOLASSES_STEPS,
    notes: 'Only these amounts were copied into the sheet. King Arthur’s recipe also uses molasses and an egg, so check the original before baking.',
    source: { label: 'King Arthur', file: COOKIES },
    createdAt: Date.UTC(2025, 11, 14),
  }),

  // ---------- Cookie Recipes.xlsx: Chocolate Chip Cookies ----------
  recipe({
    ...COOKIE, id: 'chocolate-chip-cookies-slow-roasted-italian', family: 'chocolate-chip-cookies', version: 'The Slow Roasted Italian',
    title: 'Chocolate Chip Cookies (The Slow Roasted Italian)',
    description: 'Gooey chocolate chip cookies. The original recipe your version is based on.',
    tags: ['chocolate', 'walnuts', 'classic'],
    prepMinutes: 15, cookMinutes: 9, servings: 18,
    ingredients: [
      '½ cup butter (93 g Kerrygold salted)', '¾ cup light brown sugar (160 g)', '¼ cup granulated sugar (51 g)', '1 egg',
      '1 Tbsp vanilla extract', '2 cups flour (240 g)', '2 Tbsp cornstarch (17 g)', '1 tsp baking powder', '½ tsp baking soda',
      '½ tsp salt', '12 oz chocolate chips', '½ cup walnuts',
    ],
    steps: chipSteps(400, '8 to 10'),
    notes: 'Baked at 400°F for 12½ minutes and it was too long; 9–10 minutes was better.\nThe cookie part wasn’t sweet enough. Use salted butter or more sugar. You used 2 eggs.\nCheck whether they turn dry after a day.\n\n' + WRITTEN,
    source: { label: 'The Slow Roasted Italian (Gooey Chocolate Chip Cookies)', file: COOKIES },
    createdAt: Date.UTC(2026, 2, 15),
  }),
  recipe({
    ...COOKIE, id: 'chocolate-chip-cookies-hersheys', family: 'chocolate-chip-cookies', version: 'Hershey’s',
    title: 'Chocolate Chip Cookies (Hershey’s)',
    description: 'The classic chocolate chip cookie from the back of the bag.',
    tags: ['chocolate', 'walnuts', 'classic'],
    prepMinutes: 15, cookMinutes: 10, servings: 48,
    ingredients: [
      '1 cup butter, softened', '¾ cup brown sugar', '¾ cup granulated sugar', '2 eggs', '1 tsp vanilla extract',
      '2¼ cups flour', '1 tsp baking soda', '½ tsp salt', '2 cups chocolate chips', '1 cup walnuts',
    ],
    steps: chipSteps(375, '9 to 11'),
    notes: WRITTEN,
    source: { label: 'Hershey’s', file: COOKIES },
    createdAt: Date.UTC(2026, 2, 15),
  }),
  recipe({
    ...COOKIE, id: 'chocolate-chip-cookies-krolls-korner', family: 'chocolate-chip-cookies', version: 'Kroll’s Korner',
    title: 'Chocolate Chip Cookies (Kroll’s Korner)',
    description: 'Soft, thick chocolate chip cookies with cake flour and an extra yolk.',
    tags: ['chocolate', 'classic'],
    prepMinutes: 15, cookMinutes: 10, servings: 18,
    ingredients: [
      '½ cup butter, softened', '½ cup brown sugar', '¼ cup granulated sugar', '1 egg plus 1 egg yolk', '1 tsp vanilla extract',
      '1¼ cups flour', '¾ cup cake flour', '1 tsp cornstarch', '½ tsp baking powder', '½ tsp baking soda', '½ tsp salt',
      '2 cups chocolate chips',
    ],
    steps: chipSteps(375, '9 to 11'),
    notes: WRITTEN,
    source: { label: 'Kroll’s Korner', file: COOKIES },
    createdAt: Date.UTC(2026, 2, 15),
  }),

  // ---------- Thanksgiving: Pumpkin Bread ----------
  recipe({
    ...PUMPKIN, id: 'pumpkin-bread-downeast-pinterest', family: 'pumpkin-bread', version: 'Downeast Maine (Pinterest)',
    title: 'Pumpkin Bread (Downeast Maine, Pinterest)',
    description: 'A big-batch spiced pumpkin bread with orange juice. Makes 2 loaves.',
    categoryIds: ['breads', 'desserts'], tags: ['pumpkin', 'thanksgiving', 'fall', 'quick bread'],
    prepMinutes: 15, cookMinutes: 60, servings: 2, yieldUnit: 'loaves', difficulty: 'Easy',
    ingredients: [
      '3½ cups flour', '2 tsp baking soda', '1½ tsp salt', '1 tsp ground nutmeg', '1 tsp ground cinnamon', '½ tsp ground cloves',
      '¼ tsp ground ginger', '4 eggs', '2 cups white sugar', '1 cup light brown sugar', '1 can pumpkin (15 oz)', '1 cup vegetable oil',
      '⅔ cup orange juice',
    ],
    steps: DOWNEAST_STEPS,
    notes: WRITTEN,
    source: { label: 'Shesnotcooking.com (Pinterest)', file: THANKSGIVING },
  }),
  recipe({
    ...PUMPKIN, id: 'pumpkin-bread-downeast-allrecipes', family: 'pumpkin-bread', version: 'Downeast Maine (Allrecipes)',
    title: 'Pumpkin Bread (Downeast Maine, Allrecipes)',
    description: 'The original Downeast Maine pumpkin bread. Makes 2 loaves.',
    categoryIds: ['breads', 'desserts'], tags: ['pumpkin', 'thanksgiving', 'fall', 'quick bread'],
    prepMinutes: 15, cookMinutes: 60, servings: 2, yieldUnit: 'loaves', difficulty: 'Easy',
    ingredients: [
      '3½ cups flour', '2 tsp baking soda', '1½ tsp salt', '1 tsp ground nutmeg', '1 tsp ground cinnamon', '½ tsp ground cloves',
      '¼ tsp ground ginger', '4 eggs', '3 cups white sugar', '1 can pumpkin (15 oz)', '1 cup vegetable oil', '⅔ cup water',
    ],
    steps: DOWNEAST_STEPS,
    notes: 'Your comment: use ½ cup unsweetened applesauce plus ½ cup oil or butter in place of the 1 cup oil, and 2 cups sugar.\n\n' + WRITTEN,
    source: { label: 'Allrecipes', file: THANKSGIVING },
  }),

  // ---------- Thanksgiving: Pumpkin Pudding ----------
  recipe({
    ...PUMPKIN, id: 'pumpkin-pudding-cooking-with-dog', family: 'pumpkin-pudding', version: 'Cooking with Dog',
    title: 'Pumpkin Pudding (Cooking with Dog)',
    description: 'Japanese-style steamed pumpkin custard made with fresh squash.',
    categoryIds: ['desserts'], tags: ['pumpkin', 'thanksgiving', 'fall', 'custard'],
    prepMinutes: 25, cookMinutes: 20, totalMinutes: 45 + 120, servings: 4, difficulty: 'Medium',
    ingredients: ['200 g pumpkin or squash', '200 mL milk', '40 g sugar', '50 mL whipping cream', '2 eggs', '½–1 tsp vanilla'],
    steps: [
      'Put the squash in a pot, pour in water until it’s almost covered, cover, and simmer until soft. Drain.',
      'Blend the squash with the sugar and half the milk until smooth.',
      'Blend in the rest of the milk, the cream, the eggs and the vanilla.',
      'Strain the mixture through a fine-mesh strainer.',
      'Pour into custard cups.',
      'Set the cups in a pan of simmering water, cover them with foil, and put the lid on slightly open. Steam over low heat until just set, about 15 minutes.',
      'Cool, then chill.',
    ],
    notes: '',
    source: { label: 'Cooking with Dog (YouTube)', file: THANKSGIVING },
  }),
  recipe({
    ...PUMPKIN, id: 'pumpkin-pudding-queen-g', family: 'pumpkin-pudding', version: 'Queen G’s',
    title: 'Pumpkin Pudding (Queen G’s)',
    description: 'Creamy stovetop pumpkin pudding with eggs and cinnamon.',
    categoryIds: ['desserts'], tags: ['pumpkin', 'thanksgiving', 'fall'],
    prepMinutes: 10, cookMinutes: 15, totalMinutes: 25 + 120, servings: 6, difficulty: 'Easy',
    ingredients: ['3 cups milk', '⅔ cup pumpkin purée', '¾ cup sugar', '3 Tbsp cornstarch', '2 eggs', '¼ tsp salt', '½ tsp cinnamon', '2 Tbsp butter', '1 Tbsp vanilla'],
    steps: STOVETOP_PUDDING,
    notes: 'It looks runny in the video.\n\n' + WRITTEN,
    source: { label: 'Queen G’s Recipes (YouTube)', file: THANKSGIVING },
  }),
  recipe({
    ...PUMPKIN, id: 'pumpkin-pudding-liz-lampman', family: 'pumpkin-pudding', version: 'Liz Lampman',
    title: 'Pumpkin Pudding (Liz Lampman)',
    description: 'A small, lightly sweet stovetop pumpkin pudding.',
    categoryIds: ['desserts'], tags: ['pumpkin', 'thanksgiving', 'fall'],
    prepMinutes: 10, cookMinutes: 15, totalMinutes: 25 + 120, servings: 4, difficulty: 'Easy',
    ingredients: ['1¾ cups milk', '½ can pumpkin purée', '6 Tbsp sugar', '2 Tbsp cornstarch', '1 egg', 'Dash of salt', '½ tsp cinnamon', 'Dash of nutmeg', '1 tsp vanilla'],
    steps: STOVETOP_PUDDING,
    notes: WRITTEN,
    source: { label: 'Liz Lampman (Pinterest)', file: THANKSGIVING },
  }),

  // ---------- Thanksgiving: Pumpkin Roll ----------
  recipe({
    ...PUMPKIN, id: 'pumpkin-roll-tastes-better', family: 'pumpkin-roll', version: 'Tastes Better from Scratch',
    title: 'Pumpkin Roll (Tastes Better from Scratch)',
    description: 'Pumpkin sponge with pumpkin pie spice, rolled around cream cheese filling.',
    categoryIds: ['desserts', 'cakes'], tags: ['pumpkin', 'thanksgiving', 'holiday'],
    prepMinutes: 30, cookMinutes: 15, totalMinutes: 45 + 60, servings: 10, difficulty: 'Medium',
    ingredients: [
      '## Cake', '¾ cup flour', '½ tsp salt', '1 tsp baking soda', '1 tsp ground cinnamon', '1 tsp pumpkin pie spice', '1 cup granulated sugar',
      '3 eggs', '⅔ cup canned pumpkin', '1 tsp vanilla',
      '## Filling', '8 oz cream cheese, softened', '2 Tbsp butter, softened', '1 tsp vanilla', '1 cup powdered sugar, plus more for dusting',
    ],
    steps: ROLL_STEPS,
    notes: WRITTEN,
    source: { label: 'Tastes Better from Scratch', file: THANKSGIVING },
  }),
  recipe({
    ...PUMPKIN, id: 'pumpkin-roll-taste-of-home', family: 'pumpkin-roll', version: 'Taste of Home',
    title: 'Pumpkin Roll (Taste of Home)',
    description: 'A lighter pumpkin roll made with separated, whipped eggs.',
    categoryIds: ['desserts', 'cakes'], tags: ['pumpkin', 'thanksgiving', 'holiday'],
    prepMinutes: 35, cookMinutes: 15, totalMinutes: 50 + 60, servings: 10, difficulty: 'Medium',
    ingredients: [
      '## Cake', '¾ cup flour', '⅛ tsp salt', '1 tsp baking soda', '½ tsp ground cinnamon', '1 cup granulated sugar',
      '3 eggs, separated, room temperature', '⅔ cup canned pumpkin',
      '## Filling', '8 oz cream cheese, softened', '2 Tbsp butter, softened', '¾ tsp vanilla', '1 cup powdered sugar, plus more for dusting',
    ],
    steps: [
      'Heat the oven to 375°F. Line a 15×10-inch jelly roll pan with greased parchment. Dust a thin towel with powdered sugar.',
      'Whisk the flour, salt, baking soda and cinnamon.',
      'Beat the yolks with half the sugar until thick, then beat in the pumpkin.',
      'Whip the whites to soft peaks, then gradually beat in the rest of the sugar until stiff.',
      'Fold the whites into the pumpkin mixture, then fold in the dry ingredients.',
      ...ROLL_STEPS.slice(3),
    ],
    notes: WRITTEN,
    source: { label: 'A Taste of Home', file: THANKSGIVING },
  }),
  recipe({
    ...PUMPKIN, id: 'pumpkin-roll-allrecipes', family: 'pumpkin-roll', version: 'Allrecipes',
    title: 'Pumpkin Roll (Allrecipes)',
    description: 'A simple pumpkin roll with cinnamon and cream cheese filling.',
    categoryIds: ['desserts', 'cakes'], tags: ['pumpkin', 'thanksgiving', 'holiday'],
    prepMinutes: 30, cookMinutes: 15, totalMinutes: 45 + 60, servings: 10, difficulty: 'Medium',
    ingredients: [
      '## Cake', '¾ cup flour', '1 tsp baking soda', '½ tsp ground cinnamon', '1 cup granulated sugar', '3 eggs', '⅔ cup canned pumpkin',
      '## Filling', '8 oz cream cheese, softened', '2 Tbsp butter, softened', '¼ tsp vanilla', '1 cup powdered sugar, plus more for dusting',
    ],
    steps: ROLL_STEPS,
    notes: WRITTEN,
    source: { label: 'Allrecipes', file: THANKSGIVING },
  }),

  // ---------- Thanksgiving: Pumpkin Cheesecake ----------
  recipe({
    ...PUMPKIN, id: 'pumpkin-cheesecake-pioneer-woman', family: 'pumpkin-cheesecake', version: 'Pioneer Woman',
    title: 'Pumpkin Cheesecake (Pioneer Woman)',
    description: 'A tall pumpkin cheesecake with a pecan graham crust and warm spices.',
    categoryIds: ['desserts', 'cakes'], tags: ['pumpkin', 'thanksgiving', 'holiday', 'make ahead'],
    prepMinutes: 30, cookMinutes: 80, totalMinutes: 110 + 60 * 6, servings: 12, difficulty: 'Medium',
    ingredients: [
      '## Crust', '14 full graham cracker sheets', '½ cup pecan halves', '3 Tbsp granulated sugar', '½ tsp salt', '½ stick salted butter, melted',
      '## Filling', '4 packages cream cheese (8 oz each), softened', '½ cup granulated sugar', '½ cup light brown sugar', '1 can pumpkin purée (15 oz)',
      '1 Tbsp pure vanilla extract', '¼ tsp sea salt', '1 tsp cinnamon', '½ tsp ground ginger', '¼ tsp ground nutmeg', '¼ tsp ground cardamom',
      '⅓ cup sour cream', '4 eggs', '1½ Tbsp cornstarch',
    ],
    steps: ['Pulse the graham crackers and pecans in a food processor until fine crumbs, then mix with the sugar, salt and butter.', ...CHEESECAKE_STEPS],
    notes: WRITTEN,
    source: { label: 'The Pioneer Woman', file: THANKSGIVING },
  }),
  recipe({
    ...PUMPKIN, id: 'pumpkin-cheesecake-natashas-kitchen', family: 'pumpkin-cheesecake', version: 'Natasha’s Kitchen',
    title: 'Pumpkin Cheesecake (Natasha’s Kitchen)',
    description: 'Creamy brown sugar pumpkin cheesecake on a cinnamon graham crust.',
    categoryIds: ['desserts', 'cakes'], tags: ['pumpkin', 'thanksgiving', 'holiday', 'make ahead'],
    prepMinutes: 30, cookMinutes: 75, totalMinutes: 105 + 60 * 6, servings: 12, difficulty: 'Medium',
    ingredients: [
      '## Crust', '1½ cups graham cracker crumbs (about 12 sheets)', '1 Tbsp granulated sugar', '½ tsp ground cinnamon', '6 Tbsp unsalted butter, melted',
      '## Filling', '24 oz cream cheese, softened', '1½ cups light brown sugar', '1 can pumpkin purée (15 oz)', '1 Tbsp pure vanilla extract',
      '2 tsp pumpkin pie spice', '¼ cup sour cream', '4 eggs', '2 Tbsp flour',
    ],
    steps: CHEESECAKE_STEPS,
    notes: WRITTEN,
    source: { label: 'Natasha’s Kitchen', file: THANKSGIVING },
  }),

  // ---------- Thanksgiving: Cinnamon Sugar Pecans ----------
  recipe({
    ...PUMPKIN, id: 'cinnamon-pecans-nums-the-word', family: 'cinnamon-pecans', version: 'Num’s the Word',
    title: 'Cinnamon Sugar Pecans (Num’s the Word)',
    description: 'Extra-cinnamon candied pecans with no butter.',
    categoryIds: ['snacks'], tags: ['thanksgiving', 'holiday', 'gift'],
    prepMinutes: 10, cookMinutes: 60, servings: 16, difficulty: 'Easy',
    ingredients: ['4 cups raw pecans', '1 egg white', '½ cup granulated sugar', '2 tsp ground cinnamon', '½ tsp salt'],
    steps: PECAN_STEPS,
    notes: WRITTEN,
    source: { label: 'Num’s the Word', file: THANKSGIVING },
  }),
  recipe({
    ...PUMPKIN, id: 'cinnamon-pecans-belle-of-the-kitchen', family: 'cinnamon-pecans', version: 'Belle of the Kitchen',
    title: 'Cinnamon Sugar Pecans (Belle of the Kitchen)',
    description: 'A smaller batch of candied pecans with a splash of water in the coating.',
    categoryIds: ['snacks'], tags: ['thanksgiving', 'holiday', 'gift'],
    prepMinutes: 10, cookMinutes: 60, servings: 10, difficulty: 'Easy',
    ingredients: ['2½ cups raw pecans', '1 egg white', '1 Tbsp water', '½ cup granulated sugar', '1½ tsp ground cinnamon', '¼ tsp salt'],
    steps: PECAN_STEPS,
    notes: WRITTEN,
    source: { label: 'Belle of the Kitchen', file: THANKSGIVING },
  }),

  // ---------- Chantilly Cake recipes.xlsx ----------
  recipe({
    ...CAKE, id: 'chantilly-cake-sugar-spun-run', family: 'chantilly-cake', version: 'Sugar Spun Run',
    title: 'Berry Chantilly Cake (Sugar Spun Run)',
    description: 'Buttery vanilla layers, a generous berry filling and a big batch of mascarpone whipped frosting.',
    tags: ['berries', 'birthday', 'whole foods'],
    prepMinutes: 60, cookMinutes: 30, totalMinutes: 60 + 30 + 120, servings: 12, difficulty: 'Hard',
    ingredients: [
      '## Vanilla cake', '2⅔ cups all-purpose flour (333 g)', '1 tsp baking powder', '½ tsp baking soda', '1 tsp salt',
      '12 Tbsp unsalted butter (170 g), softened', '1½ cups granulated sugar (300 g)', '½ cup light brown sugar (100 g)', '2 eggs, room temperature',
      '1 Tbsp vanilla extract', '1½ cups buttermilk (355 g), room temperature',
      '## Berry filling', '3 cups mixed berries (340 g)', '⅓ cup granulated sugar (65 g)', '3 Tbsp cornstarch (23 g)', '1½ Tbsp lemon juice', '3 Tbsp water',
      '## Chantilly frosting', '2½ cups heavy cream (590 mL), cold', '8 oz cream cheese (226 g), cold', '8 oz mascarpone (226 g), cold',
      '2 cups powdered sugar (250 g)', '2 tsp vanilla extract', 'Fresh berries, for topping',
    ],
    steps: [
      'Heat the oven to 350°F and line two 8-inch round pans.',
      'Whisk the flour, baking powder, baking soda and salt.',
      'Cream the butter and both sugars until light and fluffy.',
      'Add the eggs one at a time, then the vanilla.',
      'Add the dry ingredients in 3 parts, alternating with the buttermilk. Mix just until smooth.',
      'Divide between the pans and bake 28 to 32 minutes, until a toothpick comes out clean. Cool completely.',
      ...CHANTILLY_FINISH,
    ],
    notes: 'You made this frosting and it was good. You’d like to try it with almond extract.\nThe sheet also lists another frosting: 2 cups cream, 1½ cups powdered sugar, 8 oz each cream cheese and mascarpone, and 1 tsp almond extract.\n\n' + WRITTEN,
    source: { label: 'Sugar Spun Run', url: 'https://www.youtube.com/watch?v=saP8e68JYo4', file: CHANTILLY },
    createdAt: Date.UTC(2026, 4, 26),
  }),
  recipe({
    ...CAKE, id: 'chantilly-cake-chatgpt', family: 'chantilly-cake', version: 'ChatGPT Whole Foods Copycat',
    title: 'Berry Chantilly Cake (ChatGPT Whole Foods Copycat)',
    description: 'Cake-flour vanilla layers with a hint of almond, berries and mascarpone cream.',
    tags: ['berries', 'birthday', 'copycat', 'whole foods'],
    prepMinutes: 60, cookMinutes: 30, totalMinutes: 60 + 30 + 120, servings: 12, difficulty: 'Hard',
    ingredients: [
      '## Vanilla cake', '2¾ cups cake flour (345 g)', '2½ tsp baking powder', '½ tsp salt', '¾ cup unsalted butter (170 g), softened',
      '1¾ cups granulated sugar (350 g)', '4 eggs, room temperature', '1 Tbsp vanilla extract', '½ tsp almond extract', '1 cup whole milk (240 mL)',
      '## Berry filling', '3–4 cups mixed berries', '2–3 Tbsp granulated sugar', '1 tsp lemon juice',
      '## Chantilly frosting', '2 cups heavy cream (480 mL), very cold', '8 oz cream cheese (225 g)', '8 oz mascarpone (225 g)', '2 tsp vanilla extract',
      'Powdered sugar, to taste',
    ],
    steps: [
      'Heat the oven to 350°F and line two 8-inch round pans.',
      'Whisk the cake flour, baking powder and salt.',
      'Cream the butter and sugar until light and fluffy.',
      'Add the eggs one at a time, then the vanilla and almond extracts.',
      'Add the dry ingredients in 3 parts, alternating with the milk. Mix just until smooth.',
      'Divide between the pans and bake 28 to 32 minutes, until a toothpick comes out clean. Cool completely.',
      'Toss the berries with the sugar and lemon juice and let them sit until juicy.',
      'Beat the cream cheese, mascarpone, vanilla and powdered sugar until smooth. Add the cold cream and whip to stiff peaks.',
      'Layer the cakes with frosting and berries, frost the outside, and top with more berries. Chill before slicing.',
    ],
    notes: 'The sheet doesn’t list powdered sugar or cornstarch for this version; add sugar to taste.\n\n' + WRITTEN,
    source: { label: 'ChatGPT (Whole Foods copycat)', file: CHANTILLY },
    createdAt: Date.UTC(2026, 4, 26),
  }),

  // ---------- Chocolate Cake Recipes.xlsx ----------
  recipe({
    ...CAKE, id: 'chocolate-cake-life-love-sugar', family: 'best-chocolate-cake', version: 'Life, Love and Sugar',
    title: 'Chocolate Cake (Life, Love and Sugar)',
    description: 'A classic oil-and-buttermilk chocolate cake with hot coffee.',
    tags: ['chocolate', 'birthday', 'layer cake'],
    prepMinutes: 20, cookMinutes: 33, totalMinutes: 20 + 33 + 90, servings: 12, difficulty: 'Easy',
    ingredients: [
      '2 cups all-purpose flour (260 g)', '2 cups sugar (414 g)', '¾ cup unsweetened cocoa powder (85 g)', '2 tsp baking soda', '1 tsp salt',
      '2 eggs', '1 cup buttermilk (240 mL)', '1 cup vegetable oil (240 mL)', '1½ tsp vanilla', '1 cup hot water or hot coffee (240 mL)',
    ],
    steps: ONE_BOWL_CHOCOLATE,
    notes: 'You don’t think you’ve made this one yet.\n\n' + WRITTEN,
    source: { label: 'Life, Love and Sugar: The Best Chocolate Cake Recipe', file: CHOCOLATE },
    createdAt: Date.UTC(2026, 3, 14),
  }),
  recipe({
    ...CAKE, id: 'chocolate-cake-scientifically-sweet', family: 'best-chocolate-cake', version: 'Scientifically Sweet',
    title: 'Chocolate Cake (Scientifically Sweet)',
    description: 'A fudgy, extra-moist chocolate cake with sour cream and brown sugar.',
    tags: ['chocolate', 'birthday', 'layer cake'],
    prepMinutes: 20, cookMinutes: 33, totalMinutes: 20 + 33 + 90, servings: 12, difficulty: 'Easy',
    ingredients: [
      '1¾ cups all-purpose flour (250 g)', '1 cup sugar (200 g)', '½ cup light brown sugar (110 g)', '⅔ cup unsweetened cocoa powder (56 g)',
      '1 tsp baking soda', '1 tsp baking powder', '¾ tsp salt', '2 eggs', '¾ cup sour cream (180 mL)', '½ cup vegetable oil (120 mL)',
      '1 tsp vanilla extract', '1 cup hot coffee or hot water (240 mL)',
    ],
    steps: ONE_BOWL_CHOCOLATE,
    notes: '10/25/24: The cake was good. When you cut off the top, it was fudgy, but it ended up being good.\n\n' + WRITTEN,
    source: { label: 'Scientifically Sweet: Absolute Best Moist Chocolate Cake', file: CHOCOLATE },
    createdAt: Date.UTC(2026, 3, 14),
  }),
  recipe({
    ...CAKE, id: 'chocolate-cake-fudgiest', family: 'best-chocolate-cake', version: 'Fudgiest',
    title: 'Chocolate Cake (Fudgiest)',
    description: 'The Fudgiest, Greatest Chocolate Cake, with butter, oil and two kinds of sugar.',
    tags: ['chocolate', 'birthday', 'layer cake', 'cupcakes'],
    prepMinutes: 20, cookMinutes: 38, totalMinutes: 20 + 38 + 90, servings: 12, difficulty: 'Easy',
    ingredients: [
      '1⅔ cups all-purpose flour (208 g)', '1 cup sugar (200 g)', '1 cup light brown sugar (200 g)', '¾ cup unsweetened cocoa powder (75 g)',
      '1½ tsp baking soda', '¾ tsp salt', '½ cup unsalted butter (113 g), melted', '½ cup vegetable oil (118 mL)',
      '2 eggs plus 1 egg yolk, room temperature, lightly beaten', '2 tsp vanilla extract', '1 cup buttermilk (236 mL)', '½ cup hot coffee (118 mL)',
    ],
    steps: [
      'Heat the oven to 350°F. Line the bottoms of two 8-inch round pans with parchment, and grease and flour the sides.',
      'In a large bowl, stir together the flour, sugars, cocoa, baking soda and salt.',
      'Add the melted butter and oil and stir until the dry ingredients are moistened. The batter will be thick.',
      'Add the eggs, yolk and vanilla and stir until combined, scraping the bowl.',
      'Gradually add the buttermilk and stir well.',
      'Carefully stir in the hot coffee until the batter is uniform.',
      'Divide between the pans and bake 35 to 40 minutes, until a toothpick comes out clean or with moist crumbs.',
      'Cool 15 minutes, then turn out onto a rack to cool completely before frosting.',
    ],
    notes: 'Pans: two 9-inch, check at 27–30 minutes; three 8-inch, 23–26 minutes; three 9-inch, 20–23 minutes; about 24 cupcakes, 17–18 minutes. Dark pans bake faster.\n4/14/26 cupcakes: still stuck to the liners. Used the oil, 4 eggs and 250 g flour.',
    source: { label: 'The Fudgiest, Greatest Chocolate Cake', file: CHOCOLATE },
    createdAt: Date.UTC(2026, 3, 14),
  }),

  // ---------- Yellow cake recipes.xlsx ----------
  recipe({
    ...CAKE, id: 'yellow-cake-homemade', family: 'yellow-cake', version: 'Homemade',
    title: 'Yellow Cake (Homemade)',
    description: 'A rich all-butter yellow cake with five eggs.',
    tags: ['birthday', 'layer cake', 'vanilla'],
    prepMinutes: 25, cookMinutes: 30, servings: 12, difficulty: 'Easy',
    ingredients: ['3 cups all-purpose flour', '1 Tbsp baking powder', '½ tsp salt', '1 cup unsalted butter (8 oz), softened', '2 cups granulated sugar', '5 eggs', '1 tsp vanilla extract', '1¼ cups whole milk'],
    steps: CREAMED_YELLOW,
    notes: WRITTEN,
    source: { label: 'Homemade Yellow Cake Recipe', file: YELLOW },
    createdAt: Date.UTC(2026, 1, 4),
  }),
  recipe({
    ...CAKE, id: 'yellow-cake-tastes-better', family: 'yellow-cake', version: 'Tastes Better From Scratch',
    title: 'Yellow Cake (Tastes Better From Scratch)',
    description: 'Butter-and-oil yellow cake with buttermilk and extra yolks.',
    tags: ['birthday', 'layer cake', 'vanilla'],
    prepMinutes: 25, cookMinutes: 30, servings: 12, difficulty: 'Easy',
    ingredients: [
      '2⅔ cups all-purpose flour', '2½ tsp baking powder', '¼ tsp baking soda', '1 tsp salt', '¾ cup unsalted butter, softened', '¼ cup oil',
      '2 cups granulated sugar', '3 eggs plus 2 egg yolks', '1 Tbsp vanilla extract', '1 cup buttermilk',
    ],
    steps: CREAMED_YELLOW,
    notes: WRITTEN,
    source: { label: 'Tastes Better From Scratch', file: YELLOW },
    createdAt: Date.UTC(2026, 1, 4),
  }),
  recipe({
    ...CAKE, id: 'yellow-cake-sallys', family: 'yellow-cake', version: 'Sally’s Baking Addiction',
    title: 'Yellow Cake (Sally’s Baking Addiction)',
    description: 'The Best Yellow Cake I’ve Ever Had: cake flour, extra yolks and buttermilk.',
    tags: ['birthday', 'layer cake', 'vanilla'],
    prepMinutes: 25, cookMinutes: 28, servings: 12, difficulty: 'Medium',
    ingredients: [
      '2½ cups cake flour', '2½ tsp baking powder', '½ tsp salt', '1 cup unsalted butter (8 oz), softened', '1¾ cups granulated sugar',
      '4 egg yolks plus 2 egg whites, room temperature', '2 tsp vanilla extract', '1 cup buttermilk, room temperature', '⅛ tsp cream of tartar',
    ],
    steps: CREAMED_YELLOW,
    notes: WRITTEN,
    source: { label: 'Sally’s Baking Addiction', file: YELLOW },
    createdAt: Date.UTC(2026, 1, 4),
  }),
  recipe({
    ...CAKE, id: 'yellow-cake-better-homes', family: 'yellow-cake', version: 'Better Homes',
    title: 'Yellow Cake (Better Homes)',
    description: 'The Better Homes and Gardens yellow cake: a lighter, two-egg layer cake.',
    tags: ['birthday', 'layer cake', 'vanilla'],
    prepMinutes: 25, cookMinutes: 30, servings: 12, difficulty: 'Easy',
    ingredients: ['2½ cups all-purpose flour', '2½ tsp baking powder', '½ tsp salt', '⅔ cup unsalted butter, softened', '1¾ cups granulated sugar', '2 eggs', '1½ tsp vanilla extract', '1¼ cups whole milk'],
    steps: CREAMED_YELLOW,
    notes: WRITTEN,
    source: { label: 'Better Homes & Gardens', file: YELLOW },
    createdAt: Date.UTC(2026, 1, 4),
  }),
  recipe({
    ...CAKE, id: 'yellow-cake-chef-sanjay', family: 'yellow-cake', version: 'Chef Sanjay’s Moist Vanilla',
    title: 'Yellow Cake (Chef Sanjay’s Moist Vanilla)',
    description: 'A moist vanilla butter cake. Swap the butter for oil for a lighter crumb.',
    tags: ['birthday', 'layer cake', 'vanilla'],
    prepMinutes: 20, cookMinutes: 28, servings: 12, difficulty: 'Easy',
    ingredients: [
      '2½ cups all-purpose flour (315 g)', '2½ tsp baking powder', '½ tsp salt', '1 cup unsalted butter (230 g), softened, or 1 cup oil',
      '2 cups granulated sugar (400 g)', '4 eggs', '1 Tbsp vanilla extract', '1 cup milk (240 mL)',
    ],
    steps: [
      'Heat the oven to 350°F. Grease and line two 8-inch round pans.',
      'Whisk the flour, baking powder and salt.',
      'Cream the butter and sugar until pale and fluffy, 3 to 4 minutes.',
      'Beat in the eggs one at a time, then the vanilla.',
      'Add the flour mixture in 3 parts, alternating with the milk in 2 parts, beginning and ending with flour. Don’t overmix.',
      'Divide the batter between the pans and smooth the tops.',
      'Bake 25 to 30 minutes, until a toothpick comes out clean.',
      'Cool 10 minutes in the pans, then turn out to cool completely.',
    ],
    notes: 'For extra moisture: replace ½ cup of the milk with sour cream or yogurt, or brush the cooled layers with simple syrup before frosting.',
    source: { label: 'Chef Sanjay (Moist Vanilla Cake)', file: YELLOW },
    createdAt: Date.UTC(2026, 1, 4),
  }),
];
