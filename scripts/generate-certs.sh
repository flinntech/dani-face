#!/bin/bash
# Generate self-signed SSL certificate for development/testing
# For production, use proper SSL certificates from Let's Encrypt or other CA

set -e

echo "🔐 Generating self-signed SSL certificate..."

# Create certs directory if it doesn't exist
mkdir -p certs

# Check if certificates already exist
if [ -f "certs/cert.pem" ] && [ -f "certs/key.pem" ]; then
    read -p "⚠️  Certificates already exist. Overwrite? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Certificate generation cancelled."
        exit 0
    fi
fi

# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/key.pem \
  -out certs/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1"

echo "✅ Self-signed certificate generated successfully!"
echo ""
echo "📁 Certificate files:"
echo "   - certs/cert.pem (Certificate)"
echo "   - certs/key.pem (Private Key)"
echo ""
echo "⚠️  NOTE: This is a self-signed certificate for DEVELOPMENT/TESTING only."
echo "   Your browser will show a security warning."
echo ""
echo "🚀 For production, use proper SSL certificates from:"
echo "   - Let's Encrypt (free): https://letsencrypt.org/"
echo "   - Your domain registrar"
echo "   - Cloud provider (AWS Certificate Manager, Google Cloud SSL, etc.)"
echo ""
echo "📝 To use these certificates, set ENABLE_HTTPS=true in your .env file"
