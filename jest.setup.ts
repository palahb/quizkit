let mockIdCounter = 0;
jest.mock('expo-crypto', () => ({
  randomUUID: () => `id-${++mockIdCounter}`,
}));
