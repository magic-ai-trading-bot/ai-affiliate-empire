import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './common/database/database.module';
import { ProductModule } from './modules/product/product.module';
import { ContentModule } from './modules/content/content.module';
import { VideoModule } from './modules/video/video.module';
import { PublisherModule } from './modules/publisher/publisher.module';
import { OrchestratorModule } from './modules/orchestrator/orchestrator.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { OptimizerModule } from './modules/optimizer/optimizer.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    ProductModule,
    ContentModule,
    VideoModule,
    PublisherModule,
    OrchestratorModule,
    AnalyticsModule,
    OptimizerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
