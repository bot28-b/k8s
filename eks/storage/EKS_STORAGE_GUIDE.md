# EKS EBS Storage Setup Guide

This guide explains how to integrate Persistent Storage (PV/PVC) with Amazon EKS using AWS EBS.

## 1. Prerequisites: EBS CSI Driver
Before you can use EBS volumes, you MUST install the **Amazon EBS CSI Driver** in your cluster.

### A. Install using Add-on (Recommended)
You can do this via the AWS Console or CLI:
```bash
aws eks create-addon --cluster-name <your-cluster-name> --addon-name aws-ebs-csi-driver
```
*Note: Ensure your Worker Nodes have the `AmazonEBSCSIDriverPolicy` IAM policy attached to their IAM Role.*

---

## 2. Files in this Directory

| File | Purpose |
|------|---------|
| `storage-class.yaml` | Defines the `gp3` storage type (faster and cheaper than gp2). |
| `persistent-volume-claim.yaml` | Requests 4Gi of storage from the EBS system. |
| `backend-updated.yaml` | Example of how to mount the PVC into your application. |

---

## 3. How to Apply

1. **Deploy the Storage Class:**
   ```bash
   kubectl apply -f eks/storage/storage-class.yaml
   ```

2. **Deploy the PVC:**
   ```bash
   kubectl apply -f eks/storage/persistent-volume-claim.yaml
   ```

3. **Check Status:**
   ```bash
   kubectl get sc
   kubectl get pvc -n demo
   ```
   *The PVC will stay in `PENDING` state until it is "Bound" by a pod (due to `volumeBindingMode: WaitForFirstConsumer`).*

4. **Update Application:**
   ```bash
   kubectl apply -f eks/storage/backend-updated.yaml
   ```

---

## 4. Key Considerations for EBS Storage

### Replicas & Availability Zones
*   **Availability Zone (AZ) Lock:** EBS volumes are local to a specific AZ. Pods using the volume must be scheduled in the same AZ where the volume was created.
*   **ReadWriteOnce (RWO):** EBS only supports `ReadWriteOnce`. This means the volume can only be mounted by **one pod at a time** (or multiple pods on the **same node**).
*   **Deployment Strategy:** We use `strategy: Recreate` instead of `RollingUpdate`. This ensures the old pod is killed and releases the volume before the new pod tries to attach it.

### Permissions
If your pods fail to mount the volume, check that:
1. The EBS CSI Driver is running (`kubectl get pods -n kube-system | grep ebs`).
2. Your node IAM role has `AmazonEBSCSIDriverPolicy`.

---

## 5. Verification: How to Test Persistence

To prove that the EBS storage is working and data survives pod restarts, follow these steps:

### Step 1: Write Data to the Volume
Exec into your running backend pod and create a file in the `/data` directory:
```bash
# Get the pod name
export POD_NAME=$(kubectl get pods -n demo -l app=backend -o jsonpath='{.items[0].metadata.name}')

# Create a test file inside the pod
kubectl exec -n demo $POD_NAME -- sh -c "echo 'Hello from EBS Storage' > /data/persistence-test.txt"

# Verify it was written
kubectl exec -n demo $POD_NAME -- cat /data/persistence-test.txt
```

### Step 2: Delete the Pod
Simulate a pod failure or update by deleting the current pod:
```bash
kubectl delete pod -n demo $POD_NAME
```

### Step 3: Verify Persistence in the New Pod
Wait for the new pod to be ready, then check if the file still exists:
```bash
# Wait for the new pod
sleep 30
export NEW_POD_NAME=$(kubectl get pods -n demo -l app=backend -o jsonpath='{.items[0].metadata.name}')

# Check the file
kubectl exec -n demo $NEW_POD_NAME -- cat /data/persistence-test.txt
```

If you see **"Hello from EBS Storage"**, your persistence is working perfectly! The data lived on the EBS volume even though the container was destroyed.
