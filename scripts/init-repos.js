#!/usr/bin/env node
'use strict';

const gitClone = require('git-clone/promise');
const yaml = require('yaml');
const fs = require('fs');

(async () => {
  const configs = yaml.parse(fs.readFileSync('repos.yml').toString());
  configs.repos.forEach(async repo => await gitClone(repo.url, `/workspace/${repo.name}`, { checkout: repo.branch }));
})();
