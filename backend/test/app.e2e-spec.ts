import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';

// Full-stack smoke test: boots the real AppModule (Postgres + mock provider) and exercises one request per surface.
// Needs a running Postgres reachable via DATABASE_URL (see .env) - run `npm run test:e2e` with the dev DB up.
// Unit tests under src/**/*.spec.ts cover business logic in isolation and don't need a DB.
describe('App (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => app.close());

  it('GET /catalog/countries lists destinations synced from the provider', async () => {
    const res = await request(app.getHttpServer()).get('/catalog/countries').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toMatchObject({ code: expect.any(String), name: expect.any(String), fromPriceCents: expect.any(Number) });
  });

  it('rejects an unauthenticated order attempt', async () => {
    await request(app.getHttpServer()).post('/orders').send({ packageId: 'does-not-matter' }).expect(401);
  });

  it('OTP sign-in issues a JWT that authorizes /orders', async () => {
    const identifier = `e2e-${Date.now()}@example.com`;
    const otpRes = await request(app.getHttpServer()).post('/auth/otp/request').send({ identifier }).expect(200);
    // Requires OTP_DEV_ECHO=true in .env, which the local dev setup sets by default.
    const code = otpRes.body.devCode;
    expect(code).toBeDefined();

    const verifyRes = await request(app.getHttpServer()).post('/auth/otp/verify').send({ identifier, code }).expect(200);
    const token = verifyRes.body.token;
    expect(token).toEqual(expect.any(String));

    await request(app.getHttpServer()).get('/esims').set('Authorization', `Bearer ${token}`).expect(200, []);
  });

  it('runs an order end to end against the mock provider: create -> pay -> provision -> ready', async () => {
    const identifier = `e2e-order-${Date.now()}@example.com`;
    const otpRes = await request(app.getHttpServer()).post('/auth/otp/request').send({ identifier }).expect(200);
    const verifyRes = await request(app.getHttpServer())
      .post('/auth/otp/verify')
      .send({ identifier, code: otpRes.body.devCode })
      .expect(200);
    const token = verifyRes.body.token;
    const auth = { Authorization: `Bearer ${token}` };

    const [{ body: countries }] = await Promise.all([request(app.getHttpServer()).get('/catalog/countries').expect(200)]);
    const country = countries[0].code;
    const { body: plans } = await request(app.getHttpServer()).get(`/catalog/countries/${country}/packages`).expect(200);

    const { body: order } = await request(app.getHttpServer())
      .post('/orders')
      .set(auth)
      .send({ packageId: plans[0].id })
      .expect(201);
    expect(order.status).toBe('PENDING_PAYMENT');

    // PAYMENTS_MODE=mock auto-succeeds a few seconds after this call.
    await request(app.getHttpServer()).post('/payments/stripe/checkout').set(auth).send({ orderId: order.id }).expect(201);

    const deadline = Date.now() + 20_000;
    let status = 'PENDING_PAYMENT';
    while (Date.now() < deadline && status !== 'READY' && status !== 'FAILED') {
      await new Promise((r) => setTimeout(r, 1000));
      ({ body: { status } } = await request(app.getHttpServer()).get(`/orders/${order.id}`).set(auth).expect(200));
    }
    expect(status).toBe('READY');

    const { body: esims } = await request(app.getHttpServer()).get('/esims').set(auth).expect(200);
    expect(esims).toHaveLength(1);
    expect(esims[0].iccid).toEqual(expect.any(String));
    expect(esims[0].lpaString).toMatch(/^LPA:1\$/);
  }, 30_000);
});
