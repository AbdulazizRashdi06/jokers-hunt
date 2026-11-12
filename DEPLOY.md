# Deploy Joker’s Hunt

Production runs on Zarqa at [jokers-hunt.173-249-40-122.sslip.io](https://jokers-hunt.173-249-40-122.sslip.io/). The GitHub repository is [AbdulazizRashdi06/jokers-hunt](https://github.com/AbdulazizRashdi06/jokers-hunt).

## For your agent

1. Get the requested changes onto `main` and confirm they’re on GitHub.
2. Open [Deploy to Zarqa](https://github.com/AbdulazizRashdi06/jokers-hunt/actions/workflows/deploy.yml), choose **Run workflow**, and select `main`. An agent signed into GitHub with repository write access can use the CLI instead.

   ```sh
   gh workflow run deploy.yml --ref main -R AbdulazizRashdi06/jokers-hunt
   gh run list --workflow deploy.yml --branch main --limit 5 -R AbdulazizRashdi06/jokers-hunt
   gh run watch RUN_ID --exit-status -R AbdulazizRashdi06/jokers-hunt
   ```

3. Confirm the run’s commit matches the intended revision. Open the production URL and check the feature you changed. The workflow checks the homepage and `/api/config`.

This is a manual release. A push to `main` makes the revision available for deployment. GitHub write access allows a collaborator to run the release and ship code with the app’s production backend access.

For a build-only check, select **Build on Zarqa without replacing the live app** or run `gh workflow run deploy.yml --ref main -f verify_only=true -R AbdulazizRashdi06/jokers-hunt`.

## Database changes

Before the first release with team rosters and organizer team controls, the VPS owner needs to apply these migrations to the `jokers` database on Zarqa.

1. [Team roster migration](supabase/migrations/20261111_team_roster.sql)
2. [Team support migration](supabase/migrations/20261111_team_support.sql)

From `/opt/jokers-hunt` on Zarqa, use `docker compose exec -T db psql -X -v ON_ERROR_STOP=1 --single-transaction -U postgres -d jokers` and pipe the reviewed SQL into it. The release command checks for the required schema before replacing the live app.

## Deployment and recovery

GitHub Actions uses the repository secrets `ZARQA_DEPLOY_KEY` and `ZARQA_KNOWN_HOSTS`. The SSH key is restricted on Zarqa to the Joker’s Hunt release command. The running app gets its Supabase and game settings from `/opt/jokers-hunt/.env` on the VPS.

The release builds the Next.js app and starts its container alongside the existing database, organizer authentication, and shared HTTPS proxy. Database schema changes are a separate operation. The server records the healthy release in `/opt/jokers-hunt/.deployed-revision` and restores the previous app image if startup or health checks fail.

If a run fails, read the failed step before dispatching again. Use `gh run view RUN_ID --log-failed -R AbdulazizRashdi06/jokers-hunt` for the CLI logs. To revert a healthy release, revert the relevant code on `main` and run the workflow again.

## Server setup

The owner-installed command at `/opt/jokers-hunt/bin/zarqa-release.sh` comes from [deploy/zarqa-release.sh](deploy/zarqa-release.sh). If that script needs an update, the VPS owner installs the reviewed copy with their regular SSH access. The Actions key runs the installed command with the Git commit SHA and app source archive. It uses the existing Dockerfile and Compose project in `/opt/jokers-hunt`.
