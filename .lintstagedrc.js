module.exports = {
  '!(*test).{js,ts}': 'eslint --cache --fix',
  '!(*test).ts': () => ['ncc build', 'git add dist'],
  'src/**/*.ts': ['tsc'],
  '*.{js,ts,json,md}': 'prettier --write'
};
