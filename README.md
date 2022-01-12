# multi-repo-gitpod
Example gitpod meta-repo pattern using the default gitpod container, because git modules suck

Step 1. Declare repos in `repos.yml`

```
repos:
  - name: google-bookchin
    url: https://github.com/you-should/google-bookchin
    branch: gitpod-test-branch
```

Step 2. Do a thing like...

```
tasks:
  - name: Init
    init: |
      npm install               # Dependencies for the clone-repos script (TODO: bash it)
      npm run clone-repos       # Clone those repos
      gp sync-done init         # Tells tasks for the cloned repos that they can run
    command: |
      code -add /workspace/*    # Add the repos to the vscode workspace
```

Step 3. Run tasks for the cloned repos
```
- name: foo
    init: |
      gp sync-await init        # Wait for the repos to get cloned
      cd /workspace/foo         # cd to the repo's directory
      # do other stuff
```
