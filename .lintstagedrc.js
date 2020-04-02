module.exports = {
  '!(*test).{js,ts}': 'eslint --cache --fix',
  '!(*test).ts': () => ['tsc', 'ncc build', 'git add dist'],
  '*.{js,ts,json,md}': 'prettier --write'
};
