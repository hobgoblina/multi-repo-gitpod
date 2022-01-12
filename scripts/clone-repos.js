#!/usr/bin/env node
'use strict';

const gitClone = require('git-clone/promise');
const yaml = require('yaml');
const fs = require('fs');

(async () => {
  const { repos } = yaml.parse(fs.readFileSync('repos.yml').toString());
  for (const repo of repos) {
    await gitClone(repo.url, `/workspace/${repo.name}`, { checkout: repo.branch });
  }
})();
