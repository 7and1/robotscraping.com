#!/bin/bash

# deploy.sh - Automated deployment script for robotscraping.com
# Usage: ./deploy.sh [staging|production] [--skip-tests] [--rollback]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKER_NAME="robot-scraping-core"
WEB_PROJECT="robot-scraping-web"
WORKER_NAME_STAGING="robot-scraping-core-staging"
WEB_PROJECT_STAGING="robot-scraping-web-staging"

# Parse arguments
ENVIRONMENT="production"
SKIP_TESTS=false
ROLLBACK=false

for arg in "$@"; do
  case $arg in
    staging|develop)
      ENVIRONMENT="staging"
      shift
      ;;
    production|main)
      ENVIRONMENT="production"
      shift
      ;;
    --skip-tests)
      SKIP_TESTS=true
      shift
      ;;
    --rollback)
      ROLLBACK=true
      shift
      ;;
    *)
      # Unknown option
      ;;
  esac
done

# Helper functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

header() {
  echo ""
  echo -e "${BLUE}========================================${NC}"
  echo -e "${BLUE} $1${NC}"
  echo -e "${BLUE}========================================${NC}"
  echo ""
}

check_command() {
  if ! command -v $1 &> /dev/null; then
    log_error "$1 is not installed. Please install it first."
    exit 1
  fi
}

# Check prerequisites
header "Checking Prerequisites"
check_command "node"
check_command "npm"

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  log_error "Node.js 18 or higher is required. Current version: $(node -v)"
  exit 1
fi
log_success "Node.js version: $(node -v)"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
  log_warning "Wrangler CLI not found. Installing globally..."
  npm install -g wrangler
fi
log_success "Wrangler version: $(wrangler --version | head -n1)"

# Check authentication
header "Checking Cloudflare Authentication"
if ! wrangler whoami &> /dev/null; then
  log_error "Not authenticated with Cloudflare. Please run: wrangler login"
  exit 1
fi
log_success "Authenticated with Cloudflare"

# Rollback if requested
if [ "$ROLLBACK" = true ]; then
  header "Rolling Back Deployment"
  if [ "$ENVIRONMENT" = "staging" ]; then
    log_info "Rolling back staging worker..."
    wrangler versions rollback --name "$WORKER_NAME_STAGING"
  else
    log_info "Rolling back production worker..."
    wrangler versions rollback --name "$WORKER_NAME"
  fi
  log_success "Rollback complete"
  exit 0
fi

# Install dependencies
header "Installing Dependencies"
log_info "Installing npm dependencies..."
npm install
log_success "Dependencies installed"

# Run tests
if [ "$SKIP_TESTS" = false ]; then
  header "Running Tests"
  log_info "Running backend tests..."
  if npm run test -w workers/api; then
    log_success "Backend tests passed"
  else
    log_error "Backend tests failed"
    if [ "$ENVIRONMENT" = "production" ]; then
      log_error "Tests must pass before deploying to production"
      log_info "Use --skip-tests to bypass (not recommended)"
      exit 1
    fi
    log_warning "Continuing with deployment to staging..."
  fi

  log_info "Running frontend tests..."
  if npm run test -w apps/web; then
    log_success "Frontend tests passed"
  else
    log_error "Frontend tests failed"
    if [ "$ENVIRONMENT" = "production" ]; then
      log_error "Tests must pass before deploying to production"
      log_info "Use --skip-tests to bypass (not recommended)"
      exit 1
    fi
    log_warning "Continuing with deployment to staging..."
  fi
else
  log_warning "Skipping tests (--skip-tests flag set)"
fi

# Build frontend
header "Building Frontend"
log_info "Building frontend application..."
npm run build -w apps/web
log_success "Frontend build complete"

log_info "Building for Cloudflare Pages..."
npm run build:cloudflare -w apps/web
log_success "Cloudflare Pages build complete"

# Deploy based on environment
if [ "$ENVIRONMENT" = "staging" ]; then
  header "Deploying to Staging"

  log_info "Deploying API Worker to staging..."
  cd workers/api
  wrangler deploy --env staging
  cd ../..
  log_success "API Worker deployed to staging"

  log_info "Deploying frontend to staging..."
  cd apps/web
  wrangler pages deploy .vercel/output/static \
    --project-name="$WEB_PROJECT_STAGING" \
    --branch=staging
  cd ../..
  log_success "Frontend deployed to staging"

  header "Staging Deployment Complete"
  echo ""
  echo "Staging URLs:"
  echo "  API Worker: https://$WORKER_NAME_STAGING.workers.dev"
  echo "  Frontend: Check Cloudflare Pages dashboard"
  echo ""

else
  header "Deploying to Production"

  # Save current version info
  log_info "Saving current version info..."
  wrangler versions list --name "$WORKER_NAME" > /tmp/worker-versions-backup.txt 2>/dev/null || true

  log_info "Deploying API Worker to production..."
  cd workers/api
  wrangler deploy
  cd ../..
  log_success "API Worker deployed to production"

  log_info "Deploying frontend to production..."
  cd apps/web
  wrangler pages deploy .vercel/output/static \
    --project-name="$WEB_PROJECT" \
    --branch=main
  cd ../..
  log_success "Frontend deployed to production"

  header "Production Deployment Complete"
  echo ""
  echo "Production URLs:"
  echo "  API Worker: https://$WORKER_NAME.butterflywork.workers.dev"
  echo "  Frontend: https://robotscraping.com"
  echo ""
  echo "Version backup saved to: /tmp/worker-versions-backup.txt"
  echo ""
  echo "To rollback, run: ./deploy.sh production --rollback"
  echo ""
fi

# Health check
header "Running Health Check"
sleep 3

if [ "$ENVIRONMENT" = "staging" ]; then
  API_URL="https://$WORKER_NAME_STAGING.workers.dev"
else
  API_URL="https://$WORKER_NAME.butterflywork.workers.dev"
fi

if curl -s -f "$API_URL/health" > /dev/null 2>&1; then
  log_success "Health check passed"
else
  log_warning "Health check endpoint not available or failed"
  log_info "Manual verification recommended"
fi

header "Deployment Finished Successfully"
