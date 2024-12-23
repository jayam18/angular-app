# Active-Passive Test Configuration

## Overview
This document outlines the test environment configuration for an Active-Passive deployment pattern.

## Test Environment
Test environment setup:
- 1 active and 1 passive instance
- Automated failover testing
- Test databases with replication
- Monitoring and alerts enabled

## Test Failover
With Test Primary and Secondary Ingress:
- Automated failover testing schedule
- Failover time measurement
- Database replication validation
- Application state verification

## Mulesoft Integration
Test Mulesoft endpoint with automated failover testing:
- Primary endpoint: https://test-mulesoft-primary.example.com
- Secondary endpoint: https://test-mulesoft-secondary.example.com
- Failover test scenarios
{showFor: Ingress from Mulesoft}

## ForgeRock Integration
Test ForgeRock configuration with session replication:
- Authentication testing
- Session persistence verification
- Failover scenario testing
{showFor: Ingress from ForgeRock}

## Desktop Client Access
Test desktop client with failover simulation capabilities:
- Client failover testing tools
- Performance monitoring
- Error injection testing
{showFor: Ingress from Desktop Clients}

## Internet Access
Test public endpoint with failover monitoring:
- Load balancer testing
- Failover scenario validation
- Performance metrics
{showFor: Ingress from Internet}

## URL Configuration
Test vanity URL with health checks:
- DNS failover testing
- Health check validation
- Monitoring integration
{showFor: Uses Vanity URL}

## Security
Test mutual authentication with failover certificate handling:
- Certificate rotation testing
- Security validation
- Compliance verification
{showFor: Requires Mutual Authentication}
