import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { ScriptGeneratorService } from './services/script-generator.service';
import { OpenAIService } from './services/openai.service';
import { ClaudeService } from './services/claude.service';
import { BlogSearchService } from './services/blog-search.service';
import { ComplianceModule } from '@/common/compliance/compliance.module';

@Module({
  imports: [ComplianceModule],
  controllers: [ContentController],
  providers: [
    ContentService,
    ScriptGeneratorService,
    OpenAIService,
    ClaudeService,
    BlogSearchService,
  ],
  exports: [ContentService, BlogSearchService],
})
export class ContentModule {}
