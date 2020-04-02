module.exports = {
  '!(*test).{js,ts}': 'eslint --cache --fix',
  '!(*test).ts': () => ['tsc', 'ncc build'],
  '*.{js,ts,json,md}': 'prettier --write'
};
