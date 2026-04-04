FROM gcr.io/google.com/cloudsdktool/cloud-sdk:slim
WORKDIR /workspace

# Install PostgreSQL client for pg_dump
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

COPY backup.sh /workspace/backup.sh
RUN chmod +x /workspace/backup.sh

CMD ["/workspace/backup.sh"]
