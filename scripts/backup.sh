#!/bin/bash

# Database backup script
# Usage: ./backup.sh [retention_days]

set -e

RETENTION_DAYS=${1:-30}
BACKUP_DIR="/backups/postgres"
DATABASE_NAME="ai_product_platform"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DATABASE_NAME}_${TIMESTAMP}.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p ${BACKUP_DIR}

echo "📦 Creating database backup..."

# Create backup using pg_dump
pg_dump -U postgres -h localhost ${DATABASE_NAME} | gzip > ${BACKUP_FILE}

echo "✅ Backup created: ${BACKUP_FILE}"

# Verify backup
if gzip -t ${BACKUP_FILE}; then
    echo "✅ Backup verified successfully"
else
    echo "❌ Backup verification failed!"
    exit 1
fi

# Clean up old backups
echo "🧹 Cleaning up backups older than ${RETENTION_DAYS} days..."
find ${BACKUP_DIR} -name "${DATABASE_NAME}_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete

echo "✨ Backup process completed!"

# Optional: Upload to cloud storage
# Uncomment and configure for AWS S3, Google Cloud Storage, etc.
# aws s3 cp ${BACKUP_FILE} s3://your-bucket/backups/
