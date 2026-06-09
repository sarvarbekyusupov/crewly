import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Response } from 'express';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: { getHello: jest.fn().mockReturnValue('Hello World!') },
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  describe('getHello', () => {
    it('should return "Hello World!"', () => {
      expect(controller.getHello()).toBe('Hello World!');
    });
  });

  describe('handleHhCallbackRedirect', () => {
    it('should redirect to candidate-portal callback with query params', () => {
      const mockResponse = {
        redirect: jest.fn(),
      } as unknown as Response;

      const query = { code: '123', state: 'abc' };
      controller.handleHhCallbackRedirect(query, mockResponse);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        '/api/v1/candidate-portal/hh/callback?code=123&state=abc',
      );
    });
  });
});
