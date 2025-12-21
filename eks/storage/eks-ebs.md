# EKS EBS Persistent Storage Setup Journey

This document captures the step-by-step process executed to set up a minimal EKS cluster and integrate **Amazon EBS** for persistent storage using the CSI (Container Storage Interface) driver.

---

## Phase 1: Minimal Cluster Creation
We started by creating a cost-effective, minimal EKS cluster for testing storage.

### Command:
```bash
eksctl create cluster \
  --name mini-pv \
  --region ap-south-1 \
  --node-type t3.medium \
  --nodes 1 \
  --nodes-min 1 \
  --nodes-max 1 \
  --managed
```

### Theory & Explanation:
- **`--managed`**: Uses AWS Managed Node Groups, meaning AWS handles the patching and lifecycle of the Ec2 instances.
- **`t3.medium`**: The recommended minimum for EKS (2 vCPU, 4GB RAM) to run system pods like `coredns` and `metrics-server` reliably.
- **`--nodes 1`**: Kept to a minimum to reduce costs while still allowing PV/PVC testing.

---

## Phase 2: Installing Client Tools
Since the environment was a fresh Ubuntu instance, we installed `kubectl` to interact with the cluster.

### Commands:
```bash
curl -LO https://dl.k8s.io/release/$(curl -Ls https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl
chmod +x kubectl
sudo mv kubectl /usr/local/bin/
kubectl version --client
```

---

## Phase 3: Enabling IAM OIDC Provider
Before pods can talk to AWS APIs (to create EBS volumes), the cluster must have an OIDC provider.

### Command:
```bash
eksctl utils associate-iam-oidc-provider \
  --cluster mini-pv \
  --region ap-south-1 \
  --approve
```

### Theory:
**What is OIDC?**
OpenID Connect (OIDC) acts as a **trust bridge**. It allows AWS IAM to trust identities issued by your Kubernetes cluster. Without this, you would have to give your EC2 Worker Nodes broad permissions, which is a security risk.

---

## Phase 4: IRSA (IAM Roles for Service Accounts)
We created a dedicated identity for the EBS CSI Driver.

### Command:
```bash
eksctl create iamserviceaccount \
  --cluster mini-pv \
  --region ap-south-1 \
  --namespace kube-system \
  --name ebs-csi-controller-sa \
  --attach-policy-arn arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy \
  --approve
```

### Theory:
**Why IRSA?**
Instead of giving the permission to the whole Node, we give it only to the **Service Account** used by the EBS CSI pods. This follows the **Principle of Least Privilege**.
- **Annotation**: The command automatically adds `eks.amazonaws.com/role-arn` to the Service Account.

---

## Phase 5: Installing the EBS CSI Driver Addon
The CSI Driver is the "brain" that listens for PVC requests and talks to AWS to create EBS volumes.

### Troubleshooting Experience:
Directly creating the addon initially failed with `CREATE_FAILED` due to role ARN format issues. We resolved this by using the `--force` flag to let `eksctl` manage the role assignment properly.

### Successful Command:
```bash
eksctl create addon \
  --name aws-ebs-csi-driver \
  --cluster mini-pv \
  --region ap-south-1 \
  --force
```

### Verification:
We verified the status was **ACTIVE**:
```bash
eksctl get addon --cluster mini-pv --region ap-south-1
```

**Output Snippet:**
```text
NAME                VERSION             STATUS  ISSUES
aws-ebs-csi-driver  v1.54.0-eksbuild.1  ACTIVE  0
```

---

## Summary of the Current State
1.  **Cluster**: `mini-pv` is running in `ap-south-1`.
2.  **Trust**: OIDC Provider is associated.
3.  **Permissions**: `ebs-csi-controller-sa` has the `AmazonEBSCSIDriverPolicy`.
4.  **Driver**: The `aws-ebs-csi-driver` addon is **ACTIVE** and running in the `kube-system` namespace.

The cluster is now ready to handle **Dynamic Provisioning** (StorageClass -> PVC -> PV).

---

## Phase 6: Troubleshooting & Failure Log

During the process, we encountered several real-world failures. Here is how we identified and solved them:

### Failure 1: The "Missing Region" Error
**Command:** `eksctl utils associate-iam-oidc-provider --cluster mini-pv --approve`
**Output:**
```text
Error: could not create cluster provider from options: AWS Region must be set, please set the AWS Region in AWS config file or as environment variable
```
**Reason:** The environment did not have a default AWS region configured in `~/.aws/config`. 
**Solution:** Explicitly passed the region flag: `--region ap-south-1`.

---

### Failure 2: Addon `CREATE_FAILED` (The Role ARN Trap)
**Command:** `eksctl create addon --name aws-ebs-csi-driver ... --service-account-role-arn <ARN>`
**Output from `eksctl get addon`:**
```text
NAME                    STATUS          ISSUES
aws-ebs-csi-driver      CREATE_FAILED   1
```
**Reason:** The IAM Role ARN provided was invalid because it had extra text (`kube-system`) appended to it or the `eksctl` version was conflicting with manual ARN assignment.
**Attempted Fix:** We tried to delete and recreate the addon, but it kept failing because of the existing state.

**Final Solution:** 
We used the `--force` flag without specifying the manual ARN. This allowed `eksctl` to automatically create/repair the stack and manage the permissions correctly.
```bash
eksctl create addon --name aws-ebs-csi-driver --cluster mini-pv --region ap-south-1 --force
```

---

### Failure 3: `kubectl` Not Found
**Status:** Cluster was "Ready" but commands like `kubectl get nodes` failed.
**Output:**
```text
[✖]  kubectl not found, v1.10.0 or newer is required
```
**Reason:** `eksctl` creates the cluster, but it does NOT install the `kubectl` binary on your OS.
**Solution:** Manually downloaded the binary from the official Kubernetes release site and moved it to `/usr/local/bin/`.

---

## Key Learnings
1. **Force is Powerful**: When a managed addon gets stuck in `CREATE_FAILED`, the `--force` flag is often necessary to reset the state.
2. **Region Consistency**: Always specify `--region` in `eksctl` commands if your environment is not pre-configured.
3. **Managed vs Local**: Distinguish between the **Cluster State** (EKS side) and the **Local Tools** (`kubectl` side).

---

## Phase 7: Practical Testing & Verification

After setting up the infrastructure, we performed a live test to verify that the EBS storage survives pod restarts.

### 1. Resource Creation
We applied the manifests for StorageClass, Namespace, and PVC.

```bash
# Created StorageClass
kubectl apply -f storage-class.yaml 

# Created Namespace 'demo'
kubectl apply -f name-space.yaml 

# Created PersistentVolumeClaim in 'demo'
kubectl apply -f pvc.yaml 
```

**Verification of PVC (status: Bound):**
```text
NAME          STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
backend-pvc   Bound    pvc-c8367f92-70b7-40d1-a5d4-1be9498a547b   4Gi        RWO            ebs-sc         2m
```

### 2. Deployment & Volume Mounting
We deployed the backend application, which automatically mounted the EBS volume at `/data`.

```bash
kubectl apply -f backend.yaml 
```

### 3. Data Persistence Test (The "Proof")

**Step A: Write data inside the Pod**
```bash
export POD_NAME=$(kubectl get pods -n demo -l app=backend -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n demo $POD_NAME -- sh -c "echo 'Hello from EBS Storage' > /data/persistence-test.txt"
```

**Step B: Delete the current Pod**
```bash
kubectl delete pod -n demo $POD_NAME
```

**Step C: Verify data in the NEW Pod**
Kubernetes automatically scheduled a new pod and re-attached the same EBS volume.
```bash
export NEW_POD_NAME=$(kubectl get pods -n demo -l app=backend -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n demo $NEW_POD_NAME -- cat /data/persistence-test.txt
```

**Final Output:**
```text
Hello from EBS Storage
```

**Conclusion:** The test was successful. Even after the pod was completely destroyed, the data remained safe on the AWS EBS volume and was successfully recovered by the new pod.
