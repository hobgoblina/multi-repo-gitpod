const https = require('https');
const yaml = require('yaml');
const Promise = require('bluebird');

const username = /* github usename */;
const token = /* personal access token */;
const Authorization = `Bearer ${token}`;
const basicAuth = `Basic ${Buffer.from(`${username}:${token}`).toString('base64')}`;

const request = async (options, body = null) => {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      res.setEncoding('utf-8');
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        resolve(JSON.parse(data));
      });
    });

    req.on('error', e => {
      reject(e);
    });
    
    req.end(body);
  });
};

const parseRepos = repos => yaml.parse(Buffer.from(repos.content ? repos.content : 'e30=', 'base64').toString('utf-8')); // e30= is base64-encoded empty object string: '{}'

const triggerBuildsInParentRepos = async (reposFile, branch, repository) => {
  for (const r of reposFile.parentRepositories) {
    let parentRepo = await request({
      host: 'api.github.com', method: 'GET',
      path: `/repos/${r.name}/contents/repos.yml?ref=${r.branch}`,
      headers: { Authorization, 'User-Agent': 'AWS-Lambda' },
    });
    
    if (parentRepo && parentRepo.content) {
      parentRepo = parseRepos(parentRepo);

      const repoFound = parentRepo.childRepositories ? parentRepo.childRepositories.find(child => {
        return child.branch === branch && child.name === repository;
      }) : false;
  
      if (repoFound) {
        console.log('repo found');
        const ref = await request({
          host: 'api.github.com', method: 'GET',
          path: `/repos/${r.name}/git/ref/heads/${r.branch}`,
          headers: { Authorization: basicAuth, 'User-Agent': 'AWS-Lambda' },
        });
        
        const commit = await request({
          host: 'api.github.com', method: 'GET',
          path: `/repos/${r.name}/git/commits/${ref.object.sha}`,
          headers: { Authorization: basicAuth, 'User-Agent': 'AWS-Lambda' },
        });
        
        const newCommit = await request({
          host: 'api.github.com', method: 'POST',
          path: `/repos/${r.name}/git/commits`,
          headers: { Authorization: basicAuth, 'User-Agent': 'AWS-Lambda' },
        }, JSON.stringify({
          message: 'Gitpod Build Hook [ Empty Commit ]',
          tree: commit.tree.sha,
          parents: commit.parents.map(p => p.sha),
        }));
        
        const newRef = await request({
          host: 'api.github.com', method: 'PATCH',
          path: `/repos/${r.name}/git/refs/heads/${r.branch}`,
          headers: { Authorization: basicAuth, 'User-Agent': 'AWS-Lambda' },
        }, JSON.stringify({
          sha: newCommit.sha,
          force: true,
        }));
      }
      
      if (parentRepo.parentRepositories) {
        await triggerBuildsInParentRepos(parentRepo, r.branch, r.name);
      }
    } else {
      console.log(parentRepo);
    }
  }
}

exports.handler = async (event) => {
    const e = JSON.parse(event.body);
    const branch = e.ref.slice(11);    // Remove `refs/heads/`
    const repository = e.repository.full_name;

    let reposFile = await request({
      host: 'api.github.com', method: 'GET',
      path: `/repos/${repository}/contents/repos.yml?ref=${branch}`,
      headers: { Authorization, 'User-Agent': 'AWS-Lambda' },
    });
    
    if (reposFile && reposFile.content) {
      reposFile = parseRepos(reposFile);

      if (reposFile.parentRepositories) {
        await triggerBuildsInParentRepos(reposFile, branch, repository);
      }
    } else {
      console.log(reposFile);
    }
  
    return {
        'success': true
    }
};

