# RoboHatch Platform

A monorepo for the RoboHatch platform built with Turborepo.

## Structure

```
robohatch-platform/
│
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Node.js backend
│
├── packages/
│   ├── ui/           # Shared UI components
│   └── config/       # Shared configs (eslint, ts)
│
├── infra/            # AWS, scripts, docs
│
├── .gitignore
├── package.json
├── turbo.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.10.0

### Installation

```bash
pnpm install
```

### Development

Run all apps in development mode:

```bash
pnpm dev
```

### Build

Build all apps:

```bash
pnpm build
```

### Lint

Lint all apps:

```bash
pnpm lint
```

## Apps

- **web**: Next.js frontend application
- **api**: Node.js backend API

## Packages

- **ui**: Shared UI components library
- **config**: Shared configuration files (ESLint, TypeScript)

## Infrastructure

The `infra/` directory contains AWS configurations, deployment scripts, and documentation.
