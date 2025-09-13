#!/bin/bash

# Pipeline Monitoring and Alerting Script
# This script monitors Jenkins pipeline health and sends alerts

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/monitoring-config.json"
LOG_FILE="/var/log/pipeline-monitor.log"
JENKINS_URL="${JENKINS_URL:-http://localhost:8080}"
JOB_NAME="${JOB_NAME:-Parabank-Automation}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log_info() {
    log -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    log -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    log -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    log -e "${RED}[ERROR]${NC} $1"
}

# Create default configuration if it doesn't exist
create_default_config() {
    if [[ ! -f "$CONFIG_FILE" ]]; then
        log_info "Creating default monitoring configuration..."
        
        cat > "$CONFIG_FILE" << 'EOF'
{
  "jenkins": {
    "url": "http://localhost:8080",
    "job_name": "Parabank-Automation",
    "username": "admin",
    "token": "",
    "timeout": 30
  },
  "monitoring": {
    "check_interval": 300,
    "max_build_duration": 3600,
    "failure_threshold": 3,
    "success_rate_threshold": 80,
    "disk_usage_threshold": 85
  },
  "notifications": {
    "slack": {
      "enabled": false,
      "webhook_url": "",
      "channel": "#automation",
      "mentions": ["@team"]
    },
    "email": {
      "enabled": false,
      "smtp_server": "smtp.company.com",
      "smtp_port": 587,
      "username": "",
      "password": "",
      "recipients": ["team@company.com"]
    },
    "teams": {
      "enabled": false,
      "webhook_url": ""
    }
  },
  "health_checks": {
    "jenkins_api": true,
    "disk_space": true,
    "memory_usage": true,
    "recent_builds": true,
    "test_environment": true
  }
}
EOF
        log_success "Default configuration created at $CONFIG_FILE"
        log_warning "Please update the configuration with your actual values"
    fi
}

# Load configuration
load_config() {
    if [[ ! -f "$CONFIG_FILE" ]]; then
        log_error "Configuration file not found: $CONFIG_FILE"
        create_default_config
        return 1
    fi
    
    # Validate JSON
    if ! jq empty "$CONFIG_FILE" 2>/dev/null; then
        log_error "Invalid JSON in configuration file: $CONFIG_FILE"
        return 1
    fi
    
    log_info "Configuration loaded from $CONFIG_FILE"
}

# Get configuration values
get_config() {
    local key="$1"
    local default="${2:-}"
    
    if [[ -f "$CONFIG_FILE" ]]; then
        jq -r "$key // \"$default\"" "$CONFIG_FILE" 2>/dev/null || echo "$default"
    else
        echo "$default"
    fi
}

# Check Jenkins API connectivity
check_jenkins_api() {
    local jenkins_url
    local timeout
    
    jenkins_url=$(get_config '.jenkins.url' "$JENKINS_URL")
    timeout=$(get_config '.jenkins.timeout' '30')
    
    log_info "Checking Jenkins API connectivity..."
    
    if curl -s --max-time "$timeout" "$jenkins_url/api/json" > /dev/null; then
        log_success "Jenkins API is accessible"
        return 0
    else
        log_error "Jenkins API is not accessible at $jenkins_url"
        return 1
    fi
}

# Get job information
get_job_info() {
    local jenkins_url
    local job_name
    local username
    local token
    
    jenkins_url=$(get_config '.jenkins.url' "$JENKINS_URL")
    job_name=$(get_config '.jenkins.job_name' "$JOB_NAME")
    username=$(get_config '.jenkins.username' '')
    token=$(get_config '.jenkins.token' '')
    
    local auth_param=""
    if [[ -n "$username" && -n "$token" ]]; then
        auth_param="--user $username:$token"
    fi
    
    curl -s $auth_param "$jenkins_url/job/$job_name/api/json"
}

# Check recent builds
check_recent_builds() {
    local job_info
    local last_build_number
    local last_build_result
    local failure_threshold
    
    log_info "Checking recent build status..."
    
    job_info=$(get_job_info)
    if [[ -z "$job_info" ]]; then
        log_error "Unable to retrieve job information"
        return 1
    fi
    
    last_build_number=$(echo "$job_info" | jq -r '.lastBuild.number // 0')
    if [[ "$last_build_number" -eq 0 ]]; then
        log_warning "No builds found for the job"
        return 0
    fi
    
    failure_threshold=$(get_config '.monitoring.failure_threshold' '3')
    
    # Check recent builds for consecutive failures
    local failures=0
    local builds_to_check=10
    
    for ((i=0; i<builds_to_check; i++)); do
        local build_number=$((last_build_number - i))
        if [[ $build_number -lt 1 ]]; then
            break
        fi
        
        local build_result
        build_result=$(get_build_result "$build_number")
        
        if [[ "$build_result" == "FAILURE" ]]; then
            failures=$((failures + 1))
        else
            break  # Reset counter on success
        fi
    done
    
    if [[ $failures -ge $failure_threshold ]]; then
        log_error "Pipeline has failed $failures consecutive times (threshold: $failure_threshold)"
        send_alert "Pipeline Failure Alert" "Pipeline has failed $failures consecutive times"
        return 1
    else
        log_success "Recent builds are healthy (consecutive failures: $failures)"
        return 0
    fi
}

# Get build result
get_build_result() {
    local build_number="$1"
    local jenkins_url
    local job_name
    local username
    local token
    
    jenkins_url=$(get_config '.jenkins.url' "$JENKINS_URL")
    job_name=$(get_config '.jenkins.job_name' "$JOB_NAME")
    username=$(get_config '.jenkins.username' '')
    token=$(get_config '.jenkins.token' '')
    
    local auth_param=""
    if [[ -n "$username" && -n "$token" ]]; then
        auth_param="--user $username:$token"
    fi
    
    curl -s $auth_param "$jenkins_url/job/$job_name/$build_number/api/json" | jq -r '.result // "UNKNOWN"'
}

# Check build duration
check_build_duration() {
    local job_info
    local last_build_number
    local max_duration
    local build_info
    local duration
    
    log_info "Checking build duration..."
    
    max_duration=$(get_config '.monitoring.max_build_duration' '3600')
    job_info=$(get_job_info)
    last_build_number=$(echo "$job_info" | jq -r '.lastBuild.number // 0')
    
    if [[ "$last_build_number" -eq 0 ]]; then
        log_info "No builds to check duration"
        return 0
    fi
    
    build_info=$(get_build_info "$last_build_number")
    duration=$(echo "$build_info" | jq -r '.duration // 0')
    
    # Convert to seconds (Jenkins returns milliseconds)
    duration=$((duration / 1000))
    
    if [[ $duration -gt $max_duration ]]; then
        log_warning "Last build took ${duration}s (threshold: ${max_duration}s)"
        send_alert "Long Build Duration" "Build #$last_build_number took ${duration}s (threshold: ${max_duration}s)"
        return 1
    else
        log_success "Build duration is acceptable: ${duration}s"
        return 0
    fi
}

# Get build information
get_build_info() {
    local build_number="$1"
    local jenkins_url
    local job_name
    local username
    local token
    
    jenkins_url=$(get_config '.jenkins.url' "$JENKINS_URL")
    job_name=$(get_config '.jenkins.job_name' "$JOB_NAME")
    username=$(get_config '.jenkins.username' '')
    token=$(get_config '.jenkins.token' '')
    
    local auth_param=""
    if [[ -n "$username" && -n "$token" ]]; then
        auth_param="--user $username:$token"
    fi
    
    curl -s $auth_param "$jenkins_url/job/$job_name/$build_number/api/json"
}

# Check disk space
check_disk_space() {
    local threshold
    local usage
    local jenkins_home
    
    log_info "Checking disk space..."
    
    threshold=$(get_config '.monitoring.disk_usage_threshold' '85')
    jenkins_home="${JENKINS_HOME:-/var/lib/jenkins}"
    
    if [[ ! -d "$jenkins_home" ]]; then
        log_warning "Jenkins home directory not found: $jenkins_home"
        return 0
    fi
    
    usage=$(df "$jenkins_home" | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [[ $usage -gt $threshold ]]; then
        log_error "Disk usage is ${usage}% (threshold: ${threshold}%)"
        send_alert "High Disk Usage" "Jenkins disk usage is ${usage}% (threshold: ${threshold}%)"
        return 1
    else
        log_success "Disk usage is acceptable: ${usage}%"
        return 0
    fi
}

# Check memory usage
check_memory_usage() {
    local memory_info
    local memory_usage
    
    log_info "Checking system memory usage..."
    
    memory_info=$(free | grep '^Mem:')
    local total=$(echo "$memory_info" | awk '{print $2}')
    local used=$(echo "$memory_info" | awk '{print $3}')
    
    memory_usage=$((used * 100 / total))
    
    if [[ $memory_usage -gt 90 ]]; then
        log_error "High memory usage: ${memory_usage}%"
        send_alert "High Memory Usage" "System memory usage is ${memory_usage}%"
        return 1
    else
        log_success "Memory usage is acceptable: ${memory_usage}%"
        return 0
    fi
}

# Check test environment connectivity
check_test_environment() {
    local parabank_url="https://parabank.parasoft.com/parabank"
    local api_url="https://parabank.parasoft.com/parabank/services/bank"
    
    log_info "Checking test environment connectivity..."
    
    if curl -s --max-time 10 --head "$parabank_url" > /dev/null; then
        log_success "Parabank UI is accessible"
    else
        log_error "Parabank UI is not accessible"
        send_alert "Test Environment Down" "Parabank UI at $parabank_url is not accessible"
        return 1
    fi
    
    if curl -s --max-time 10 --head "$api_url" > /dev/null; then
        log_success "Parabank API is accessible"
    else
        log_warning "Parabank API is not accessible (this may be normal)"
    fi
    
    return 0
}

# Calculate success rate
calculate_success_rate() {
    local job_info
    local builds_to_analyze=20
    local successful_builds=0
    local total_builds=0
    local last_build_number
    
    log_info "Calculating success rate for last $builds_to_analyze builds..."
    
    job_info=$(get_job_info)
    last_build_number=$(echo "$job_info" | jq -r '.lastBuild.number // 0')
    
    if [[ "$last_build_number" -eq 0 ]]; then
        log_info "No builds found for success rate calculation"
        return 0
    fi
    
    for ((i=0; i<builds_to_analyze; i++)); do
        local build_number=$((last_build_number - i))
        if [[ $build_number -lt 1 ]]; then
            break
        fi
        
        local build_result
        build_result=$(get_build_result "$build_number")
        
        if [[ -n "$build_result" && "$build_result" != "null" ]]; then
            total_builds=$((total_builds + 1))
            if [[ "$build_result" == "SUCCESS" ]]; then
                successful_builds=$((successful_builds + 1))
            fi
        fi
    done
    
    if [[ $total_builds -eq 0 ]]; then
        log_info "No completed builds found"
        return 0
    fi
    
    local success_rate=$((successful_builds * 100 / total_builds))
    local threshold
    threshold=$(get_config '.monitoring.success_rate_threshold' '80')
    
    if [[ $success_rate -lt $threshold ]]; then
        log_error "Success rate is ${success_rate}% (${successful_builds}/${total_builds}) - below threshold: ${threshold}%"
        send_alert "Low Success Rate" "Pipeline success rate is ${success_rate}% (${successful_builds}/${total_builds})"
        return 1
    else
        log_success "Success rate is healthy: ${success_rate}% (${successful_builds}/${total_builds})"
        return 0
    fi
}

# Send Slack notification
send_slack_notification() {
    local title="$1"
    local message="$2"
    local webhook_url
    local channel
    local mentions
    
    webhook_url=$(get_config '.notifications.slack.webhook_url' '')
    channel=$(get_config '.notifications.slack.channel' '#automation')
    mentions=$(get_config '.notifications.slack.mentions[]' '' | tr '\n' ' ')
    
    if [[ -z "$webhook_url" ]]; then
        log_warning "Slack webhook URL not configured"
        return 1
    fi
    
    local payload
    payload=$(cat <<EOF
{
    "channel": "$channel",
    "text": "$title",
    "attachments": [
        {
            "color": "danger",
            "title": "$title",
            "text": "$message\n$mentions",
            "footer": "Pipeline Monitor",
            "ts": $(date +%s)
        }
    ]
}
EOF
    )
    
    if curl -X POST -H 'Content-type: application/json' \
            --data "$payload" \
            --max-time 10 \
            "$webhook_url" > /dev/null 2>&1; then
        log_info "Slack notification sent successfully"
        return 0
    else
        log_error "Failed to send Slack notification"
        return 1
    fi
}

# Send email notification
send_email_notification() {
    local title="$1"
    local message="$2"
    local smtp_server
    local smtp_port
    local username
    local password
    local recipients
    
    smtp_server=$(get_config '.notifications.email.smtp_server' '')
    smtp_port=$(get_config '.notifications.email.smtp_port' '587')
    username=$(get_config '.notifications.email.username' '')
    password=$(get_config '.notifications.email.password' '')
    recipients=$(get_config '.notifications.email.recipients[]' '' | tr '\n' ',' | sed 's/,$//')
    
    if [[ -z "$smtp_server" || -z "$username" || -z "$recipients" ]]; then
        log_warning "Email configuration incomplete"
        return 1
    fi
    
    # This is a simplified example - you might want to use a proper email tool
    local email_body="Subject: $title
From: $username
To: $recipients

$message

--
Pipeline Monitoring System
$(date)
"
    
    echo "$email_body" | sendmail "$recipients" 2>/dev/null || {
        log_error "Failed to send email notification"
        return 1
    }
    
    log_info "Email notification sent successfully"
    return 0
}

# Send alert
send_alert() {
    local title="$1"
    local message="$2"
    local slack_enabled
    local email_enabled
    
    slack_enabled=$(get_config '.notifications.slack.enabled' 'false')
    email_enabled=$(get_config '.notifications.email.enabled' 'false')
    
    log_info "Sending alert: $title"
    
    if [[ "$slack_enabled" == "true" ]]; then
        send_slack_notification "$title" "$message"
    fi
    
    if [[ "$email_enabled" == "true" ]]; then
        send_email_notification "$title" "$message"
    fi
    
    if [[ "$slack_enabled" == "false" && "$email_enabled" == "false" ]]; then
        log_warning "No notification methods enabled"
    fi
}

# Generate monitoring report
generate_report() {
    local report_file="pipeline-health-report.html"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    log_info "Generating monitoring report..."
    
    cat > "$report_file" <<EOF
<!DOCTYPE html>
<html>
<head>
    <title>Pipeline Health Report</title>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .status-ok { color: #28a745; }
        .status-warning { color: #ffc107; }
        .status-error { color: #dc3545; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f8f9fa; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Pipeline Health Report</h1>
        <p>Generated: $timestamp</p>
        <p>Jenkins URL: $(get_config '.jenkins.url')</p>
        <p>Job: $(get_config '.jenkins.job_name')</p>
    </div>
    
    <h2>📊 Health Check Results</h2>
    <table>
        <tr><th>Check</th><th>Status</th><th>Details</th></tr>
EOF

    # Run health checks and add to report
    local checks=(
        "Jenkins API:check_jenkins_api"
        "Recent Builds:check_recent_builds"
        "Build Duration:check_build_duration"
        "Disk Space:check_disk_space"
        "Memory Usage:check_memory_usage"
        "Test Environment:check_test_environment"
    )
    
    for check_info in "${checks[@]}"; do
        local check_name="${check_info%:*}"
        local check_function="${check_info#*:}"
        local status="❌ FAIL"
        local details=""
        
        if $check_function >/dev/null 2>&1; then
            status="✅ PASS"
        else
            status="❌ FAIL"
        fi
        
        echo "        <tr><td>$check_name</td><td>$status</td><td>$details</td></tr>" >> "$report_file"
    done
    
    cat >> "$report_file" <<EOF
    </table>
    
    <h2>📈 Recent Build History</h2>
    <div id="build-history">
        <!-- Build history will be populated here -->
    </div>
    
    <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd;">
        <p><em>Report generated by Pipeline Monitoring System</em></p>
    </footer>
</body>
</html>
EOF

    log_success "Health report generated: $report_file"
}

# Main health check function
run_health_checks() {
    local overall_status=0
    local jenkins_api_enabled
    local disk_space_enabled
    local memory_usage_enabled
    local recent_builds_enabled
    local test_environment_enabled
    
    log_info "Starting pipeline health checks..."
    
    # Get enabled checks from config
    jenkins_api_enabled=$(get_config '.health_checks.jenkins_api' 'true')
    disk_space_enabled=$(get_config '.health_checks.disk_space' 'true')
    memory_usage_enabled=$(get_config '.health_checks.memory_usage' 'true')
    recent_builds_enabled=$(get_config '.health_checks.recent_builds' 'true')
    test_environment_enabled=$(get_config '.health_checks.test_environment' 'true')
    
    # Run enabled health checks
    if [[ "$jenkins_api_enabled" == "true" ]]; then
        check_jenkins_api || overall_status=1
    fi
    
    if [[ "$recent_builds_enabled" == "true" ]]; then
        check_recent_builds || overall_status=1
        calculate_success_rate || overall_status=1
        check_build_duration || overall_status=1
    fi
    
    if [[ "$disk_space_enabled" == "true" ]]; then
        check_disk_space || overall_status=1
    fi
    
    if [[ "$memory_usage_enabled" == "true" ]]; then
        check_memory_usage || overall_status=1
    fi
    
    if [[ "$test_environment_enabled" == "true" ]]; then
        check_test_environment || overall_status=1
    fi
    
    return $overall_status
}

# Daemon mode function
run_daemon() {
    local check_interval
    check_interval=$(get_config '.monitoring.check_interval' '300')
    
    log_info "Starting pipeline monitoring daemon (check interval: ${check_interval}s)"
    
    while true; do
        log_info "Running scheduled health checks..."
        
        if run_health_checks; then
            log_success "All health checks passed"
        else
            log_warning "Some health checks failed"
        fi
        
        log_info "Next check in ${check_interval} seconds..."
        sleep "$check_interval"
    done
}

# Cleanup function
cleanup() {
    log_info "Pipeline monitoring stopped"
    exit 0
}

# Signal handlers
trap cleanup SIGTERM SIGINT

# Usage function
usage() {
    cat <<EOF
Pipeline Monitoring Script

Usage: $0 [OPTIONS] [COMMAND]

Commands:
    check       Run health checks once (default)
    daemon      Run continuous monitoring
    report      Generate HTML health report
    config      Show current configuration
    init        Create default configuration

Options:
    -c, --config FILE    Configuration file path
    -v, --verbose        Verbose output
    -q, --quiet         Quiet mode
    -h, --help          Show this help

Examples:
    $0                          # Run health checks once
    $0 daemon                   # Start monitoring daemon
    $0 report                   # Generate HTML report
    $0 -c custom-config.json    # Use custom config

Configuration:
    Edit $CONFIG_FILE to customize monitoring settings.

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -c|--config)
                CONFIG_FILE="$2"
                shift 2
                ;;
            -v|--verbose)
                set -x
                shift
                ;;
            -q|--quiet)
                exec 1>/dev/null
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            check)
                COMMAND="check"
                shift
                ;;
            daemon)
                COMMAND="daemon"
                shift
                ;;
            report)
                COMMAND="report"
                shift
                ;;
            config)
                COMMAND="config"
                shift
                ;;
            init)
                COMMAND="init"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
}

# Main function
main() {
    local COMMAND="${COMMAND:-check}"
    
    # Ensure log directory exists
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Load or create configuration
    load_config
    
    case "$COMMAND" in
        check)
            log_info "Running one-time health checks..."
            if run_health_checks; then
                log_success "All health checks completed successfully"
                exit 0
            else
                log_error "Some health checks failed"
                exit 1
            fi
            ;;
        daemon)
            run_daemon
            ;;
        report)
            generate_report
            ;;
        config)
            log_info "Current configuration:"
            if [[ -f "$CONFIG_FILE" ]]; then
                jq . "$CONFIG_FILE"
            else
                log_error "Configuration file not found: $CONFIG_FILE"
                exit 1
            fi
            ;;
        init)
            create_default_config
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            usage
            exit 1
            ;;
    esac
}

# Check dependencies
check_dependencies() {
    local missing_deps=()
    
    if ! command -v curl >/dev/null 2>&1; then
        missing_deps+=("curl")
    fi
    
    if ! command -v jq >/dev/null 2>&1; then
        missing_deps+=("jq")
    fi
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_info "Please install the missing dependencies:"
        log_info "  Ubuntu/Debian: sudo apt-get install ${missing_deps[*]}"
        log_info "  CentOS/RHEL: sudo yum install ${missing_deps[*]}"
        log_info "  macOS: brew install ${missing_deps[*]}"
        exit 1
    fi
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    check_dependencies
    parse_args "$@"
    main
fi