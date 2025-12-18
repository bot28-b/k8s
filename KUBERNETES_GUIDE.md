# ☸️ Production EKS Deployment Guide

This guide explains how to deploy the K8s Task Manager to AWS EKS (Elastic Kubernetes Service).

## 🏆 Core Concept: The "Zero CORS" Architecture

To avoid CORS (Cross-Origin Resource Sharing) issues completely, we use an **Ingress Controller**. 
Instead of the frontend (browser) calling a different domain for the API, it calls the *same domain*, and the Ingress routes the traffic inside the cluster.

- `example.com/`      👉 Routed to **Frontend Pods**
- `example.com/api/*` 👉 Routed to **Backend Pods**

This makes the browser think everything is one server. The Kubernetes Manifests (`k8s/06-ingress.yaml` and `frontend/nginx.conf`) are already pre-configured for this.

---

## 🛠 Prerequisites

Ensure you have these tools installed:
1. **kubectl**: `curl -O https://s3.us-west-2.amazonaws.com/amazon-eks/1.27.1/2023-04-19/bin/linux/amd64/kubectl`
2. **eksctl**: `curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp && sudo mv /tmp/eksctl /usr/local/bin`
3. **AWS CLI**: Configure with `aws configure`

---

## 🚀 Step-by-Step Deployment

### 1. Create EKS Cluster
Create a cluster with OIDC enabled (required for Service Accounts/Ingress).

```bash
eksctl create cluster \
  --name task-cluster \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 2 \
  --nodes-min 1 \
  --nodes-max 3 \
  --with-oidc
```

### 2. Install AWS Load Balancer Controller
This is the piece of software that talks to AWS to create the Application Load Balancer (ALB) when you deploy the Ingress YAML.

```bash
# Download IAM policy
curl -O https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.5.4/docs/install/iam_policy.json

# Create IAM policy
aws iam create-policy \
    --policy-name AWSLoadBalancerControllerIAMPolicy \
    --policy-document file://iam_policy.json

# Create Service Account
eksctl create iamserviceaccount \
  --cluster=task-cluster \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --role-name AmazonEKSLoadBalancerControllerRole \
  --attach-policy-arn=arn:aws:iam::<YOUR_ACCOUNT_ID>:policy/AWSLoadBalancerControllerIAMPolicy \
  --approve

# Install via Helm
helm repo add eks https://aws.github.io/eks-charts
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
    -n kube-system \
    --set clusterName=task-cluster \
    --set serviceAccount.create=false \
    --set serviceAccount.name=aws-load-balancer-controller 
```

### 3. Build & Push Images to ECR
Kubernetes needs to pull your images from a registry.

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Create Repos
aws ecr create-repository --repository-name task-backend
aws ecr create-repository --repository-name task-frontend

# Build & Push Backend
cd backend
docker build -t task-backend .
docker tag task-backend:latest <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/task-backend:latest
docker push <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/task-backend:latest

# Build & Push Frontend (IMPORTANT: Use empty VITE_API_URL for relative paths)
cd ../frontend
docker build --build-arg VITE_API_URL="" -t task-frontend .
docker tag task-frontend:latest <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/task-frontend:latest
docker push <YOUR_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/task-frontend:latest
```

### 4. Update Manifests
Update `k8s/04-backend.yaml` and `k8s/05-frontend.yaml` to use your new ECR image URLs instead of local names.

### 5. Deploy Application
Now we apply the manifests we created.

```bash
# 1. Create Namespace & Quotas
kubectl apply -f k8s/00-namespace.yaml

# 2. Permissions (RBAC)
kubectl apply -f k8s/01-rbac.yaml

# 3. Storage Definitions
kubectl apply -f k8s/02-storage.yaml

# 4. Config & Secrets
kubectl apply -f k8s/03-config.yaml

# 5. Application Workloads
kubectl apply -f k8s/04-backend.yaml
kubectl apply -f k8s/05-frontend.yaml

# 6. Ingress (The Router)
kubectl apply -f k8s/06-ingress.yaml
```

### 6. Verify Deployment

Get the Load Balancer URL:

```bash
kubectl get ingress -n task-manager
```

Copy the `ADDRESS` (e.g., `k8s-taskmanager-xxxx.us-east-1.elb.amazonaws.com`).
Open it in your browser.

- **Frontend**: Should load instantly.
- **Backend Connection**: The frontend will make calls to `/api/tasks`. The Ingress Controller will see `/api` and route it to the backend pods automatically. **No CORS errors.**

---

## 🧹 Cleanup
To save money, destroy the cluster when done practicing.

```bash
kubectl delete -f k8s/
eksctl delete cluster --name task-cluster
```
