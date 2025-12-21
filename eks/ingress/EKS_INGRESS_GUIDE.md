# EKS Ingress Setup Guide: AWS Load Balancer Controller (Console & CLI)

This guide documents the exact steps we took to configure the **AWS Load Balancer Controller** and solve the OIDC/IAM association issues encountered during the setup.

---

## 1. Prerequisites & Preparation
Before starting in the console, ensure your cluster is active and you have the IAM policy logic ready.

*   **Cluster Name:** `demo`
*   **Region:** `eu-west-1`
*   **Namespace:** `demo` (for apps) and `kube-system` (for controller)

---

## 2. Step-by-Step Configuration (The "Chat" Workflow)

### Step 1: Create the IAM Policy
The controller needs specific permissions to manage AWS ELB resources.
1.  Go to **IAM Console** -> **Policies** -> **Create Policy**.
2.  Select the **JSON** tab.
3.  Paste the content of `AWSLoadBalancerControllerIAMPolicy.json` (or the official AWS JSON).
4.  Name it: `AWSLoadBalancerControllerIAMPolicy`.
5.  Click **Create Policy**.

### Step 2: Fix OIDC Provider (Crucial Step)
If the OIDC provider doesn't appear in the "Web Identity" dropdown when creating a role, you must add it manually.
1.  Go to **EKS Console** -> **Clusters** -> `demo`.
2.  In the **Overview** tab, find and copy the **OpenID Connect provider URL**.
    *   *Example:* `https://oidc.eks.eu-west-1.amazonaws.com/id/BF2403DDB5808EAEAB986FDBD69F44FF`
3.  Go to **IAM Console** -> **Identity Providers** -> **Add Provider**.
4.  Select **OpenID Connect**.
5.  **Provider URL:** Paste the URL you copied from EKS.
6.  **Audience:** Type `sts.amazonaws.com`.
7.  Click **Add Provider**.

### Step 3: Create the IAM Role for the Controller
1.  Go to **IAM Console** -> **Roles** -> **Create Role**.
2.  Select **Web Identity**.
3.  **Identity Provider:** Select the OIDC URL you just added in Step 2.
4.  **Audience:** Select `sts.amazonaws.com`.
5.  Click **Next**.
6.  **Permissions:** Search for and select the `AWSLoadBalancerControllerIAMPolicy` created in Step 1.
7.  **Role Name:** name it `EKSLoadBalancerControllerRole`.
8.  Click **Create Role**.

### Step 4: Create the Service Account in Kubernetes
The service account must exist in the cluster and be linked to the IAM Role ARN.
1.  Create a file named `service-account.yaml`:
    ```yaml
    apiVersion: v1
    kind: ServiceAccount
    metadata:
      name: aws-load-balancer-controller
      namespace: kube-system
      annotations:
        eks.amazonaws.com/role-arn: arn:aws:iam::699475945906:role/EKSLoadBalancerControllerRole
    ```
2.  Apply it: `kubectl apply -f service-account.yaml`.

### Step 5: Associate Role in EKS Console (Alternative)
1.  Go to **EKS Console** -> **Clusters** -> `demo` -> **Access** tab.
2.  Scroll to **IAM roles for service accounts** -> **Create**.
3.  **Namespace:** `kube-system`.
4.  **Service Account:** `aws-load-balancer-controller`.
5.  **IAM Role:** Select `EKSLoadBalancerControllerRole`.
6.  Click **Create**.

### Step 6: Install the Controller (Helm)
1.  Add the repo: `helm repo add eks https://aws.github.io/eks-charts`
2.  Update: `helm repo update`
3.  Install:
    ```bash
    helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
      -n kube-system \
      --set clusterName=demo \
      --set serviceAccount.create=false \
      --set serviceAccount.name=aws-load-balancer-controller \
      --set region=eu-west-1
    ```

### Step 7: Subnet Tagging (Auto-Discovery)
For the AWS Load Balancer Controller to automatically discover the subnets where it should provision the ALB, you **must** tag your VPC subnets.

#### A. Public Subnet Tags (For Internet-facing ALBs)
Add these tags to your **public subnets**:
1.  **Key:** `kubernetes.io/role/elb` | **Value:** `1`
2.  **Key:** `kubernetes.io/cluster/demo` | **Value:** `shared` (or `owned`)

#### B. Private Subnet Tags (For Internal ALBs)
Add these tags to your **private subnets**:
1.  **Key:** `kubernetes.io/role/internal-elb` | **Value:** `1`
2.  **Key:** `kubernetes.io/cluster/demo` | **Value:** `shared` (or `owned`)

#### How to tag in the AWS Console:
1.  Go to **VPC Console** -> **Subnets**.
2.  Select your subnet.
3.  Go to the **Tags** tab -> **Manage tags**.
4.  Add the key/value pairs above and click **Save**.

---

## ⚠️ Problems Faced & How We Solved Them

### 1. OIDC Provider Missing in Dropdown
*   **Problem:** When creating an IAM Role, the EKS OIDC provider wasn't showing up in the dropdown.
*   **Solution:** We went to **IAM -> Identity Providers** and manually added the provider using the Cluster's OIDC URL and `sts.amazonaws.com` as the audience.

### 2. "Incorrect Identity Provider URL" Error in EKS
*   **Problem:** Tried to "Associate Identity Provider" in the EKS Console but got an error saying the URL cannot be the same as the issuer.
*   **Solution:** We realized the cluster *already* knows the URL internally; the issue was just that it wasn't registered in **IAM**. Adding it in the **IAM Console** directly (Step 2 above) fixed the dropdown issue.

### 3. Pending Pods due to PVC
*   **Problem:** Backend pods stuck in `Pending`.
*   **Root Cause:** The manifest required a `PersistentVolumeClaim` that didn't exist in the new `demo` namespace.
*   **Solution:** We removed the volume mounts to make the backend **stateless**, which allowed the pods to start immediately.

### 4. Forbidden Pods (Resource Quotas)
*   **Problem:** `kubectl run debug` failed with `Forbidden`.
*   **Root Cause:** The `ResourceQuota` required all containers to have CPU/Memory limits.
*   **Solution:** We used `--overrides` in the command line to specify the required resource limits for the debug pod.

---

## 🏁 Final Check
Verify the controller is running:
`kubectl get pods -n kube-system | grep aws-load-balancer-controller`

Apply your Ingress:
`kubectl apply -f ingress/ingress-alb.yaml`
Check the ALB Address:
`kubectl get ingress -n demo`
