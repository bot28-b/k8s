# 🔍 Kubernetes Deployment Verification Guide

Everything is running! Here is how you can verify the Backend and Frontend from within the **KillerCoda** environment.

## 1. Get NodePort and Node IP
KillerCoda usually uses a single node (`controlplane`) or multiple nodes. We need to find the IP and the port.

```bash
# Get the Frontend NodePort (should be 30080 based on your manifest)
export FRONTEND_PORT=$(kubectl get svc frontend-nodeport -n task-manager -o jsonpath='{.spec.ports[0].nodePort}')
export NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')

echo "Frontend Access: http://$NODE_IP:$FRONTEND_PORT"
```

## 2. Test Frontend
The frontend should serve the HTML/JS assets.

```bash
# Verify Frontend is serving content
curl -I http://$NODE_IP:$FRONTEND_PORT
```

## 3. Test Backend (via Frontend Proxy)
Since the frontend uses Nginx to proxy `/api` requests to the backend, testing this URL verifies the entire chain (Frontend -> Nginx -> Backend Service -> Backend Pod).

```bash
# Check Backend Health (Proxied via Frontend)
curl http://$NODE_IP:$FRONTEND_PORT/api/health

# Check Tasks List (Proxied via Frontend)
curl http://$NODE_IP:$FRONTEND_PORT/api/tasks
```

## 4. Test Backend Directly
You can also test the backend service internally from the control plane using the `backend-service` ClusterIP or NodePort (if configured).

```bash
# Get Backend Service ClusterIP
export BACKEND_IP=$(kubectl get svc backend-service -n task-manager -o jsonpath='{.spec.clusterIP}')

# Test Backend API directly
curl http://$BACKEND_IP:3000/api/health
```

## 5. Troubleshooting Commands
If anything feels slow, check the logs:

```bash
# View Backend Logs
kubectl logs -l app=backend -n task-manager --tail=20

# View Frontend Logs
kubectl logs -l app=frontend -n task-manager --tail=20
```
