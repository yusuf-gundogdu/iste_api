import { FcmPushSender } from './fcm-push-sender';
import { PrismaService } from '../prisma/prisma.service';

// firebase-admin ve fs mock'lanır: gerçek FCM'e / diske dokunulmaz.
const initializeApp = jest.fn((_config?: unknown, _name?: unknown) => ({
  name: 'iste-push',
}));
const getApp = jest.fn((_name?: unknown): { name: string } => {
  throw new Error('no app');
});
const cert = jest.fn((sa: unknown) => sa);
const sendEachForMulticast = jest.fn();
const getMessaging = jest.fn((_app?: unknown) => ({ sendEachForMulticast }));

jest.mock('firebase-admin/app', () => ({
  initializeApp: (config: unknown, name: unknown) =>
    initializeApp(config, name),
  getApp: (name: unknown) => getApp(name),
  cert: (sa: unknown) => cert(sa),
}));
jest.mock('firebase-admin/messaging', () => ({
  getMessaging: (app: unknown) => getMessaging(app),
}));
jest.mock('node:fs', () => ({
  readFileSync: jest.fn(() =>
    JSON.stringify({
      project_id: 'demo',
      client_email: 'x@demo.iam',
      private_key: 'key',
    }),
  ),
}));

describe('FcmPushSender', () => {
  const findMany = jest.fn();
  const deleteMany = jest.fn();
  const prisma = {
    deviceToken: { findMany, deleteMany },
  } as unknown as PrismaService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FIREBASE_SERVICE_ACCOUNT = './firebase-service-account.json';
    getApp.mockImplementation(() => {
      throw new Error('no app');
    });
  });

  it('token yoksa hiç göndermez', async () => {
    findMany.mockResolvedValue([]);
    const sender = new FcmPushSender(prisma);
    await sender.send('u1', 'Başlık', 'Gövde');
    expect(sendEachForMulticast).not.toHaveBeenCalled();
    expect(initializeApp).not.toHaveBeenCalled();
  });

  it('kullanıcının tüm token’larına multicast gönderir ve app’i bir kez başlatır', async () => {
    findMany.mockResolvedValue([{ token: 't1' }, { token: 't2' }]);
    sendEachForMulticast.mockResolvedValue({
      failureCount: 0,
      responses: [{ success: true }, { success: true }],
    });
    const sender = new FcmPushSender(prisma);

    await sender.send('u1', 'Başlık', 'Gövde', { k: 'v' });
    await sender.send('u1', 'Başlık2', 'Gövde2');

    expect(initializeApp).toHaveBeenCalledTimes(1); // idempotent init
    expect(sendEachForMulticast).toHaveBeenCalledTimes(2);
    const firstCall = sendEachForMulticast.mock.calls[0][0] as {
      tokens: string[];
      notification: { title: string; body: string };
      data?: Record<string, string>;
    };
    expect(firstCall.tokens).toEqual(['t1', 't2']);
    expect(firstCall.notification).toEqual({ title: 'Başlık', body: 'Gövde' });
    expect(firstCall.data).toEqual({ k: 'v' });
  });

  it('kayıtsız token’ları DB’den siler', async () => {
    findMany.mockResolvedValue([{ token: 't1' }, { token: 'bad' }]);
    sendEachForMulticast.mockResolvedValue({
      failureCount: 1,
      responses: [
        { success: true },
        {
          success: false,
          error: { code: 'messaging/registration-token-not-registered' },
        },
      ],
    });
    deleteMany.mockResolvedValue({ count: 1 });
    const sender = new FcmPushSender(prisma);

    await sender.send('u1', 'T', 'B');

    expect(deleteMany).toHaveBeenCalledWith({
      where: { token: { in: ['bad'] } },
    });
  });

  it('geçici hatada token silmez', async () => {
    findMany.mockResolvedValue([{ token: 't1' }]);
    sendEachForMulticast.mockResolvedValue({
      failureCount: 1,
      responses: [
        { success: false, error: { code: 'messaging/internal-error' } },
      ],
    });
    const sender = new FcmPushSender(prisma);

    await sender.send('u1', 'T', 'B');

    expect(deleteMany).not.toHaveBeenCalled();
  });
});
