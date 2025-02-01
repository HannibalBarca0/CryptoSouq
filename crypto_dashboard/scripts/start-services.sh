#!/bin/bash

# Create .env file if it doesn't exist
if [ ! -f /workspaces/CryptoSouq/crypto_dashboard/.env ]; then
    echo "Creating .env file..."
    cat > /workspaces/CryptoSouq/crypto_dashboard/.env << EOL
# API Keys
CRYPTOPANIC_API_KEY="8f879ae3e7bded2246a3d183e888898975d1692a"

# JWT Settings
SECRET_KEY="your-secret-key-here"

# Database Settings
DATABASE_URL="postgresql://codespace:codespace@localhost:5432/cryptosouq"

# Elasticsearch Settings
ELASTICSEARCH_URL="http://localhost:9200"
EOL
fi
# Load environment variables
set -a
source /workspaces/CryptoSouq/crypto_dashboard/.env
set +a

# Configure Elasticsearch memory and JVM options
export ES_JAVA_OPTS="-Xms128m -Xmx256m"
export ES_JAVA_HOME=""  # Use bundled JDK
export ES_PATH_CONF="/etc/elasticsearch"

# Clean up any existing Elasticsearch processes
pkill -f elasticsearch || true
sleep 2

# Start Elasticsearch with reduced memory settings
echo "Starting Elasticsearch with limited memory..."
sudo -E -u elasticsearch /usr/share/elasticsearch/bin/elasticsearch \
    -E node.name=single-node \
    -E cluster.name=docker-cluster \
    -E bootstrap.memory_lock=false \
    -E xpack.security.enabled=false \
    -E discovery.type=single-node \
    -E http.port=9200 \
    -E http.host=0.0.0.0 \
    -E transport.host=127.0.0.1 \
    -E cluster.routing.allocation.disk.threshold_enabled=false \
    -d

# Wait for Elasticsearch with timeout and health check
echo "Waiting for Elasticsearch to start..."
timeout=60
counter=0
while ! curl -s "http://localhost:9200/_cluster/health" > /dev/null; do
    sleep 5
    counter=$((counter + 5))
    if [ $counter -ge $timeout ]; then
        echo "ERROR: Elasticsearch failed to start within ${timeout} seconds"
        exit 1
    fi
    echo "Still waiting... ($counter seconds)"
done
echo "Elasticsearch is running"

# Start other services
...existing code...

# Start PostgreSQL if not running
echo "Starting PostgreSQL..."
sudo service postgresql start

# Wait for PostgreSQL
until pg_isready; do
    sleep 2
done
echo "PostgreSQL is up"

# Start FastAPI backend
echo "Starting FastAPI backend..."
cd /workspaces/CryptoSouq/crypto_dashboard
uvicorn app.main:app --reload &

# Start React frontend
echo "Starting React frontend..."
cd /workspaces/CryptoSouq/crypto_dashboard/crypto-dashboard
npm start