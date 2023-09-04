package org.openmetadata.service.migration.mysql.v112;

import static org.openmetadata.service.migration.utils.V112.MigrationUtil.fixExecutableTestSuiteFQN;
import static org.openmetadata.service.migration.utils.V112.MigrationUtil.lowerCaseUserNameAndEmail;

import lombok.SneakyThrows;
import org.jdbi.v3.core.Handle;
import org.openmetadata.service.jdbi3.CollectionDAO;
import org.openmetadata.service.migration.api.MigrationProcessImpl;
import org.openmetadata.service.migration.utils.MigrationFile;

public class Migration extends MigrationProcessImpl {
  private CollectionDAO collectionDAO;

  public Migration(MigrationFile migrationFile) {
    super(migrationFile);
  }

  @Override
  public void initialize(Handle handle) {
    super.initialize(handle);
    this.collectionDAO = handle.attach(CollectionDAO.class);
  }

  @Override
  @SneakyThrows
  public void runDataMigration() {
    // Run Data Migration to Remove the quoted Fqn`
    fixExecutableTestSuiteFQN(collectionDAO);
    // Run UserName Migration to make lowercase
    lowerCaseUserNameAndEmail(collectionDAO);
  }
}
