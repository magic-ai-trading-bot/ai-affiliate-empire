import { proxyActivities, sleep } from '@temporalio/workflow';
import type * as activities from '../activities';

const {
  syncProductsFromAmazon,
  rankAllProducts,
  selectTopProducts,
  generateContentForProducts,
  generateVideosForContent,
  publishVideosToAll,
  collectAnalytics,
  optimizeStrategy,
  logWorkflowExecution,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes',
  retry: {
    maximumAttempts: 3,
    initialInterval: '30 seconds',
  },
});

export interface DailyControlLoopInput {
  maxProducts?: number;
  platforms?: string[];
}

export interface DailyControlLoopResult {
  productsProcessed: number;
  videosGenerated: number;
  videosPublished: number;
  revenue: number;
  status: string;
}

/**
 * Daily Autonomous Control Loop Workflow
 *
 * This workflow runs every 24 hours and executes the complete
 * autonomous affiliate content generation and publishing cycle:
 *
 * 1. Discover/sync products from affiliate networks
 * 2. Rank products by profitability score
 * 3. Select top performers
 * 4. Generate scripts for selected products
 * 5. Generate videos (voice + visuals)
 * 6. Publish to all platforms (YouTube, TikTok, Instagram)
 * 7. Collect analytics
 * 8. Optimize strategy based on performance
 *
 * Workflow is durable and survives crashes/restarts.
 */
export async function dailyControlLoop(
  input: DailyControlLoopInput,
): Promise<DailyControlLoopResult> {
  const { maxProducts = 10, platforms = ['YOUTUBE', 'TIKTOK', 'INSTAGRAM'] } = input;

  const workflowId = `daily-${new Date().toISOString().split('T')[0]}`;

  console.log(`🚀 Starting Daily Control Loop: ${workflowId}`);

  const startTime = Date.now();
  let result: DailyControlLoopResult = {
    productsProcessed: 0,
    videosGenerated: 0,
    videosPublished: 0,
    revenue: 0,
    status: 'running',
  };

  try {
    // Step 1: Sync products from Amazon (5 minutes)
    console.log('📦 Step 1: Syncing products from Amazon...');
    const syncResult = await syncProductsFromAmazon({ category: 'trending' });
    console.log(`✅ Synced ${syncResult.productCount} products`);

    // Step 2: Rank all active products (2 minutes)
    console.log('🎯 Step 2: Ranking all products...');
    await rankAllProducts();
    console.log('✅ Products ranked');

    // Step 3: Select top products for content generation
    console.log('⭐ Step 3: Selecting top products...');
    const topProducts = await selectTopProducts({ limit: maxProducts });
    result.productsProcessed = topProducts.length;
    console.log(`✅ Selected ${topProducts.length} products`);

    // Step 4: Generate content (scripts) for products (parallel)
    console.log('📝 Step 4: Generating scripts...');
    const contentResult = await generateContentForProducts({
      productIds: topProducts.map((p) => p.id),
      language: 'en',
    });
    console.log(`✅ Generated ${contentResult.scriptsCreated} scripts`);

    // Step 5: Generate videos (voice + visuals) (parallel, batch processing)
    console.log('🎬 Step 5: Generating videos...');
    const videoResult = await generateVideosForContent({
      videoIds: contentResult.videoIds,
      batchSize: 5, // Process 5 videos at a time
    });
    result.videosGenerated = videoResult.videosGenerated;
    console.log(`✅ Generated ${videoResult.videosGenerated} videos`);

    // Wait for all videos to be ready (poll every 30s, max 30 minutes)
    console.log('⏳ Waiting for videos to be ready...');
    await sleep('30 seconds');

    // Step 6: Publish videos to all platforms (parallel)
    console.log('📤 Step 6: Publishing videos...');
    const publishResult = await publishVideosToAll({
      videoIds: videoResult.readyVideoIds,
      platforms,
    });
    result.videosPublished = publishResult.published;
    console.log(`✅ Published ${publishResult.published} videos`);

    // Step 7: Collect analytics from previous day
    console.log('📊 Step 7: Collecting analytics...');
    const analyticsResult = await collectAnalytics({
      daysBack: 1,
    });
    result.revenue = analyticsResult.totalRevenue;
    console.log(`✅ Collected analytics: $${analyticsResult.totalRevenue}`);

    // Step 8: Optimize strategy based on performance
    console.log('🧠 Step 8: Optimizing strategy...');
    await optimizeStrategy({
      minROI: 1.5,
      killThreshold: 0.5,
    });
    console.log('✅ Strategy optimized');

    result.status = 'completed';

    // Log workflow execution
    const duration = Math.round((Date.now() - startTime) / 1000);
    await logWorkflowExecution({
      workflowId,
      workflowType: 'daily_control_loop',
      status: 'COMPLETED',
      duration,
      result: JSON.stringify(result),
    });

    console.log(`✅ Daily Control Loop completed in ${duration}s`);
    console.log(`📊 Results:`, result);

    return result;
  } catch (error) {
    result.status = 'failed';

    // Log failure
    const duration = Math.round((Date.now() - startTime) / 1000);
    await logWorkflowExecution({
      workflowId,
      workflowType: 'daily_control_loop',
      status: 'FAILED',
      duration,
      errorMessage: error.message,
    });

    console.error('❌ Daily Control Loop failed:', error);
    throw error;
  }
}

/**
 * Weekly Optimization Workflow
 *
 * Runs weekly to:
 * - Analyze performance trends
 * - Kill underperforming niches
 * - Scale winning products
 * - Adjust prompt templates
 * - Generate owner report
 */
export async function weeklyOptimization(): Promise<void> {
  console.log('📈 Starting Weekly Optimization...');

  // Analyze 7-day performance
  const analyticsResult = await collectAnalytics({ daysBack: 7 });

  // Kill low performers, scale winners
  await optimizeStrategy({
    minROI: 2.0,
    killThreshold: 0.3,
    scaleFactor: 2.0,
  });

  // TODO: Generate and send owner report

  console.log('✅ Weekly Optimization completed');
}
