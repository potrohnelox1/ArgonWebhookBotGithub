#!/bin/sh
set -e

echo ">>> Waiting for database to be ready..."
# Wait a moment just in case DB is slower than container start
sleep 2

echo ">>> Running Database Migrations..."
# This applies all pending migrations. 
# If the DB is new, it creates all tables.
npx prisma migrate deploy

echo ">>> Seeding Database..."
# This runs the seed script defined in package.json
npx prisma db seed

echo ">>> Starting Application..."
# Execute the main command (npm run start from Dockerfile)
exec "$@"