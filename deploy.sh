#!/bin/bash

# RoboHatch Deployment Script
# This script helps deploy the RoboHatch platform using Docker

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    print_success "Docker is installed"
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    print_success "Docker Compose is installed"
    
    if [ ! -f ".env" ]; then
        print_warning ".env file not found"
        echo "Copying .env.docker.example to .env..."
        cp .env.docker.example .env
        print_warning "Please update .env with your configuration"
        exit 1
    fi
    print_success ".env file exists"
}

# Build images
build_images() {
    print_header "Building Docker Images"
    
    echo "Building all services..."
    docker-compose build --parallel
    
    print_success "Docker images built successfully"
}

# Run migrations
run_migrations() {
    print_header "Running Database Migrations"
    
    echo "Running Prisma migrations..."
    docker-compose run --rm api npx prisma migrate deploy
    
    print_success "Migrations completed"
}

# Start services
start_services() {
    print_header "Starting Services"
    
    echo "Starting all services..."
    docker-compose up -d
    
    echo "Waiting for services to be healthy..."
    sleep 10
    
    print_success "Services started"
}

# Check health
check_health() {
    print_header "Checking Service Health"
    
    # Check API
    if curl -f http://localhost/health > /dev/null 2>&1; then
        print_success "API is healthy"
    else
        print_error "API health check failed"
    fi
    
    # Check Frontend
    if curl -f http://localhost > /dev/null 2>&1; then
        print_success "Frontend is healthy"
    else
        print_error "Frontend health check failed"
    fi
    
    # Show running containers
    echo ""
    docker-compose ps
}

# Show logs
show_logs() {
    print_header "Service Logs"
    docker-compose logs --tail=50
}

# Main deployment flow
deploy() {
    print_header "🚀 RoboHatch Deployment"
    
    check_prerequisites
    build_images
    run_migrations
    start_services
    check_health
    
    print_header "✓ Deployment Complete"
    echo "Application is running at: http://localhost"
    echo "API health check: http://localhost/health"
    echo ""
    echo "View logs: docker-compose logs -f"
    echo "Stop services: docker-compose down"
}

# Handle command line arguments
case "${1:-deploy}" in
    deploy)
        deploy
        ;;
    build)
        check_prerequisites
        build_images
        ;;
    migrate)
        run_migrations
        ;;
    start)
        start_services
        ;;
    health)
        check_health
        ;;
    logs)
        show_logs
        ;;
    stop)
        print_header "Stopping Services"
        docker-compose stop
        print_success "Services stopped"
        ;;
    restart)
        print_header "Restarting Services"
        docker-compose restart
        print_success "Services restarted"
        ;;
    clean)
        print_header "Cleaning Up"
        docker-compose down -v
        print_success "Cleanup complete"
        ;;
    *)
        echo "Usage: $0 {deploy|build|migrate|start|health|logs|stop|restart|clean}"
        exit 1
        ;;
esac
