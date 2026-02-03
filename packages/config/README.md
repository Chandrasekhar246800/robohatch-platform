# Config Package

Shared configuration files for RoboHatch Platform.

## Contents

- `eslint-preset.js`: Shared ESLint configuration
- `tsconfig.base.json`: Base TypeScript configuration

## Usage

### ESLint

```js
// .eslintrc.js
module.exports = {
  extends: ['@robohatch/config/eslint-preset'],
}
```

### TypeScript

```json
// tsconfig.json
{
  "extends": "@robohatch/config/tsconfig.base.json"
}
```
