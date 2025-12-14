# Workflow Admin Tooling
Moderation tooling for Slack workflows.

## PostgreSQL setup
```sql
CREATE TYPE actions as ENUM (
    'allow-wrt',
    'deny-wrt',
    'add-collaborator-wrt',
    'publish',
    'unpublish',
    'delete',
    'flag'
);

CREATE TABLE IF NOT EXISTS workflows(
    id text PRIMARY KEY NOT NULL,
    latest_approved_revision text
);

CREATE TABLE IF NOT EXISTS review_queue(
    workflow_id text REFERENCES workflows(id),
    collaborators text NOT NULL
);

CREATE TABLE IF NOT EXISTS audit(
    workflow_id text REFERENCES workflows(id),
    actor text NOT NULL,
    action actions NOT NULL,
    reason text NOT NULL,
    created_at timestamptz default NOW()
);
```

## License
This repository is licensed under the GNU Affero General Public License v3.0 License. A copy of the license can be viewed at [LICENSE](/LICENSE).