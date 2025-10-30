import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './common/database/database.module';
import { ProductModule } from './modules/product/product.module';
import { ContentModule } from './modules/content/content.module';
import { VideoModule } from './modules/video/video.module';
import { PublisherModule } from './modules/publisher/publisher.module';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
