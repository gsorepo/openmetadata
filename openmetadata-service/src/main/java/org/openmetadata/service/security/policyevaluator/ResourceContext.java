package org.openmetadata.service.security.policyevaluator;

import java.util.Collections;
import java.util.List;
import java.util.UUID;
import lombok.Builder;
import lombok.Getter;
import lombok.NonNull;
import org.openmetadata.schema.EntityInterface;
import org.openmetadata.schema.type.EntityReference;
import org.openmetadata.schema.type.Include;
import org.openmetadata.schema.type.TagLabel;
import org.openmetadata.service.Entity;
import org.openmetadata.service.jdbi3.EntityRepository;
import org.openmetadata.service.util.EntityUtil;

/**
 * Builds ResourceContext lazily. ResourceContext includes all the attributes of a resource a user is trying to access
 * to be used for evaluating Access Control policies.
 *
 * <p>As multiple threads don't access this, the class is not thread-safe by design.
 */
@Builder
public class ResourceContext implements ResourceContextInterface {
  @NonNull @Getter private String resource;
  @NonNull private EntityRepository<? extends EntityInterface> entityRepository;
  private UUID id;
  private String name;
  private EntityInterface entity; // Will be lazily initialized

  // Builder class added for getting around javadoc errors. This class will be filled in by lombok.
  public static class ResourceContextBuilder {}

  @Override
  public EntityReference getOwner() {
    resolveEntity();
    if (entity == null) {
      return null;
    } else if (Entity.USER.equals(entityRepository.getEntityType())) {
      return entity.getEntityReference(); // Owner for a user is same as the user
    }
    return entity.getOwner();
  }

  @Override
  public List<TagLabel> getTags() {
    resolveEntity();
    return entity == null ? Collections.emptyList() : Entity.getEntityTags(getResource(), entity);
  }

  @Override
  public EntityInterface getEntity() {
    return resolveEntity();
  }

  private EntityInterface resolveEntity() {
    if (entity == null) {
      String fields = "";
      if (entityRepository.isSupportsOwner()) {
        fields = EntityUtil.addField(fields, Entity.FIELD_OWNER);
      }
      if (entityRepository.isSupportsTags()) {
        fields = EntityUtil.addField(fields, Entity.FIELD_TAGS);
      }
      if (entityRepository.isSupportsDomain()) {
        fields = EntityUtil.addField(fields, Entity.FIELD_DOMAIN);
      }
      if (id != null) {
        entity = entityRepository.findOrNull(id, fields, Include.NON_DELETED);
      } else if (name != null) {
        entity = entityRepository.findByNameOrNull(name, fields, Include.NON_DELETED);
      }
    }
    return entity;
  }
}
