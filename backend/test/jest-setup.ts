jest.mock('langfuse', () => {
  return {
    Langfuse: jest.fn().mockImplementation(() => {
      return {
        trace: jest.fn().mockReturnValue({
          generation: jest.fn().mockReturnValue({
            update: jest.fn(),
          }),
        }),
        shutdownAsync: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});
