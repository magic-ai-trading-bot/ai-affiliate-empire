module.exports = {
  '*.{ts,tsx}': [
    'eslint --fix --max-warnings 999 --ignore-pattern "test/**"',
    'prettier --write',
  ],
  '*.{json,md}': [
    'prettier --write',
  ],
};
