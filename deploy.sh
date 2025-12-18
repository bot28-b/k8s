#!/bin/bash

# ==============================================================================
# 🚀 K8s Learning Platform - Automated Docker Deployment
# ==============================================================================
# This script deploys the application in a production-like manner using Docker.
# It sets up a private network so the Frontend (NGINX) can proxy requests to 
# the Backend, adhering to the same architecture used in Kubernetes.
# ==============================================================================

set -e

# Configuration
REPO_URL="https://github.com/bot28-b/k8s.git"
BRANCH_NAME="${1:-main}"
BASE_DIR="/home/ubuntu/k8s-platform" # Adjust this path as needed
PROJECT_DIR="$BASE_DIR/source"
NETWORK_NAME="task-network"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}   K8s Platform - Docker Auto Deploy      ${NC}"
echo -e "${BLUE}==========================================${NC}"
echo -e "Branch: ${GREEN}$BRANCH_NAME${NC}"
echo -e "Repo:   ${GREEN}$REPO_URL${NC}"
echo ""

# 1. Check/Install Docker
echo -e "${BLUE}[1/7] Verifying Docker environment...${NC}"
if ! command -v docker &> /dev/null; then
    echo "Docker not found. Installing..."
    sudo apt-get update
    sudo apt-get install -y docker.io
    sudo usermod -aG docker $USER
    echo -e "${GREEN}✓ Docker installed${NC}"
else
    echo -e "${GREEN}✓ Docker is already available${NC}"
fi

# 2. Clone Repository
echo -e "${BLUE}[2/7] Fetching source code...${NC}"
if [ -d "$PROJECT_DIR" ]; then
    echo "removing existing source..."
    rm -rf "$PROJECT_DIR"
fi
mkdir -p "$PROJECT_DIR"

echo "Cloning branch $BRANCH_NAME..."
git clone -b "$BRANCH_NAME" "$REPO_URL" "$PROJECT_DIR" || {
    echo -e "${RED}Failed to clone branch $BRANCH_NAME. Cloning main...${NC}"
    git clone "$REPO_URL" "$PROJECT_DIR"
}
echo -e "${GREEN}✓ Source code acquired${NC}"

# 3. Network Setup
echo -e "${BLUE}[3/7] Setting up Docker Network...${NC}"
# We create a network to allow container-to-container communication by name
# This simulates K8s Service Discovery (ClusterIP)
if ! docker network ls | grep -q "$NETWORK_NAME"; then
    docker network create "$NETWORK_NAME"
    echo -e "${GREEN}✓ Network '$NETWORK_NAME' created${NC}"
else
    echo -e "${GREEN}✓ Network '$NETWORK_NAME' exists${NC}"
fi

# 4. Cleanup Old Containers
echo -e "${BLUE}[4/7] Cleaning up old deployments...${NC}"
docker stop task-backend task-frontend 2>/dev/null || true
docker rm task-backend task-frontend 2>/dev/null || true
echo -e "${GREEN}✓ Cleaned up old containers${NC}"

# 5. Deploy Backend
echo -e "${BLUE}[5/7] Deploying Backend...${NC}"
cd "$PROJECT_DIR/backend"

# Build Image
docker build -t task-backend:latest .

# Run Container
# --name backend-service: IMPORTANT matches the NGINX upstream config 
# (simulating the K8s Service name 'backend-service')
docker run -d \
  --name task-backend \
  --network "$NETWORK_NAME" \
  --network-alias backend-service \
  -e PORT=3000 \
  -e NODE_ENV=production \
  task-backend:latest

echo -e "${GREEN}✓ Backend running (Internal Port: 3000)${NC}"

# 6. Deploy Frontend
echo -e "${BLUE}[6/7] Deploying Frontend...${NC}"
cd "$PROJECT_DIR/frontend"

# Build Image
# We pass empty VITE_API_URL to ensure axios uses relative info (/api/...) 
# enabling Nginx to handle the proxying (No CORS issues!)
docker build \
  --build-arg VITE_API_URL="" \
  -t task-frontend:latest .

# Run Container
docker run -d \
  --name task-frontend \
  --network "$NETWORK_NAME" \
  -p 80:80 \
  task-frontend:latest

echo -e "${GREEN}✓ Frontend running (Public Port: 80)${NC}"

# 7. Verification & Info
echo -e "${BLUE}[7/7] Verifying Deployment...${NC}"
sleep 5 # Wait for health checks

echo -e "${BLUE}==========================================${NC}"
echo -e "${GREEN}   DEPLOYMENT COMPLETE! 🚀               ${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""
echo "Access the application at:"
echo -e "${GREEN}http://$(curl -s ifconfig.me)  (or http://localhost locally)${NC}"
echo ""
echo "Architecture Status:"
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "Logs:"
echo "  Backend:  docker logs -f task-backend"
echo "  Frontend: docker logs -f task-frontend"
echo ""
