#!/bin/bash

# ==============================================================================
# 🐳 Docker Push Script for aws321/k8s
# ==============================================================================
# This script builds the Docker images specifically for Docker Hub
# and pushes them to the aws321/k8s repository.
# ==============================================================================

set -e

# Configuration
DOCKER_USER="aws321"
REPO_NAME="k8s"
IMAGE_BASE="${DOCKER_USER}/${REPO_NAME}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}   Docker Push Utility                    ${NC}"
echo -e "${BLUE}==========================================${NC}"
echo -e "Target Repo: ${GREEN}${IMAGE_BASE}${NC}"
echo ""

# 0. Docker Login
echo -e "${BLUE}[0/2] Authenticating...${NC}"
echo -n "Enter Docker Hub Password for user '$DOCKER_USER': "
read -s DOCKER_PASSWORD
echo ""

echo "Logging in to Docker Hub..."
echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USER" --password-stdin
echo -e "${GREEN}✓ Login successful${NC}"
echo ""

# Check for directories
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}Error: 'backend' or 'frontend' directories not found.${NC}"
    echo "Please run this script from the project root."
    exit 1
fi

# ----------------------------
# 1. Backend
# ----------------------------
echo -e "${BLUE}[1/2] Processing Backend...${NC}"
echo "Building backend image..."
docker build -t "${IMAGE_BASE}:backend" ./backend

echo "Pushing backend image..."
docker push "${IMAGE_BASE}:backend"
echo -e "${GREEN}✓ Backend pushed: ${IMAGE_BASE}:backend${NC}"

# ----------------------------
# 2. Frontend
# ----------------------------
echo -e "\n${BLUE}[2/2] Processing Frontend...${NC}"
echo "Building frontend image..."
# Using empty VITE_API_URL for production/k8s setups where relative paths are used
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
