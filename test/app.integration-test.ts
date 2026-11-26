import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../src/app.module.js';
import { AppService } from './../src/app.service.js';

describe('AppModule integration', () => {
  let app: Awaited<ReturnType<TestingModule['createNestApplication']>>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('wires AppService through the real application module', () => {
    expect(app.get(AppService).getHello()).toBe('Hello World!');
  });

  afterAll(async () => {
    await app?.close();
  });
});
