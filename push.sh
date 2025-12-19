#!/bin/bash

# ==============================================================================
# 🐳 Docker Push Script for aws321/k8s
# ==============================================================================
# This script clones the repo, builds the images, and pushes them to Docker Hub.
# ==============================================================================

set -e

# Configuration
DOCKER_USER="aws321"
REPO_NAME="k8s"
IMAGE_BASE="${DOCKER_USER}/${REPO_NAME}"
REPO_URL="https://github.com/bot28-b/k8s.git"
BRANCH_NAME="${1:-main}"
BASE_DIR="/home/ubuntu/k8s-platform"
PROJECT_DIR="$BASE_DIR/source"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}   Docker Push Utility                    ${NC}"
echo -e "${BLUE}==========================================${NC}"
echo -e "Target Repo: ${GREEN}${IMAGE_BASE}${NC}"
echo -e "Branch:      ${GREEN}${BRANCH_NAME}${NC}"
echo ""

# 0. Docker Login
echo -e "${BLUE}[0/3] Authenticating...${NC}"
echo -n "Enter Docker Hub Password for user '$DOCKER_USER': "
read -s DOCKER_PASSWORD
echo ""

echo "Logging in to Docker Hub..."
echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USER" --password-stdin
echo -e "${GREEN}✓ Login successful${NC}"
echo ""

# 1. Clone/Refresh Repository
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

# ----------------------------
# 2. Backend
# ----------------------------
echo -e "\n${BLUE}[2/3] Processing Backend...${NC}"
cd "$PROJECT_DIR"
echo "Building backend image..."
docker build -t "${IMAGE_BASE}:backend" ./backend

echo "Pushing backend image..."
docker push "${IMAGE_BASE}:backend"
echo -e "${GREEN}✓ Backend pushed: ${IMAGE_BASE}:backend${NC}"

# ----------------------------
# 3. Frontend
# ----------------------------
echo -e "\n${BLUE}[3/3] Processing Frontend...${NC}"
echo "Building frontend image..."
# Using empty VITE_API_URL for production/k8s setups
docker build --build-arg VITE_API_URL="" -t "${IMAGE_BASE}:frontend" ./frontend

echo "Pushing frontend image..."
docker push "${IMAGE_BASE}:frontend"
echo -e "${GREEN}✓ Frontend pushed: ${IMAGE_BASE}:frontend${NC}"

# ----------------------------
# Summary
# ----------------------------
echo -e "\n${BLUE}==========================================${NC}"
echo -e "${GREEN}   PUSH COMPLETE! 🚀                     ${NC}"
echo -e "${BLUE}==========================================${NC}"
echo "Images available at Docker Hub:"
echo "  - ${IMAGE_BASE}:backend"
echo "  - ${IMAGE_BASE}:frontend"
