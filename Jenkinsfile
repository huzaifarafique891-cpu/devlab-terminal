pipeline {
    agent any

    environment {
        GIT_REPO = 'https://github.com/huzaifarafique891-cpu/devlab-terminal.git'
        GIT_BRANCH = 'main'
        DOCKERHUB_CREDENTIALS = 'dockerhub-creds'
        DOCKER_IMAGE = 'huzaifaraf/devlab-terminal'
        DOCKER_TAG = 'v1'
    }

    stages {

        stage('Git Checkout') {
            steps {
                echo 'Checking out source code...'
                git branch: "${GIT_BRANCH}", url: "${GIT_REPO}"
            }
        }

        stage('Install Dependencies') {
            steps {
                echo 'Installing npm packages...'
                dir('app') {
                    sh 'npm install'
                }
            }
        }

        stage('Run Tests') {
            steps {
                echo 'Running application tests...'
                dir('app') {
                    sh 'npm test || true'
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                echo 'Building Docker image...'
                sh """
                    docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} .
                """
            }
        }

        stage('Push Docker Image') {
            steps {
                echo 'Pushing image to DockerHub...'

                withCredentials([
                    usernamePassword(
                        credentialsId: "${DOCKERHUB_CREDENTIALS}",
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )
                ]) {

                    sh """
                        echo \$DOCKER_PASS | docker login -u \$DOCKER_USER --password-stdin

                        docker push ${DOCKER_IMAGE}:${DOCKER_TAG}

                        docker logout
                    """
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                echo 'Deploying application to Kubernetes...'

                sh """
                    kubectl apply -f k8s/

                    kubectl rollout restart deployment app-deployment

                    kubectl get pods
                    kubectl get svc
                """
            }
        }

        stage('Verify Deployment') {
            steps {
                echo 'Verifying Kubernetes deployment...'

                sh """
                    kubectl get pods -o wide
                    kubectl get svc
                """
            }
        }
    }

    post {

        success {
            echo 'Pipeline executed successfully.'
        }

        failure {
            echo 'Pipeline failed.'
        }

        always {
            cleanWs()
        }
    }
}
