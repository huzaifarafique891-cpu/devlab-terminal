# my-webapp — DevOps Web Application Project

A beginner-friendly **Node.js + Express** website with **MySQL**, packaged with **Docker**, deployed on **Kubernetes**, and automated using **Jenkins CI/CD** with **Prometheus/Grafana** monitoring.

---

## Project Overview

| Component | Technology |
|-----------|------------|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express (port 3000) |
| Database | MySQL 8 (`notes` table) |
| Container | Docker (Node 20 Alpine) |
| Orchestration | Kubernetes |
| CI/CD | Jenkins on AWS EC2 |
| Monitoring | Helm `kube-prometheus-stack` |

**Features:** Add notes, view notes, delete notes — all stored in MySQL.

**API:**

- `GET /api/notes` — list notes
- `POST /api/notes` — create note `{ "content": "..." }`
- `DELETE /api/notes/:id` — delete note
- `GET /api/health` — health check (Docker/K8s only)

---

## Folder Structure

```
my-webapp/
├── app/
│   ├── server.js
│   ├── package.json
│   ├── package-lock.json
│   ├── test.js
│   └── public/
│       ├── index.html
│       ├── style.css
│       └── script.js
├── Dockerfile
├── .dockerignore
├── Jenkinsfile
├── README.md
└── k8s/
    ├── mysql-secret.yaml
    ├── mysql-pv.yaml
    ├── mysql-pvc.yaml
    ├── mysql-deployment.yaml
    ├── mysql-service.yaml
    ├── app-deployment.yaml
    ├── app-service.yaml
    └── app-hpa.yaml
```

---

## Step 1 — Run Locally

### Prerequisites

- Node.js 20+
- MySQL 8

### Commands

```bash
cd app
npm install
```

Create `app/.env`:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=webapp_user
DB_PASSWORD=webapp_pass123
DB_NAME=webapp_db
```

Create database and user in MySQL, then:

```bash
npm start
```

Open: **http://localhost:3000**

Run tests:

```bash
npm test
```

---

## Step 2 — Docker Commands

Build image (from project root):

```bash
docker build -t yourdockerhubusername/my-webapp:latest .
```

Run container:

```bash
docker run -d -p 3000:3000 \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=3306 \
  -e DB_USER=webapp_user \
  -e DB_PASSWORD=webapp_pass123 \
  -e DB_NAME=webapp_db \
  yourdockerhubusername/my-webapp:latest
```

Verify:

```bash
docker ps
curl http://localhost:3000/api/health
```

Push to DockerHub:

```bash
docker login
docker tag yourdockerhubusername/my-webapp:latest yourdockerhubusername/my-webapp:1
docker push yourdockerhubusername/my-webapp:latest
```

---

## Step 3 — Jenkins Setup

### 3.1 Install Jenkins on AWS EC2 (Ubuntu)

```bash
sudo apt update
sudo apt install -y openjdk-17-jdk git
wget -O - https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee /usr/share/keyrings/jenkins-keyring.asc > /dev/null
echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" | sudo tee /etc/apt/sources.list.d/jenkins.list
sudo apt update
sudo apt install -y jenkins
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

Open Jenkins: `http://<EC2_PUBLIC_IP>:8080`

### 3.2 Install Required Tools on EC2

```bash
# Docker
sudo apt install -y docker.io
sudo systemctl enable docker

# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install kubectl /usr/local/bin/kubectl

# Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Node.js (or configure Jenkins NodeJS tool named nodejs-20)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 3.3 Jenkins Plugins

Install: **Git**, **Pipeline**, **Docker Pipeline**, **Credentials Binding**

### 3.4 Jenkins Credentials

| ID | Type | Usage |
|----|------|-------|
| `dockerhub-credentials` | Username/Password | Docker push |
| `kubeconfig` | Secret file | Kubernetes + Helm |

### 3.5 Create Pipeline Job

1. **New Item** → **Pipeline**
2. **Pipeline script from SCM**
3. Repository URL: `https://github.com/huzaifarafique891-cpu/devlab-terminal.git`
4. Script path: `Jenkinsfile`

### 3.6 GitHub Webhook (optional)

GitHub → Settings → Webhooks → Add:

- URL: `http://<EC2_IP>:8080/github-webhook/`
- Event: Push

### 3.7 Update Jenkinsfile

Replace:

- `yourdockerhubusername` in `DOCKER_IMAGE` and `k8s/app-deployment.yaml`

**Git repository (already set in Jenkinsfile):**  
`https://github.com/huzaifarafique891-cpu/devlab-terminal.git`

### Pipeline Stages

1. **Git Checkout**
2. **Install Dependencies**
3. **Run Application Test**
4. **Build Docker Image**
5. **Push Docker Image**
6. **Kubernetes Deployment**
7. **Prometheus Grafana Setup**

---

## Step 4 — Kubernetes Deployment

### Prerequisites

- Working Kubernetes cluster (`kubectl` configured)
- [Metrics Server](https://github.com/kubernetes-sigs/metrics-server) for HPA

### Deploy Commands

```bash
# MySQL
kubectl apply -f k8s/mysql-secret.yaml
kubectl apply -f k8s/mysql-pv.yaml
kubectl apply -f k8s/mysql-pvc.yaml
kubectl apply -f k8s/mysql-deployment.yaml
kubectl apply -f k8s/mysql-service.yaml
kubectl rollout status deployment/mysql-deployment --timeout=300s

# Application
kubectl apply -f k8s/app-deployment.yaml
kubectl apply -f k8s/app-service.yaml
kubectl apply -f k8s/app-hpa.yaml
kubectl rollout status deployment/app-deployment --timeout=300s
```

### Verify

```bash
kubectl get pods
kubectl get svc
kubectl get hpa
```

### Access Application

```bash
kubectl get nodes -o wide
```

Browser: `http://<NODE_IP>:30080`

Or port-forward:

```bash
kubectl port-forward svc/app-service 8080:80
```

Open: **http://localhost:8080**

---

## Step 5 — Helm Setup Instructions

Helm is used in Jenkins to install monitoring. Install Helm on your machine or Jenkins server:

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
helm version
```

Add Prometheus community repo:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

Manual install (same as Jenkins stage — **no custom values file**):

```bash
kubectl create namespace monitoring
helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring
```

Check release:

```bash
helm list -n monitoring
kubectl get pods -n monitoring
```

---

## Step 6 — Monitoring Setup Instructions

The Jenkins **Prometheus Grafana Setup** stage installs:

- **Prometheus** — metrics collection
- **Grafana** — dashboards

Uses default Helm chart values only (no `-f monitoring/prometheus-values.yaml`).

Verify after install:

```bash
kubectl get deployments -n monitoring
kubectl get services -n monitoring
```

---

## Step 7 — Access Commands

### Web Application

```bash
# NodePort
kubectl get nodes -o wide
# http://<NODE_IP>:30080

# Port forward
kubectl port-forward svc/app-service 8080:80
```

### Grafana

```bash
kubectl --namespace monitoring port-forward svc/prometheus-grafana 3000:80 --address=0.0.0.0
```

Open: **http://localhost:3000** (user: `admin`)

Get password:

```bash
kubectl get secret -n monitoring prometheus-grafana -o jsonpath='{.data.admin-password}' | base64 --decode ; echo
```

### Prometheus

```bash
kubectl --namespace monitoring port-forward svc/prometheus-kube-prometheus-prometheus 9090:9090
```

Open: **http://localhost:9090**

### Useful Debug Commands

```bash
kubectl logs deployment/app-deployment
kubectl logs deployment/mysql-deployment
kubectl describe hpa app-hpa
kubectl get events --sort-by=.metadata.creationTimestamp
```

---

## HPA Configuration

| Setting | Value |
|---------|-------|
| Min replicas | 1 |
| Max replicas | 5 |
| CPU target | 50% |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| App pod CrashLoop | Wait for MySQL; check `kubectl logs deployment/app-deployment` |
| HPA not scaling | Install metrics-server |
| PV not bound | Ensure `mysql-pv` path exists on node |
| Jenkins docker permission | `sudo usermod -aG docker jenkins` |

---

## License

MIT — Educational DevOps Project
