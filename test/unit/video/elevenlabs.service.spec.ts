/**
 * Unit tests for ElevenLabsService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ElevenLabsService, ElevenLabsError } from '@/modules/video/services/elevenlabs.service';
import { SecretsManagerService } from '@/common/secrets/secrets-manager.service';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('axios');
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
  },
}));
jest.mock('@aws-sdk/client-secrets-manager');

describe('ElevenLabsService', () => {
  let service: ElevenLabsService;
  let configService: ConfigService;
  let secretsManager: SecretsManagerService;
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  const mockedFs = fs as jest.Mocked<typeof fs>;

  const mockConfig: Record<string, string> = {
    ELEVENLABS_VOICE_ID: 'test-voice-id',
    ELEVENLABS_MOCK_MODE: 'false',
    STORAGE_DIR: '/tmp/test-audio',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElevenLabsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
        {
          provide: SecretsManagerService,
          useValue: {
            getSecret: jest.fn().mockResolvedValue('test-api-key'),
          },
        },
      ],
    }).compile();

    service = module.get<ElevenLabsService>(ElevenLabsService);
    configService = module.get<ConfigService>(ConfigService);
    secretsManager = module.get<SecretsManagerService>(SecretsManagerService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with API key from secrets manager', async () => {
      await service.onModuleInit();
      expect(secretsManager.getSecret).toHaveBeenCalledWith('elevenlabs-api-key', 'ELEVENLABS_API_KEY');
      expect(service.isConfigured()).toBe(true);
    });

    it('should warn when running in mock mode', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      jest.spyOn(configService, 'get').mockReturnValue('true');

      const testModule = await Test.createTestingModule({
        providers: [
          ElevenLabsService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => key === 'ELEVENLABS_MOCK_MODE' ? 'true' : mockConfig[key]),
            },
          },
          {
            provide: SecretsManagerService,
            useValue: {
              getSecret: jest.fn().mockResolvedValue(null),
            },
          },
        ],
      }).compile();

      const mockService = testModule.get<ElevenLabsService>(ElevenLabsService);
      await mockService.onModuleInit();

      expect(consoleSpy).toHaveBeenCalledWith('⚠️  ElevenLabs running in MOCK MODE');
      consoleSpy.mockRestore();
    });

    it('should warn when API key is not found', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      jest.spyOn(secretsManager, 'getSecret').mockResolvedValue(null);

      await service.onModuleInit();

      expect(consoleSpy).toHaveBeenCalledWith('⚠️  ElevenLabs API key not found, running in MOCK MODE');
      consoleSpy.mockRestore();
    });

    it('should create storage directory if it does not exist', () => {
      mockedFs.existsSync = jest.fn().mockReturnValue(false);

      const testModule = Test.createTestingModule({
        providers: [
          ElevenLabsService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => mockConfig[key]),
            },
          },
          {
            provide: SecretsManagerService,
            useValue: {
              getSecret: jest.fn().mockResolvedValue('test-api-key'),
            },
          },
        ],
      }).compile();

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith('/tmp/test-audio', { recursive: true });
    });
  });

  describe('generateVoice', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should generate voice with default parameters', async () => {
      const mockAudioData = Buffer.from('mock-audio-data');
      mockedAxios.post = jest.fn().mockResolvedValue({
        data: mockAudioData,
      });

      const result = await service.generateVoice({
        text: 'Hello world',
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.elevenlabs.io/v1/text-to-speech/test-voice-id',
        {
          text: 'Hello world',
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        },
        {
          headers: {
            'xi-api-key': 'test-api-key',
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
          },
          responseType: 'arraybuffer',
        },
      );

      expect(mockedFs.writeFileSync).toHaveBeenCalled();
      expect(result).toContain('/tmp/test-audio/voice-');
      expect(result).toContain('.mp3');
    });

    it('should generate voice with custom voice ID', async () => {
      const mockAudioData = Buffer.from('mock-audio-data');
      mockedAxios.post = jest.fn().mockResolvedValue({
        data: mockAudioData,
      });

      await service.generateVoice({
        text: 'Hello world',
        voiceId: 'custom-voice-id',
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('custom-voice-id'),
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should generate voice with custom stability and similarity boost', async () => {
      const mockAudioData = Buffer.from('mock-audio-data');
      mockedAxios.post = jest.fn().mockResolvedValue({
        data: mockAudioData,
      });

      await service.generateVoice({
        text: 'Hello world',
        stability: 0.8,
        similarityBoost: 0.9,
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          voice_settings: {
            stability: 0.8,
            similarity_boost: 0.9,
          },
        }),
        expect.any(Object),
      );
    });

    it('should return mock audio URL when in mock mode', async () => {
      jest.spyOn(service, 'isConfigured').mockReturnValue(false);

      const result = await service.generateVoice({
        text: 'Hello world',
      });

      expect(result).toBe('https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav');
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should save audio file to storage directory', async () => {
      const mockAudioData = Buffer.from('mock-audio-data');
      mockedAxios.post = jest.fn().mockResolvedValue({
        data: mockAudioData,
      });

      const result = await service.generateVoice({
        text: 'Hello world',
      });

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.mp3'),
        expect.any(Buffer),
      );
    });

    it('should handle API errors and throw ElevenLabsError', async () => {
      mockedAxios.post = jest.fn().mockRejectedValue({
        response: {
          data: { error: 'Invalid API key' },
        },
        message: 'Request failed',
      });

      await expect(
        service.generateVoice({
          text: 'Hello world',
        }),
      ).rejects.toThrow(ElevenLabsError);
    });

    it('should handle 401 unauthorized error', async () => {
      mockedAxios.post = jest.fn().mockRejectedValue({
        response: {
          status: 401,
          data: { error: 'Unauthorized' },
        },
      });

      await expect(
        service.generateVoice({
          text: 'Hello world',
        }),
      ).rejects.toThrow(ElevenLabsError);
    });

    it('should handle 429 rate limit error', async () => {
      mockedAxios.post = jest.fn().mockRejectedValue({
        response: {
          status: 429,
          data: { error: 'Rate limit exceeded' },
        },
      });

      await expect(
        service.generateVoice({
          text: 'Hello world',
        }),
      ).rejects.toThrow(ElevenLabsError);
    });

    it('should handle 500 server error', async () => {
      mockedAxios.post = jest.fn().mockRejectedValue({
        response: {
          status: 500,
          data: { error: 'Internal server error' },
        },
      });

      await expect(
        service.generateVoice({
          text: 'Hello world',
        }),
      ).rejects.toThrow(ElevenLabsError);
    });

    it('should handle network errors', async () => {
      mockedAxios.post = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        service.generateVoice({
          text: 'Hello world',
        }),
      ).rejects.toThrow(ElevenLabsError);
    });

    it('should generate voice for long text', async () => {
      const mockAudioData = Buffer.from('mock-audio-data');
      mockedAxios.post = jest.fn().mockResolvedValue({
        data: mockAudioData,
      });

      const longText = 'This is a very long text. '.repeat(100);

      await service.generateVoice({
        text: longText,
      });

      expect(mockedAxios.post).toHaveBeenCalled();
    });
  });

  describe('getVoices', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should fetch available voices', async () => {
      const mockVoices = [
        { voice_id: 'voice1', name: 'Voice 1' },
        { voice_id: 'voice2', name: 'Voice 2' },
      ];

      mockedAxios.get = jest.fn().mockResolvedValue({
        data: { voices: mockVoices },
      });

      const result = await service.getVoices();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.elevenlabs.io/v1/voices',
        {
          headers: {
            'xi-api-key': 'test-api-key',
          },
        },
      );

      expect(result).toEqual(mockVoices);
    });

    it('should return empty array when in mock mode', async () => {
      jest.spyOn(service, 'isConfigured').mockReturnValue(false);

      const result = await service.getVoices();

      expect(result).toEqual([]);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should handle errors when fetching voices', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockedAxios.get = jest.fn().mockRejectedValue(new Error('API error'));

      const result = await service.getVoices();

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('isConfigured', () => {
    it('should return true when API key is set and not in mock mode', async () => {
      await service.onModuleInit();
      expect(service.isConfigured()).toBe(true);
    });

    it('should return false when in mock mode', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'ELEVENLABS_MOCK_MODE') return 'true';
        return mockConfig[key];
      });

      const testModule = await Test.createTestingModule({
        providers: [
          ElevenLabsService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => key === 'ELEVENLABS_MOCK_MODE' ? 'true' : mockConfig[key]),
            },
          },
          {
            provide: SecretsManagerService,
            useValue: {
              getSecret: jest.fn().mockResolvedValue('test-api-key'),
            },
          },
        ],
      }).compile();

      const mockService = testModule.get<ElevenLabsService>(ElevenLabsService);
      await mockService.onModuleInit();

      expect(mockService.isConfigured()).toBe(false);
    });
  });

  describe('language support', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should handle English text', async () => {
      const mockAudioData = Buffer.from('mock-audio-data');
      mockedAxios.post = jest.fn().mockResolvedValue({
        data: mockAudioData,
      });

      await service.generateVoice({
        text: 'Hello, this is an English test.',
      });

      expect(mockedAxios.post).toHaveBeenCalled();
    });

    it('should handle Vietnamese text', async () => {
      const mockAudioData = Buffer.from('mock-audio-data');
      mockedAxios.post = jest.fn().mockResolvedValue({
        data: mockAudioData,
      });

      await service.generateVoice({
        text: 'Xin chào, đây là bài kiểm tra tiếng Việt.',
      });

      expect(mockedAxios.post).toHaveBeenCalled();
    });

    it('should handle Spanish text', async () => {
      const mockAudioData = Buffer.from('mock-audio-data');
      mockedAxios.post = jest.fn().mockResolvedValue({
        data: mockAudioData,
      });

      await service.generateVoice({
        text: 'Hola, esta es una prueba en español.',
      });

      expect(mockedAxios.post).toHaveBeenCalled();
    });
  });
});
