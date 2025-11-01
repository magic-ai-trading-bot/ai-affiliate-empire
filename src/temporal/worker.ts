// import { NestFactory } from '@nestjs/core';
import { Worker } from '@temporalio/worker';
import * as activities from './activities';
// import { AppModule } from '../app.module';

/**
 * Temporal Worker
 *
 * Executes workflow and activity code.
 * Must run separately from the main API server.
 *
 * Start with: npm run temporal:worker
 */
async function run() {
  // Initialize Nest.js app for dependency injection
  // const _app = await NestFactory.createApplicationContext(AppModule);
  console.log('✅ Nest.js application context initialized');

  const temporalAddress = process.env.TEMPORAL_ADDRESS || 'localhost:7233';

  console.log(`🔧 Starting Temporal Worker...`);
  console.log(`Temporal Server: ${temporalAddress}`);

  const worker = await Worker.create({
    workflowsPath: require.resolve('./workflows'),
    activities,
    taskQueue: 'ai-affiliate-empire',
    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
  });

  console.log('✅ Temporal Worker created');
  console.log('👂 Listening for workflows on task queue: ai-affiliate-empire');

  await worker.run();
}

run().catch((err) => {
  console.error('❌ Worker failed:', err);
  process.exit(1);
});
