# Load Testing Framework Installation Guide

Quick guide to get started with load testing.

## 1. Install k6

### macOS
```bash
brew install k6
```

### Linux (Debian/Ubuntu)
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Windows
```bash
choco install k6
```

### Alternative: Use Docker
```bash
docker pull grafana/k6:latest

# Run tests with Docker
docker run --rm -v $(pwd):/app grafana/k6:latest run /app/test/load/scenarios/baseline.js
```

## 2. Verify Installation

```bash
k6 version
```

Expected output: `k6 v0.47.0 (or later)`

## 3. Run Your First Test

```bash
# Start the application
npm run start:dev

# In another terminal, run baseline test
npm run test:load:baseline
```

## 4. Available NPM Scripts

```bash
# Run all load tests
npm run test:load

# Run specific tests
npm run test:load:baseline      # Quick baseline (5 min)
npm run test:load:stress        # Stress test (30 min)
npm run test:load:spike         # Spike test (10 min)
npm run test:load:soak          # Soak test (2 hours)
npm run test:load:products      # Products endpoints
npm run test:load:analytics     # Analytics endpoints
npm run test:load:orchestrator  # Orchestrator endpoints

# Run on different environments
npm run test:load:staging       # Test staging
npm run test:load:production    # Test production (requires approval)
```

## 5. Using the Runner Script

```bash
# Give execute permission (first time only)
chmod +x scripts/run-load-tests.sh

# Run tests
./scripts/run-load-tests.sh baseline local
./scripts/run-load-tests.sh all staging
./scripts/run-load-tests.sh stress staging
```

## 6. View Reports

After running tests, reports are saved in:
```
test/load/reports/
  ├── baseline-summary.json
  ├── baseline-summary.txt
  ├── stress-test-summary.json
  └── ...
```

## Next Steps

- Read [test/load/README.md](/test/load/README.md) for detailed usage
- Review [docs/load-testing.md](/docs/load-testing.md) for production deployment
- Check [.github/workflows/load-test.yml](/.github/workflows/load-test.yml) for CI integration

## Troubleshooting

### k6 not found
Make sure k6 is installed and in your PATH:
```bash
which k6
```

### Connection refused
Ensure the application is running:
```bash
curl http://localhost:3000/health
```

### Permission denied on script
Make the script executable:
```bash
chmod +x scripts/run-load-tests.sh
```

## Support

For help:
- Documentation: `/test/load/README.md`
- GitHub Issues: Tag with `load-testing`
- Team: #performance channel
