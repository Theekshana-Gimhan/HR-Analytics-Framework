FROM postgres:15-alpine

# Copy all migration files and runner into the image
COPY . /workspace/migrations

WORKDIR /workspace
RUN chmod +x /workspace/migrations/run-stepwise.sh

CMD ["/workspace/migrations/run-stepwise.sh"]
