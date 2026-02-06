#!/bin/bash

# Curl command to simulate a request to GET /api/airlock
# Replace <YOUR_ACCESS_TOKEN> with a valid JWT token.
# Replace <ASSET_ID> with the target asset ID (UUID).
# Replace <BASE_URL> with your local or deployed URL (e.g., http://localhost:3000).

BASE_URL="http://localhost:3000"
ASSET_ID="your-asset-uuid-here"
TOKEN="your-access-token-here"

curl -X GET "${BASE_URL}/api/airlock?asset_id=${ASSET_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -v
