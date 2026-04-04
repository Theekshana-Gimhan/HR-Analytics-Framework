FROM postgres:15-alpine

# copy migration SQL into the image
COPY apply_migrations.sql /workspace/apply_migrations.sql

# ensure psql errors cause job to fail
CMD ["sh","-c","echo 'Applying migrations from /workspace/apply_migrations.sql' && psql \"$DATABASE_URL\" -v ON_ERROR_STOP=1 -f /workspace/apply_migrations.sql"]
