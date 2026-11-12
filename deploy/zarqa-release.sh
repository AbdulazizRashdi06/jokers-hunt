#!/usr/bin/env bash
# Installed on Zarqa as the forced command for the repository's SSH key.
set -euo pipefail
umask 077

requested=${SSH_ORIGINAL_COMMAND:-}
revision=${requested#verify }
if [[ ! $revision =~ ^[0-9a-f]{40}$ ]]; then
  echo 'Expected a Git commit SHA and a release archive on stdin.' >&2
  exit 2
fi

cd /opt/jokers-hunt
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT
mkdir "$work_dir/source"

# Bound both compressed and unpacked sizes. The caller supplies app source only.
archive="$work_dir/source.tar.gz"
archive_limit=$((16 * 1024 * 1024))
timeout 60 head -c "$((archive_limit + 1))" > "$archive"
if (( $(stat -c %s "$archive") > archive_limit )); then
  echo 'Release archive exceeds 16 MiB.' >&2
  exit 2
fi
python3 - "$archive" "$work_dir/source" <<'PY'
from pathlib import PurePosixPath
import sys
import tarfile

root_files = {
    "package.json", "package-lock.json", "next.config.mjs", "next-env.d.ts",
    "tsconfig.json", "tailwind.config.ts", "postcss.config.mjs",
}
source_dirs = {"src", "public", "scripts"}
with tarfile.open(sys.argv[1], "r:gz") as archive:
    members = []
    total_size = 0
    for member in archive:
        path = PurePosixPath(member.name)
        allowed = (
            bool(path.parts)
            and not path.is_absolute()
            and ".." not in path.parts
            and not any(part == ".env" or part.startswith(".env.") for part in path.parts)
            and (path.parts[0] in source_dirs
                 or (len(path.parts) == 1 and path.name in root_files and member.isfile()))
        )
        if not allowed or not (member.isfile() or member.isdir()):
            raise SystemExit(f"Unexpected entry in release archive: {member.name!r}")
        total_size += member.size
        if total_size > 64 * 1024 * 1024 or len(members) >= 4096:
            raise SystemExit("Release archive exceeds extraction limits.")
        members.append(member)
    archive.extractall(sys.argv[2], members=members, filter="data")
PY

exec 9>.redeploy.lock
flock -w 120 9
if [[ $requested == "$revision" ]] &&
   [[ -f "$work_dir/source/src/lib/team-input.ts" || -f "$work_dir/source/src/app/api/admin/settings/route.ts" ]]; then
  schema_ready=$(docker compose exec -T db psql -X -qAt -v ON_ERROR_STOP=1 -U postgres -d jokers <<'SQL'
select count(*) = 3
  and to_regprocedure('public.join_team_member(uuid,text,text)') is not null
  and to_regprocedure('public.organizer_team_action(uuid,uuid,text,text,text,text)') is not null
from information_schema.columns
where table_schema = 'public' and (
  (table_name = 'teams' and column_name in ('captain_phone', 'member_names')) or
  (table_name = 'game_settings' and column_name = 'help_phone')
);
SQL
  )
  if [[ $schema_ready != t ]]; then
    echo 'Apply the team roster and team support migrations in DEPLOY.md before releasing this app.' >&2
    exit 1
  fi
fi
app_container="$(docker compose ps -q app)"
test -n "$app_container"
previous_image="$(docker inspect --format '{{.Image}}' "$app_container")"
image="jokers-hunt-app:$revision"
site_url=https://jokers-hunt.173-249-40-122.sslip.io
cp Dockerfile "$work_dir/source/Dockerfile"
docker build --tag "$image" --build-arg "NEXT_PUBLIC_SITE_URL=$site_url" "$work_dir/source"
if [[ $requested != "$revision" ]]; then
  echo "Built and verified revision $revision."
  exit 0
fi
docker tag "$image" jokers-hunt-app:latest

if docker compose up -d --no-build --no-deps app; then
  for attempt in $(seq 1 15); do
    if docker exec zarqa-caddy-1 wget -q -T 5 -O /dev/null http://jokers-hunt:3000/ &&
       docker exec zarqa-caddy-1 wget -q -T 5 -O - http://jokers-hunt:3000/api/config |
         python3 -c 'import json, sys; sys.exit(not isinstance(json.load(sys.stdin).get("totalStages"), int))' 2>/dev/null; then
      printf '%s\n' "$revision" > .deployed-revision
      echo "Joker's Hunt is running revision $revision."
      exit 0
    fi
    sleep 3
  done
fi

echo 'The new app did not pass its health checks. Restoring the previous image.' >&2
docker tag "$previous_image" jokers-hunt-app:latest
docker compose up -d --no-build --no-deps app
exit 1
