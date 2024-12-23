# Active-Passive Development Configuration

## Overview
This document outlines the development configuration for an Active-Passive deployment pattern.

## Development Setup
Development environment configuration:
- 1 active and 1 passive instance
- Manual failover testing
- Local development databases
- Basic monitoring setup

## Failover Configuration
With Primary and Secondary Ingress:
- Failover trigger: manual or automated
- Failover time: < 5 minutes
- Health check endpoint: /health
- Automated database failover testing
