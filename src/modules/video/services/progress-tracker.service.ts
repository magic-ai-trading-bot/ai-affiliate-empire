import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

export type ProcessingStage =
  | 'downloading'
  | 'merging'
  | 'encoding'
  | 'uploading'
  | 'completed'
  | 'failed';

export interface ProgressEvent {
  videoId: string;
  stage: ProcessingStage;
  progress: number; // 0-100
  estimatedSeconds: number;
  timestamp: Date;
  message?: string;
}

export interface ProgressHistory {
  videoId: string;
  events: ProgressEvent[];
  startTime: Date;
  endTime?: Date;
  status: 'in_progress' | 'completed' | 'failed';
}

@Injectable()
export class ProgressTrackerService {
  private readonly logger = new Logger(ProgressTrackerService.name);
  private readonly progressSubjects = new Map<string, Subject<ProgressEvent>>();
  private readonly progressHistory = new Map<string, ProgressHistory>();
  private readonly stageWeights: Record<ProcessingStage, number> = {
    downloading: 20,
    merging: 30,
    encoding: 40,
    uploading: 10,
    completed: 0,
    failed: 0,
  };

  /**
   * Emit progress event for a video
   */
  onProgress(
    videoId: string,
    stage: ProcessingStage,
    progress: number,
    estimatedSeconds: number = 0,
    message?: string,
  ): void {
    const event: ProgressEvent = {
      videoId,
      stage,
      progress: Math.min(Math.max(progress, 0), 100),
      estimatedSeconds,
      timestamp: new Date(),
      message,
    };

    this.logger.debug(`[${videoId}] ${stage}: ${progress}% - ${message || ''}`);

    // Get or create subject for this video
    let subject = this.progressSubjects.get(videoId);
    if (!subject) {
      subject = new Subject<ProgressEvent>();
      this.progressSubjects.set(videoId, subject);
    }

    // Emit event
    subject.next(event);

    // Update history
    this.updateHistory(videoId, event);

    // Check for timeout
    this.checkTimeout(videoId);
  }

  /**
   * Subscribe to progress events for a specific video
   */
  subscribe(videoId: string): Observable<ProgressEvent> {
    let subject = this.progressSubjects.get(videoId);
    if (!subject) {
      subject = new Subject<ProgressEvent>();
      this.progressSubjects.set(videoId, subject);
    }

    return subject.asObservable();
  }

  /**
   * Get progress history for a video
   */
  getHistory(videoId: string): ProgressHistory | undefined {
    return this.progressHistory.get(videoId);
  }

  /**
   * Get all active video processing
   */
  getActiveVideos(): string[] {
    const active: string[] = [];
    this.progressHistory.forEach((history, videoId) => {
      if (history.status === 'in_progress') {
        active.push(videoId);
      }
    });
    return active;
  }

  /**
   * Start tracking a new video
   */
  startTracking(videoId: string): void {
    this.logger.log(`Starting progress tracking for video: ${videoId}`);

    const history: ProgressHistory = {
      videoId,
      events: [],
      startTime: new Date(),
      status: 'in_progress',
    };

    this.progressHistory.set(videoId, history);

    // Emit initial event
    this.onProgress(videoId, 'downloading', 0, 0, 'Starting video processing');
  }

  /**
   * Complete tracking for a video
   */
  completeTracking(videoId: string, success: boolean = true): void {
    const history = this.progressHistory.get(videoId);
    if (!history) {
      this.logger.warn(`No history found for video: ${videoId}`);
      return;
    }

    history.endTime = new Date();
    history.status = success ? 'completed' : 'failed';

    const duration = history.endTime.getTime() - history.startTime.getTime();
    this.logger.log(
      `Video ${videoId} ${success ? 'completed' : 'failed'} in ${Math.round(duration / 1000)}s`,
    );

    // Emit final event
    const finalStage: ProcessingStage = success ? 'completed' : 'failed';
    this.onProgress(
      videoId,
      finalStage,
      100,
      0,
      success ? 'Video processing completed' : 'Video processing failed',
    );

    // Complete the subject
    const subject = this.progressSubjects.get(videoId);
    if (subject) {
      subject.complete();
    }

    // Cleanup old history after some time
    setTimeout(() => {
      this.progressSubjects.delete(videoId);
    }, 60000); // Keep for 1 minute after completion
  }

  /**
   * Calculate overall progress based on stage and progress
   */
  calculateOverallProgress(stage: ProcessingStage, stageProgress: number): number {
    const stages: ProcessingStage[] = ['downloading', 'merging', 'encoding', 'uploading'];
    const stageIndex = stages.indexOf(stage);

    if (stageIndex === -1) {
      return 100; // completed or failed
    }

    let totalProgress = 0;

    // Add completed stages
    for (let i = 0; i < stageIndex; i++) {
      totalProgress += this.stageWeights[stages[i]];
    }

    // Add current stage progress
    totalProgress += (this.stageWeights[stage] * stageProgress) / 100;

    return Math.min(totalProgress, 100);
  }

  /**
   * Estimate time remaining based on progress
   */
  estimateTimeRemaining(videoId: string): number {
    const history = this.progressHistory.get(videoId);
    if (!history || history.events.length === 0) {
      return 0;
    }

    const latestEvent = history.events[history.events.length - 1];
    const elapsedMs = new Date().getTime() - history.startTime.getTime();
    const overallProgress = this.calculateOverallProgress(latestEvent.stage, latestEvent.progress);

    if (overallProgress === 0) {
      return 0;
    }

    const estimatedTotalMs = (elapsedMs / overallProgress) * 100;
    const remainingMs = estimatedTotalMs - elapsedMs;

    return Math.max(Math.round(remainingMs / 1000), 0);
  }

  /**
   * Get current status summary for a video
   */
  getStatus(videoId: string): {
    stage: ProcessingStage;
    progress: number;
    overallProgress: number;
    estimatedSeconds: number;
    status: string;
  } | null {
    const history = this.progressHistory.get(videoId);
    if (!history || history.events.length === 0) {
      return null;
    }

    const latestEvent = history.events[history.events.length - 1];
    const overallProgress = this.calculateOverallProgress(latestEvent.stage, latestEvent.progress);
    const estimatedSeconds = this.estimateTimeRemaining(videoId);

    return {
      stage: latestEvent.stage,
      progress: latestEvent.progress,
      overallProgress,
      estimatedSeconds,
      status: history.status,
    };
  }

  /**
   * Cleanup all history
   */
  cleanup(): void {
    this.logger.log('Cleaning up progress tracking data');
    this.progressSubjects.clear();
    this.progressHistory.clear();
  }

  /**
   * Private: Update history with new event
   */
  private updateHistory(videoId: string, event: ProgressEvent): void {
    const history = this.progressHistory.get(videoId);
    if (history) {
      history.events.push(event);
    }
  }

  /**
   * Private: Check for timeout (no progress in 30s)
   */
  private checkTimeout(videoId: string): void {
    const history = this.progressHistory.get(videoId);
    if (!history || history.events.length === 0) {
      return;
    }

    const latestEvent = history.events[history.events.length - 1];
    const now = new Date().getTime();
    const timeSinceLastUpdate = now - latestEvent.timestamp.getTime();

    if (timeSinceLastUpdate > 30000 && history.status === 'in_progress') {
      this.logger.warn(`Video ${videoId} may be stuck (no progress for 30s)`);
      // Could emit a warning event here
    }
  }
}
