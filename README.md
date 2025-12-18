# ☸️ Kubernetes Learning Platform

A production-ready full-stack application designed to master Docker & Kubernetes concepts.

## 🏗 Architecture

- **Frontend**: React + Vite + Tailwind (NGINX container)
- **Backend**: Node.js + Express (Distroless/Alpine container)
- **Infrastructure**: Complete K8s manifests (Deployments, Services, Ingress, HPA, PVC, Secrets)

## 🚀 Getting Started

### 1. Build Docker Images

```bash
# Build Backend
cd backend
docker build -t task-backend:latest .

# Build Frontend
cd ../frontend
docker build -t task-frontend:latest .
```

### 2. Deploy to Kubernetes (Local)

Ensure you have a local cluster (Docker Desktop, Minikube, or Kind).

```bash
# Apply Manifests
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-rbac.yaml
kubectl apply -f k8s/02-storage.yaml
kubectl apply -f k8s/03-config.yaml
kubectl apply -f k8s/04-backend.yaml
kubectl apply -f k8s/05-frontend.yaml

# For local testing without Ingress Controller:
kubectl port-forward -n task-manager svc/frontend-service 8080:80
```

Access app at: `http://localhost:8080`

### 3. Kubernetes Concepts Demonstrated

1. **Pod Lifecycle**: Liveness/Readiness probes in `04-backend.yaml`
2. **Scaling**: HPA configured to auto-scale on CPU > 70% (`04-backend.yaml`)
3. **Storage**: PVC and StorageClass usage in `02-storage.yaml`
4. **Config**: Environment decoupling via ConfigMaps & Secrets (`03-config.yaml`)
5. **Security**: Non-root user containers + RBAC permissions (`01-rbac.yaml`)
6. **Networking**: Service discovery and Ingress routing (`06-ingress.yaml`)
7. **Resilience**: Rolling Updates and Pod Anti-Affinity
# k8s
