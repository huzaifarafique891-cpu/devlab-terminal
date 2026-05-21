// Jenkins CI/CD Pipeline for my-webapp
// Simple Express + MySQL notes application

pipeline {
    agent any

    environment {
        GIT_REPO = 'https://github.com/huzaifarafique891-cpu/devlab-terminal.git'
        GIT_BRANCH = 'main'
        DOCKERHUB_CREDENTIALS = 'dockerhub-credentials'
        DOCKER_IMAGE = huzaifaraf/devlab-terminal:v1
        DOCKER_TAG = "${BUILD_NUMBER}"
    }

    tools {
        nodejs 'nodejs-20'
    }

    stages {
        // Stage 1: Pull latest code from GitHub
        stage('Git Checkout') {
            steps {
                echo 'Checking out source code from Git repository...'
                git branch: "${GIT_BRANCH}", url: "${GIT_REPO}"
            }
        }

        // Stage 2: Install Node.js packages
        stage('Install Dependencies') {
            steps {
                echo 'Installing npm dependencies...'
                dir('app') {
                    sh 'npm ci'
                }
            }
        }

        // Stage 3: Run basic application tests
        stage('Run Application Test') {
            steps {
                echo 'Running application tests...'
                dir('app') {
                    sh 'npm test'
                }
            }
        }

        // Stage 4: Build Docker image
        stage('Build Docker Image') {
            steps {
                echo 'Building Docker image...'
                sh "docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} -t ${DOCKER_IMAGE}:latest ."
            }
        }

        // Stage 5: Push image to DockerHub
        stage('Push Docker Image') {
            steps {
                echo 'Pushing Docker image to DockerHub...'
                withCredentials([usernamePassword(credentialsId: "${DOCKERHUB_CREDENTIALS}", usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh """
                        echo \$DOCKER_PASS | docker login -u \$DOCKER_USER --password-stdin
                        docker push ${DOCKER_IMAGE}:${DOCKER_TAG}
                        docker push ${DOCKER_IMAGE}:latest
                        docker logout
                    """
                }
            }
        }

        // Stage 6: Deploy MySQL and web app to Kubernetes
        stage('Kubernetes Deployment') {
            steps {
                echo 'Deploying MySQL and application to Kubernetes...'
                withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG_FILE')]) {
                    sh """
                        set -e
                        export KUBECONFIG="\$KUBECONFIG_FILE"

                        sed -i "s|yourdockerhubusername/my-webapp:latest|${DOCKER_IMAGE}:${DOCKER_TAG}|g" k8s/app-deployment.yaml

                        kubectl apply -f k8s/mysql-secret.yaml
                        kubectl apply -f k8s/mysql-pv.yaml
                        kubectl apply -f k8s/mysql-pvc.yaml
                        kubectl apply -f k8s/mysql-deployment.yaml
                        kubectl apply -f k8s/mysql-service.yaml

                        kubectl rollout status deployment/mysql-deployment --timeout=300s

                        kubectl apply -f k8s/app-deployment.yaml
                        kubectl apply -f k8s/app-service.yaml
                        kubectl apply -f k8s/app-hpa.yaml

                        kubectl rollout status deployment/app-deployment --timeout=300s
                        kubectl get pods,svc,hpa
                    """
                }
            }
        }

        // Stage 7: Install Prometheus and Grafana with Helm (default values only)
        stage('Prometheus Grafana Setup') {
            steps {
                echo 'Installing Prometheus and Grafana using Helm...'
                withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG_FILE')]) {
                    sh '''
                        set -e
                        export KUBECONFIG="$KUBECONFIG_FILE"

                        kubectl create namespace monitoring || true

                        helm repo add prometheus-community https://prometheus-community.github.io/helm-charts || true
                        helm repo update

                        helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
                          --namespace monitoring

                        kubectl --namespace=monitoring get deployments
                        kubectl --namespace=monitoring get services

                        echo "Access Grafana using:"
                        echo "kubectl --namespace monitoring port-forward svc/prometheus-grafana 3000:80 --address=0.0.0.0"

                        echo "Get Grafana password using:"
                        echo "kubectl get secret -n monitoring prometheus-grafana -o jsonpath='{.data.admin-password}' | base64 --decode ; echo"
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully.'
        }
        failure {
            echo 'Pipeline failed. Check stage logs.'
        }
        always {
            cleanWs()
        }
    }
}
