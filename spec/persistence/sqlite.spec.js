// Usa una DB efímera en RAM (¡pon esto ANTES del require!)
process.env.SQLITE_DB_LOCATION = ':memory:';

const db = require('../../src/persistence/sqlite');

const ITEM = {
  id: '7aef3d7c-d301-4846-8358-2a91ec9d6be3',
  name: 'Test',
  completed: false,
};

beforeAll(async () => {
  await db.init();      // crea tabla en memoria
});

afterAll(async () => {
  await db.teardown();  // cierra conexión
});

// Limpia entre tests usando SOLO la API pública
beforeEach(async () => {
  const items = await db.getItems();
  await Promise.all(items.map(i => db.removeItem(i.id)));
});

test('it initializes correctly', async () => {
  expect(true).toBe(true);
});

test('it can store and retrieve items', async () => {
  await db.storeItem(ITEM);
  const items = await db.getItems();
  expect(items.length).toBe(1);
  expect(items[0]).toEqual(ITEM);
});

test('it can update an existing item', async () => {
  const initial = await db.getItems();
  expect(initial.length).toBe(0);

  await db.storeItem(ITEM);
  await db.updateItem(ITEM.id, { ...ITEM, completed: !ITEM.completed });

  const items = await db.getItems();
  expect(items.length).toBe(1);
  expect(items[0].completed).toBe(true);
});

test('it can remove an existing item', async () => {
  await db.storeItem(ITEM);
  await db.removeItem(ITEM.id);
  const items = await db.getItems();
  expect(items.length).toBe(0);
});

test('it can get a single item', async () => {
  await db.storeItem(ITEM);
  const item = await db.getItem(ITEM.id);
  expect(item).toEqual(ITEM);
});
