# 🧪 KillerCoda / Kubeadm Deployment

This directory contains manifests optimized for bare-metal, VM, or Kubeadm environments (like KillerCoda).

## 🚀 Deployment Guide

### 1. Build Images
Run these commands on the **Controlplane** node:

```bash
cd ..
docker build -t task-backend:latest backend
docker build --build-arg VITE_API_URL="" -t task-frontend:latest frontend
```

### 2. Load Images into Kubernetes (Crucial!)

**Scenario A: Single Node (Controlplane only)**
```bash
docker save task-backend:latest | ctr -n=k8s.io images import -
docker save task-frontend:latest | ctr -n=k8s.io images import -
```

**Scenario B: Multi-Node (Controlplane + Workers)**
You must copy images to the worker nodes because they don't share storage.

```bash
# 1. Save to files
docker save task-backend:latest -o backend.tar
docker save task-frontend:latest -o frontend.tar

# 2. Copy to Worker Node (replace 'node01' with your worker name)
scp backend.tar frontend.tar node01:~

# 3. Import in Worker Node
ssh node01 "ctr -n=k8s.io images import backend.tar"
ssh node01 "ctr -n=k8s.io images import frontend.tar"

# 4. Import in Controlplane too (if pods run there)
ctr -n=k8s.io images import backend.tar
ctr -n=k8s.io images import frontend.tar

# 5. Cleanup
rm backend.tar frontend.tar
```

### 3. Deploy
```bash
kubectl apply -f kubeadm/deploy-all.yaml

# Force restart if images changed
kubectl delete pod --all -n task-manager
```

---

## 🔍 How to Test

### Check Status
```bash
kubectl get pods -n task-manager
```
*Wait for Status: Running*

### Access the App
The frontend is exposed on **NodePort 30080**.

**Option A: Curl from Terminal**
```bash
curl http://localhost:30080
```
*(Should return HTML content)*

**Option B: Browser (KillerCoda/VM)**
1.  Look for **"Traffic"** or **"Ports"** menu in the KillerCoda interface.
2.  Enter Custom Port: `30080`.
3.  Open the URL.

### Verify Backend Connection
1.  In the web UI, you should see the task list loading (not failing).
2.  The "Instance" info in the header should show the Pod Name.
