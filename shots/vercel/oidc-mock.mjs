export const getVercelOidcToken = async () => 'test-token';
// Canned AI Gateway reply so the scan flow can be tested offline.
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).startsWith('https://ai-gateway.vercel.sh')) {
    const body = JSON.parse(init.body);
    globalThis.__lastScan = { images: body.messages[0].content.filter((c) => c.type === 'image').length, auth: init.headers.authorization };
    return new Response(JSON.stringify({ content: [{ type: 'tool_use', name: 'save_recipe', input: {
      found: true, title: "Grandma's Banana Bread", servings: 1, yieldUnit: 'loaf', prepMinutes: 15, cookMinutes: 60,
      ingredients: ['3 ripe bananas, mashed', '⅓ cup melted butter', '¾ cup sugar', '1 egg, beaten', '1 tsp vanilla', '1 tsp baking soda', 'Pinch of salt', '1 ½ cups flour', '## Topping', '2 Tbsp brown sugar'],
      steps: ['Preheat oven to 350°F and butter a loaf pan.', 'Mix butter into mashed bananas.', 'Stir in sugar, egg and vanilla, then soda and salt.', 'Add flour and mix just until combined.', 'Sprinkle with brown sugar and bake 60 minutes.'],
      notes: 'From Grandma, 1987.', categories: ['Breads', 'Nonexistent'], tags: ['banana'], unreadable: 'The oven temperature was smudged; 350°F is a guess.',
    } }] }), { headers: { 'content-type': 'application/json' } });
  }
  return realFetch(url, init);
};
