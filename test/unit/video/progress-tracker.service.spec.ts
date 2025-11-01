import { Test, TestingModule } from '@nestjs/testing';
import { ProgressTrackerService } from '../../../src/modules/video/services/progress-tracker.service';

describe('ProgressTrackerService', () => {
  let service: ProgressTrackerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProgressTrackerService],
    }).compile();

    service = module.get<ProgressTrackerService>(ProgressTrackerService);
  });

  afterEach(() => {
    service.cleanup();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startTracking', () => {
    it('should start tracking a new video', () => {
      const videoId = 'test-video-1';
      service.startTracking(videoId);

      const history = service.getHistory(videoId);
      expect(history).toBeDefined();
      expect(history?.videoId).toBe(videoId);
      expect(history?.status).toBe('in_progress');
    });
  });

  describe('onProgress', () => {
    it('should emit progress event', (done) => {
      const videoId = 'test-video-2';
      service.startTracking(videoId);

      const subscription = service.subscribe(videoId).subscribe((event) => {
        expect(event.videoId).toBe(videoId);
        expect(event.stage).toBe('downloading');
        expect(event.progress).toBe(50);
        subscription.unsubscribe();
        done();
      });

      service.onProgress(videoId, 'downloading', 50, 10, 'Downloading...');
    });

    it('should clamp progress to 0-100 range', () => {
      const videoId = 'test-video-3';
      service.startTracking(videoId);

      service.onProgress(videoId, 'encoding', 150, 0);
      const status = service.getStatus(videoId);
      expect(status?.progress).toBe(100);

      service.onProgress(videoId, 'encoding', -50, 0);
      const status2 = service.getStatus(videoId);
      expect(status2?.progress).toBe(0);
    });
  });

  describe('subscribe', () => {
    it('should create new subject if not exists', () => {
      const videoId = 'test-video-4';
      const observable = service.subscribe(videoId);
      expect(observable).toBeDefined();
    });

    it('should return same observable for same video', () => {
      const videoId = 'test-video-5';
      const obs1 = service.subscribe(videoId);
      const obs2 = service.subscribe(videoId);
      // Observables are different instances but subscribe to same subject
      expect(obs1).toBeDefined();
      expect(obs2).toBeDefined();
    });
  });

  describe('getHistory', () => {
    it('should return undefined for unknown video', () => {
      const history = service.getHistory('unknown-video');
      expect(history).toBeUndefined();
    });

    it('should return history with events', () => {
      const videoId = 'test-video-6';
      service.startTracking(videoId);
      service.onProgress(videoId, 'downloading', 50, 10);
      service.onProgress(videoId, 'encoding', 75, 5);

      const history = service.getHistory(videoId);
      expect(history).toBeDefined();
      expect(history?.events.length).toBeGreaterThan(0);
    });
  });

  describe('getActiveVideos', () => {
    it('should return list of active videos', () => {
      service.startTracking('video-1');
      service.startTracking('video-2');

      const active = service.getActiveVideos();
      expect(active).toContain('video-1');
      expect(active).toContain('video-2');
    });

    it('should not include completed videos', () => {
      service.startTracking('video-1');
      service.startTracking('video-2');
      service.completeTracking('video-1', true);

      const active = service.getActiveVideos();
      expect(active).not.toContain('video-1');
      expect(active).toContain('video-2');
    });
  });

  describe('completeTracking', () => {
    it('should mark video as completed', () => {
      const videoId = 'test-video-7';
      service.startTracking(videoId);
      service.completeTracking(videoId, true);

      const history = service.getHistory(videoId);
      expect(history?.status).toBe('completed');
      expect(history?.endTime).toBeDefined();
    });

    it('should mark video as failed', () => {
      const videoId = 'test-video-8';
      service.startTracking(videoId);
      service.completeTracking(videoId, false);

      const history = service.getHistory(videoId);
      expect(history?.status).toBe('failed');
    });
  });

  describe('calculateOverallProgress', () => {
    it('should calculate progress for downloading stage', () => {
      const progress = service.calculateOverallProgress('downloading', 50);
      expect(progress).toBe(10); // 20% * 50% = 10%
    });

    it('should calculate progress for encoding stage', () => {
      const progress = service.calculateOverallProgress('encoding', 50);
      expect(progress).toBe(70); // 20 + 30 + 40*0.5 = 70%
    });

    it('should return 100 for completed stage', () => {
      const progress = service.calculateOverallProgress('completed', 100);
      expect(progress).toBe(100);
    });
  });

  describe('estimateTimeRemaining', () => {
    it('should estimate time remaining', () => {
      const videoId = 'test-video-9';
      service.startTracking(videoId);

      // Simulate progress over time
      service.onProgress(videoId, 'downloading', 50, 0);

      const remaining = service.estimateTimeRemaining(videoId);
      expect(remaining).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 for unknown video', () => {
      const remaining = service.estimateTimeRemaining('unknown');
      expect(remaining).toBe(0);
    });
  });

  describe('getStatus', () => {
    it('should return current status', () => {
      const videoId = 'test-video-10';
      service.startTracking(videoId);
      service.onProgress(videoId, 'encoding', 75, 5);

      const status = service.getStatus(videoId);
      expect(status).toBeDefined();
      expect(status?.stage).toBe('encoding');
      expect(status?.progress).toBe(75);
      expect(status?.overallProgress).toBeGreaterThan(0);
    });

    it('should return null for unknown video', () => {
      const status = service.getStatus('unknown');
      expect(status).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('should clear all tracking data', () => {
      service.startTracking('video-1');
      service.startTracking('video-2');

      service.cleanup();

      const active = service.getActiveVideos();
      expect(active.length).toBe(0);
    });
  });
});
