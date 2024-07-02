# Prerequisites

Everytime that you plan on upgrading OpenMetadata to a newer version, make sure to go over all these steps:

### Backup your Metadata

Before upgrading your OpenMetadata version we strongly recommend backing up the metadata.

The source of truth is stored in the underlying database (MySQL and Postgres supported). During each version upgrade there
is a database migration process that needs to run. It will directly attack your database and update the shape of the
data to the newest OpenMetadata release.

It is important that we backup the data because if we face any unexpected issues during the upgrade process, 
you will be able to get back to the previous version without any loss.

{% note %}

You can learn more about how the migration process works [here](/deployment/upgrade/how-does-it-work).

**During the upgrade, please note that the backup is only for safety and should not be used to restore data to a higher version**.

{% /note %}

Since version 1.4.0, **OpenMetadata encourages using the builtin-tools for creating logical backups of the metadata**:

- [mysqldump](https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html) for MySQL
- [pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html) for Postgres

For PROD deployment we recommend users to rely on cloud services for their databases, be it [AWS RDS](https://docs.aws.amazon.com/rds/),
[Azure SQL](https://azure.microsoft.com/en-in/products/azure-sql/database) or [GCP Cloud SQL](https://cloud.google.com/sql/).

If you're a user of these services, you can leverage their backup capabilities directly:
- [Creating a DB snapshot in AWS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CreateSnapshot.html)
- [Backup and restore in Azure MySQL](https://learn.microsoft.com/en-us/azure/mysql/single-server/concepts-backup)
- [About GCP Cloud SQL backup](https://cloud.google.com/sql/docs/mysql/backup-recovery/backups)

You can refer to the following guide to get more details about the backup and restore:

{% inlineCalloutContainer %}
  {% inlineCallout
    color="violet-70"
    icon="luggage"
    bold="Backup Metadata"
    href="/deployment/backup-restore-metadata" %}
      Learn how to back up MySQL or Postgres data.
  {% /inlineCallout %}
{% /inlineCalloutContainer %}

### Update `sort_buffer_size` (MySQL) or `work_mem` (Postgres)

Before running the migrations, it is important to update these parameters to ensure there are no runtime errors.
A safe value would be setting them to 20MB.

**If using MySQL**

You can update it via SQL (note that it will reset after the server restarts):

```sql
SET GLOBAL sort_buffer_size = 20971520
```

To make the configuration persistent, you'd need to navigate to your MySQL Server install directory and update the
`my.ini` or `my.cnf` [files](https://dev.mysql.com/doc/refman/8.0/en/option-files.html) with `sort_buffer_size = 20971520`.

If using RDS, you will need to update your instance's [Parameter Group](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithParamGroups.html)
to include the above change.

**If using Postgres**

You can update it via SQL (not that it will reset after the server restarts):

```sql
SET work_mem = '20MB';
```

To make the configuration persistent, you'll need to update the `postgresql.conf` [file](https://www.postgresql.org/docs/9.3/config-setting.html)
with `work_mem = 20MB`.

If using RDS, you will need to update your instance's [Parameter Group](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithParamGroups.html)
to include the above change.

Note that this value would depend on the size of your `query_entity` table. If you still see `Out of Sort Memory Error`s
during the migration after bumping this value, you can increase them further.

After the migration is finished, you can revert this changes.

# New Versioning System for Ingestion Docker Image

We are excited to announce a recent change in our version tagging system for our Ingestion Docker images. This update aims to improve consistency and clarity in our versioning, aligning our Docker image tags with our Python PyPi package versions.

### Ingestion Docker Image Tags

To maintain consistency, our Docker images will now follow the same 4-digit versioning system as of Python Package versions. For example, a Docker image version might look like `1.0.0.0`.

Additionally, we will continue to provide a 3-digit version tag (e.g., `1.0.0`) that will always point to the latest corresponding 4-digit image tag. This ensures ease of use for those who prefer a simpler version tag while still having access to the most recent updates.

### Benefits

**Consistency**: Both Python applications and Docker images will have the same versioning format, making it easier to track and manage versions.
**Clarity**: The 4-digit system provides a clear and detailed versioning structure, helping users understand the nature and scope of changes.
**Non-Breaking Change**: This update is designed to be non-disruptive. Existing Ingestions and dependencies will remain unaffected.

#### Example

Here’s an example of how the new versioning works:

**Python Application Version**: `1.5.0.0`
**Docker Image Tags**:
- `1.5.0.0` (specific version)
- `1.5.0` (latest version in the 1.5.0.x series)

We believe this update will bring greater consistency and clarity to our versioning system. As always, we value your feedback and welcome any questions or comments you may have.

# Backward Incompatible Changes

## 1.4.0

### Tooling

- **Metadata Backup & Restore**: The Metadata Backup/Recovery has been deprecated, and no further support will be provided. Users are advised to use database-native tools to back up data and store it in their object store for recovery.
  You can check the [docs](/deployment/backup-restore-metadata) for more information.
- **Metadata Docker CLI**: For the past releases, we have been updating the documentation to point users to directly run the docker quickstart
  with the docker compose files in the release page ([docs](/quick-start/local-docker-deployment)). In this release, we're completely removing the support for `metadata docker`.
- **bootstrap_storage.sh**: We have deprecated `bootstrap/bootstrap_storage.sh` and replaced it with `bootstrap/openmetadata-ops.sh`. The documentation has been updated accordingly.


### UI

- **Activity Feed**: The Activity Feed has been improved with new, updated cards that display critical information such as data quality test case updates, descriptions, tag updates, or asset removal.
- **Lineage**: The Expand All button has been removed. A new Layers button is introduced in the bottom left corner. With the Layers button, you can add Column Level Lineage or Data Observability details to your Lineage view.
- **View Definition**: View Definition is now renamed to Schema Definition
- **Glossary**: Adding Glossary Term view has been improved. Now, we show glossary terms hierarchically, enabling a better understanding of how the terms are set up while labeling a table or dashboard.
- **Classifications**: users can set it to be mutually exclusive **only** at the time of creation. Once created, you cannot change it back to mutually non-exclusive or vice versa. 
    This is to prevent conflicts between adding multiple tags that belong to the same classification and later turning the mutually exclusive flag back to true.

### API

- **View Definition**: Table Schema's `ViewDefinition` is now renamed to `SchemaDefinition` to capture Tables' Create Schema.
- **Bulk Import**: Bulk Import API now creates entities if they are not present during the import.
- **Test Suites**: Table's `TestSuite` is migrated to an `EntityReference`. Previously it used to store entire payload of `TestSuite`.
