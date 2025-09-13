pipeline {
    agent any

    environment {
        DOCKER_IMAGE = "parabank-automation:latest"
        REPORTS_DIR = "${WORKSPACE}/reports"
        EXTENT_REPORT_DIR = "${WORKSPACE}/reports/extent"
        ALLURE_RESULTS = "${WORKSPACE}/allure-results"
        HEADLESS = "${params.HEADLESS_MODE}"
        CHROME_BIN = "/usr/bin/google-chrome"
    }

    parameters {
        choice(
            name: 'TEST_SUITE',
            choices: ['all', 'smoke', 'ui', 'api', 'regression'],
            description: 'Select test suite to run'
        )
        choice(
            name: 'BROWSER',
            choices: ['chromium', 'firefox', 'webkit'],
            description: 'Select browser for UI tests'
        )
        booleanParam(
            name: 'HEADLESS_MODE',
            defaultValue: true,
            description: 'Run tests in headless mode'
        )
        booleanParam(
            name: 'GENERATE_PDF_REPORT',
            defaultValue: true,
            description: 'Generate PDF reports'
        )
        string(
            name: 'PARALLEL_WORKERS',
            defaultValue: '2',
            description: 'Number of parallel test workers'
        )
    }

    stages {

        stage('Checkout') {
            steps {
                cleanWs()
                checkout scm
                sh '''
                    mkdir -p reports/screenshots reports/videos reports/extent allure-results src/features/support/reports
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                echo "🚀 Building Docker image..."
                sh "docker build -t ${DOCKER_IMAGE} ."
            }
        }

        stage('Run Tests in Docker') {
            steps {
                echo "🧪 Running tests inside Docker..."
                sh """
                    # Remove any old container
                    if [ \$(docker ps -aq -f name=parabank-tests) ]; then
                        docker rm -f parabank-tests
                    fi

                    # Run container for test execution
                    docker run --rm -e HEADLESS=${params.HEADLESS_MODE} \
                        -e BROWSER=${params.BROWSER} \
                        -e TEST_SUITE=${params.TEST_SUITE} \
                        -e PARALLEL_WORKERS=${params.PARALLEL_WORKERS} \
                        -v ${REPORTS_DIR}:/app/reports \
                        -v ${ALLURE_RESULTS}:/app/allure-results \
                        ${DOCKER_IMAGE} sh -c "npm run test:ci"
                """
            }
        }

        stage('Generate Reports') {
            steps {
                echo "📊 Generating Spark-style Extent Reports..."
                sh """
                    docker run --rm \
                        -v ${REPORTS_DIR}:/app/reports \
                        -v ${EXTENT_REPORT_DIR}:/app/reports/extent \
                        ${DOCKER_IMAGE} sh -c "node generate-extent-report.js"
                """
            }
        }

        stage('Serve Reports (Optional)') {
            steps {
                echo "🌐 Serving reports via NGINX..."
                sh """
                    # Stop old container if exists
                    if [ \$(docker ps -aq -f name=parabank-report-nginx) ]; then
                        docker rm -f parabank-report-nginx
                    fi

                    # Run NGINX container to serve reports
                    docker run -d --name parabank-report-nginx -p 8080:80 \
                        -v ${EXTENT_REPORT_DIR}:/usr/share/nginx/html \
                        -v ${WORKSPACE}/nginx/default.conf:/etc/nginx/conf.d/default.conf \
                        nginx:alpine
                """
                echo "📌 Reports available at http://localhost:8080/index.html"
            }
        }

        stage('Archive Artifacts') {
            steps {
                archiveArtifacts artifacts: 'reports/**/*, allure-results/**/*', allowEmptyArchive: true
            }
        }
    }

    post {
        always {
            echo "🏁 Pipeline execution completed."
        }
        success {
            echo "✅ Pipeline executed successfully!"
        }
        failure {
            echo "❌ Pipeline failed!"
        }
        unstable {
            echo "⚠️ Pipeline completed with warnings."
        }
    }
}
