# Active-Active Test Configuration

## Overview
This document outlines the test environment configuration for an Active-Active deployment pattern.

## Test Setup
The test environment mirrors production with scaled-down resources:
- 2 active instances for testing
- Test databases and services
- Monitoring and logging enabled

## Test Security
With Test Certificates and Basic Authentication:
- Test certificates issued for all services
- Basic authentication enabled for testing
- Security scanning enabled
- Vulnerability assessments scheduled

## Mulesoft Integration
Test Mulesoft endpoint: https://test-mulesoft.example.com
{showFor: Ingress from Mulesoft}

## ForgeRock Integration
Test ForgeRock configuration with enhanced security settings.
{showFor: Ingress from ForgeRock}

## Desktop Client Access
Test desktop client configuration with load balancing.
{showFor: Ingress from Desktop Clients}

## Internet Access
Test public endpoint with WAF configuration.
{showFor: Ingress from Internet}

## URL Configuration
Test vanity URL configuration with SSL.
{showFor: Uses Vanity URL}

## Security
Test mutual authentication with certificate requirements.
{showFor: Requires Mutual Authentication}
