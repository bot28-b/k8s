# AWS EKS Ingress with AWS Load Balancer Controller  
## Complete Implementation & Troubleshooting Guide (From Scratch)

---

## 1. Overview

This document explains **step-by-step implementation of AWS ALB Ingress on EKS**, including **all real issues faced during setup and how each was resolved**.  
This is a **production-grade walkthrough**, not a theoretical guide.

---

## 2. Architecture

```
User
 ↓
AWS Application Load Balancer (ALB)
 ↓
Kubernetes Ingress (alb)
 ↓
Kubernetes Services
 ├── frontend-service (80)
 └── backend-service (3000)
 ↓
Pods
```

---

## 3. Prerequisites

- EKS Cluster (EC2 based)
- VPC with at least **2 subnets**
- kubectl configured
- IAM access
- Helm installed
- Region: eu-west-1

---

## 4. Step 1: Verify OIDC Provider

### Problem
OIDC provider **not visible** in IAM Web Identity dropdown.

### Root Cause
OIDC provider **was not manually added** in IAM.

### Fix
```bash
aws eks describe-cluster --name demo --query "cluster.identity.oidc.issuer"
```

Then:
- IAM → Identity Providers → Add Provider
- Type: OIDC
- Issuer URL: (output above)
- Audience: sts.amazonaws.com

✅ Now visible in IAM roles.

---

## 5. Step 2: Create IAM Role for ALB Controller (IRSA)

### Problem
Ingress controller failed with:
```
AccessDenied: elasticloadbalancing:DescribeLoadBalancers
```

### Root Cause
IAM role had **incomplete permissions**.

### Fix
- Created IAM role: `EKSLoadBalancerControllerRole`
- Attached **two policies**:

```text
AmazonEKSLoadBalancingPolicy
AWSLoadBalancerControllerIAMPolicy (Customer managed)
```

Verified:
```bash
aws iam list-attached-role-policies  --role-name EKSLoadBalancerControllerRole
```

---

## 6. Step 3: Create Service Account with IRSA

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: aws-load-balancer-controller
  namespace: kube-system
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::<ACCOUNT_ID>:role/EKSLoadBalancerControllerRole
```

Apply:
```bash
kubectl apply -f service-account.yaml
```

---

## 7. Step 4: Install AWS Load Balancer Controller

### Problem
ImagePullBackOff error:
```
public.ecr.aws/eks/aws-load-balancer-controller:v2.7.3 not found
```

### Fix
Used correct version for cluster:

```bash
helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm install aws-load-balancer-controller eks/aws-load-balancer-controller  -n kube-system  --set clusterName=demo  --set region=eu-west-1  --set vpcId=vpc-026988987a20c2fbb  --set serviceAccount.create=false  --set serviceAccount.name=aws-load-balancer-controller
```

Verify:
```bash
kubectl get pods -n kube-system
```

---

## 8. Step 5: Subnet Discovery Failure

### Error
```
couldn't auto-discover subnets (0 match VPC and tags)
```

### Root Cause
Subnets had **NO Kubernetes tags**.

### Fix
Tagged all public subnets:

```text
kubernetes.io/role/elb = 1
kubernetes.io/cluster/demo = shared
```

Verification:
```bash
aws ec2 describe-subnets --filters Name=vpc-id,Values=vpc-026988987a20c2fbb
```

---

## 9. Step 6: Create Ingress Resource

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: task-manager-ingress
  namespace: demo
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP":80}]'
spec:
  ingressClassName: alb
  rules:
    - http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: backend-service
                port:
                  number: 3000
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-service
                port:
                  number: 80
```

Apply:
```bash
kubectl apply -f ingress.yaml
```

---

## 10. Step 7: Verify ALB Creation

```bash
kubectl get ingress -n demo
```

Output:
```
ADDRESS:
k8s-demo-taskmana-xxxxxxxx.eu-west-1.elb.amazonaws.com
```

🎉 ALB successfully created.

---

## 11. Final Validation

Frontend:
```bash
http://<ALB-DNS>/
```

Backend:
```bash
http://<ALB-DNS>/api
```

---

## 12. Key Learnings

- IAM permissions are the **#1 failure point**
- Subnet tags are **mandatory**
- ALB controller is **NOT an EKS add-on**
- IRSA must be correct before controller install
- Logs always tell the truth

---

## 13. Production Improvements (Next Steps)

- HTTPS via ACM
- Route53 custom domain
- WAF
- ALB access logs
- HPA

---

## 14. Resume Value

> Designed and implemented production-grade AWS ALB Ingress on EKS using IRSA, resolved IAM, subnet discovery, image pull, and controller permission issues.

---

✅ **Status: Production Ready**
