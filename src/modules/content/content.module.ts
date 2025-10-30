import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { ScriptGeneratorService } from './services/script-generator.service';
import { OpenAIService } from './services/openai.service';
import { ClaudeService } from './services/claude.service';

@Module({
  controllers: [ContentController],
  providers: [
    ContentService,
    ScriptGeneratorService,
    OpenAIService,
    ClaudeService,
  ],
  exports: [ContentService],
})
export class ContentModule {}
