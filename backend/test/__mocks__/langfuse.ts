// Stub for langfuse — prevents dynamic import() crash in Jest CJS mode.
export const Langfuse = jest.fn().mockImplementation(() => ({
  trace: jest.fn().mockReturnValue({
    generation: jest.fn().mockReturnValue({ end: jest.fn() }),
    update: jest.fn(),
  }),
  flush: jest.fn().mockResolvedValue(undefined),
  shutdownAsync: jest.fn().mockResolvedValue(undefined),
}));
