module.exports = {
  '*.{ts,tsx}': [
    'eslint --fix --max-warnings 999',
    'prettier --write',
  ],
  '*.{json,md}': [
    'prettier --write',
  ],
};
