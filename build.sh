#!/bin/bash

# ==============================================================================
# 🐳 K8s Learning Platform - Docker Build Script
# ==============================================================================
# This script strictly clones the repo and builds the Docker images.
# Useful for CI/CD pipelines or prepping for a Kubernetes deployment.
# ==============================================================================

set -e

# Configuration
REPO_URL="https://github.com/bot28-b/k8s.git"
BRANCH_NAME="${1:-main}"
BASE_DIR="/home/ubuntu/k8s-platform"
PROJECT_DIR="$BASE_DIR/source"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}   Docker Image Builder                   ${NC}"
echo -e "${BLUE}==========================================${NC}"
echo -e "Branch: ${GREEN}$BRANCH_NAME${NC}"
echo ""

# 1. Clone Repository
echo -e "${BLUE}[1/3] Refreshing source code...${NC}"
if [ -d "$PROJECT_DIR" ]; then
    echo "Using existing directory structure..."
    cd "$PROJECT_DIR"
    echo "Pulling latest changes..."
    git pull origin "$BRANCH_NAME" || {
        echo "Git pull failed, re-cloning..."
        cd ..
        rm -rf "$PROJECT_DIR"
        git clone -b "$BRANCH_NAME" "$REPO_URL" "$PROJECT_DIR"
    }
else
    mkdir -p "$PROJECT_DIR"
    echo "Cloning fresh..."
    git clone -b "$BRANCH_NAME" "$REPO_URL" "$PROJECT_DIR"
fi
echo -e "${GREEN}✓ Source code ready${NC}"

# 2. Build Backend
echo -e "${BLUE}[2/3] Building Backend Image...${NC}"
cd "$PROJECT_DIR/backend"
docker build -t task-backend:latest .
echo -e "${GREEN}✓ Backend image built: task-backend:latest${NC}"

# 3. Build Frontend
echo -e "${BLUE}[3/3] Building Frontend Image...${NC}"
cd "$PROJECT_DIR/frontend"
# Note: For K8s/Production, we usually want empty API_URL so it uses relative paths
docker build --build-arg VITE_API_URL="" -t task-frontend:latest .
echo -e "${GREEN}✓ Frontend image built: task-frontend:latest${NC}"

echo -e "${BLUE}==========================================${NC}"
echo -e "${GREEN}   BUILD COMPLETE! 🏗️                    ${NC}"
echo -e "${BLUE}==========================================${NC}"
echo "Images ready to be tagged and pushed or run locally."
echo "List images: docker images | grep task-"
