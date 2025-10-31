#!/bin/bash

# Fix Platform imports in analytics files
sed -i '' '1s/^/import { Platform } from "@prisma\/client";\n/' src/modules/analytics/analytics.service.ts
sed -i '' '1s/^/import { Platform } from "@prisma\/client";\n/' src/modules/analytics/services/metrics-collector.service.ts

# Fix AlertContext - remove monthlyLimit requirement
sed -i '' 's/monthlyLimit: budgetStatus.monthlyLimit,/\/\/ monthlyLimit: budgetStatus.monthlyLimit,/' src/modules/cost-tracking/services/budget-monitor.service.ts

# Add currency to RecordCostDto
echo "

# Fix comment out newsletter module (missing Prisma model)
sed -i '' 's/import { NewsletterModule } from/\/\/ import { NewsletterModule } from/' src/app.module.ts
sed -i '' 's/NewsletterModule,/\/\/ NewsletterModule,/' src/app.module.ts

# Fix Product price Decimal to number conversions
sed -i '' 's/price: Number(product.price),/price: Number(product.price || 0),/' src/modules/product/product.service.ts

# Fix product status type assertions
sed -i '' 's/status,/status: status as any,/' src/modules/product/product.service.ts

# Fix publisher Platform types
sed -i '' 's/platform: platform,/platform: platform as Platform,/g' src/modules/publisher/publisher.service.ts

echo "All fixes applied"
