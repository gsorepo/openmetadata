package org.openmetadata.service.jdbi3;

import static org.openmetadata.service.resources.EntityResource.searchRepository;

import org.openmetadata.schema.entity.services.ServiceType;
import org.openmetadata.schema.entity.services.StorageService;
import org.openmetadata.schema.type.StorageConnection;
import org.openmetadata.service.Entity;
import org.openmetadata.service.resources.services.storage.StorageServiceResource;
import org.openmetadata.service.util.JsonUtils;
import org.openmetadata.service.util.RestUtil;

public class StorageServiceRepository extends ServiceEntityRepository<StorageService, StorageConnection> {
  public StorageServiceRepository(CollectionDAO dao) {
    super(
        StorageServiceResource.COLLECTION_PATH,
        Entity.STORAGE_SERVICE,
        dao,
        dao.storageServiceDAO(),
        StorageConnection.class,
        ServiceType.STORAGE);
    supportsSearch = true;
  }

  @Override
  public void deleteFromSearch(StorageService entity, String changeType) {
    if (supportsSearch) {
      if (changeType.equals(RestUtil.ENTITY_SOFT_DELETED) || changeType.equals(RestUtil.ENTITY_RESTORED)) {
        searchRepository.softDeleteOrRestoreEntityFromSearch(
            JsonUtils.deepCopy(entity, StorageService.class),
            changeType.equals(RestUtil.ENTITY_SOFT_DELETED),
            "service.id");
      } else {
        searchRepository.updateSearchEntityDeleted(JsonUtils.deepCopy(entity, StorageService.class), "", "service.id");
      }
    }
  }
}
