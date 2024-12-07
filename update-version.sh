#!/bin/bash

VERSION="$1"

# Check if a version was provided
if [ -z "$VERSION" ]; then
  echo "Error: Version argument is missing. Usage: $0 <version>"
  exit 1
fi

# Use jq to update the version in package.json
jq '.version = "'"$VERSION"'"' package.json > tmp.json && mv tmp.json package.json

# Alternatively, if jq is not available, use sed (less robust):
# sed -i 's/"version": ".*"/"version": "'"$VERSION"'"/' package.json

echo "Version updated to $VERSION"
