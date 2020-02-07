import { Application } from '@dazejs/framework';
import * as path from 'path';
import request from 'supertest';

const app = new Application(path.join(__dirname, '../daze'));

beforeAll(() => app.run(8686));
afterAll(() => app.close());

describe('consumer for java provider', () => {
  it('should invoke java provider success', async () => {
    await request(app._server).get('/java/say-hello').expect(200, 'Hello dazejs');
  });
});

describe('consumer for daze provider', () => {
  it('should invoke daze provider success', async () => {
    await request(app._server).get('/daze/say-hello').expect(200, 'Hello dazejs');
  });
});