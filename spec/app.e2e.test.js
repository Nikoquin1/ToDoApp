try {
  require('dotenv').config({ path: '.env.test' });
} catch (_) {}

const express = require('express');
const request = require('supertest');

// importa TUS rutas reales
const addItem     = require('../src/routes/addItem');
const getItems    = require('../src/routes/getItems');
const updateItem  = require('../src/routes/updateItem');
const deleteItem  = require('../src/routes/deleteItem');

// persistencia real
const db = require('../src/persistence');

function makeApp() {
  const app = express();
  app.use(express.json());

  app.post('/items', addItem);
  app.get('/items', getItems);
  app.put('/items/:id', updateItem);
  app.delete('/items/:id', deleteItem);

  return app;
}

describe('Todo API (E2E con MySQL)', () => {
  let app;
  let created;
  jest.setTimeout(60000);

  beforeAll(async () => {
    await db.init();
    app = makeApp();
  });

  afterAll(async () => {
    await db.teardown();
  });

  test('POST /items crea un item', async () => {
    const res = await request(app)
      .post('/items')
      .send({ name: 'Primera tarea' })
      .expect(200);

    expect(res.body).toHaveProperty('id');
    expect(res.body).toMatchObject({ name: 'Primera tarea', completed: false });
    created = res.body;
  });

  test('GET /items contiene el creado', async () => {
    const res = await request(app).get('/items').expect(200);
    const ids = res.body.map(i => i.id);
    expect(ids).toContain(created.id);
  });

  test('PUT /items/:id actualiza', async () => {
    const res = await request(app)
      .put(`/items/${created.id}`)
      .send({ name: 'Tarea editada', completed: true })
      .expect(200);

    expect(res.body).toMatchObject({ id: created.id, name: 'Tarea editada', completed: true });
  });

  test('DELETE /items/:id elimina', async () => {
    await request(app).delete(`/items/${created.id}`).expect(200);
    const res = await request(app).get('/items').expect(200);
    const ids = res.body.map(i => i.id);
    expect(ids).not.toContain(created.id);
  });
});
