# Active-Active Development Configuration

## Overview
This document outlines the development configuration for an Active-Active deployment pattern.

## Architecture
The Active-Active pattern provides high availability through multiple active instances running simultaneously.
- Multiple instances handle traffic concurrently
- Load balancer distributes requests across instances
- Shared database cluster for data consistency

## Ingress from Mulesoft
This is a ingress from mulesoft docs. <!ingressvip!>
-  Identiify where the traffic is coming <!api!> from
- Idenfy something

| ingressvip | api | ingressname |
| ---- | ---- | ---- | ---- |
|10.3.3.3|api.arod05.example.com|*.apps.arod05.example.com|
|10.3.6.3|api.arod06.example.com|*.apps.arod06.example.com|

## Ingress from ForgeRock
This is a ingress from forgeRock docs.
-  Identiify where the traffic is coming from
- Idenfy something

## Egress to Database
This is a egress to database docs.

## Security Configuration
When using Mutual Authentication with SSL/TLS:
- Client certificates required for all service-to-service communication
- TLS 1.2+ enforced for all connections
- Certificate rotation procedures defined
- Regular security audits scheduled

## High Availability
With Load Balancer and Health Checks:
- Load balancer configured for round-robin distribution
- Health check endpoint: /health
- Check interval: 30 seconds
- Failure threshold: 3 consecutive failures
- Recovery threshold: 2 consecutive successes
