/*
 *  Licensed to the Apache Software Foundation (ASF) under one or more
 *  contributor license agreements. See the NOTICE file distributed with
 *  this work for additional information regarding copyright ownership.
 *  The ASF licenses this file to You under the Apache License, Version 2.0
 *  (the "License"); you may not use this file except in compliance with
 *  the License. You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.openmetadata.catalog.jdbi3;

import org.jdbi.v3.sqlobject.transaction.Transaction;
import org.openmetadata.catalog.api.lineage.AddLineage;
import org.openmetadata.catalog.type.Edge;
import org.openmetadata.catalog.type.EntityLineage;
import org.openmetadata.catalog.type.EntityReference;
import org.openmetadata.catalog.util.EntityUtil;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.openmetadata.catalog.util.EntityUtil.getEntityReference;

public class LineageRepository {
  private final CollectionDAO dao;

  public LineageRepository(CollectionDAO dao) { this.dao = dao; }

  @Transaction
  public EntityLineage get(String entityType, String id, int upstreamDepth, int downstreamDepth) throws IOException {
    EntityReference ref = getEntityReference(entityType, UUID.fromString(id), dao);
    return getLineage(ref, upstreamDepth, downstreamDepth);
  }

  @Transaction
  public EntityLineage getByName(String entityType, String fqn, int upstreamDepth, int downstreamDepth)
          throws IOException {
    EntityReference ref = EntityUtil.getEntityReferenceByName(entityType, fqn, dao);
    return getLineage(ref, upstreamDepth, downstreamDepth);
  }

  @Transaction
  public void addLineage(AddLineage addLineage) throws IOException {
    // Validate from entity
    EntityReference from = addLineage.getEdge().getFromEntity();
    from = EntityUtil.getEntityReference(from.getType(), from.getId(), dao);

    // Validate to entity
    EntityReference to = addLineage.getEdge().getToEntity();
    to = EntityUtil.getEntityReference(to.getType(), to.getId(), dao);

    // Finally, add lineage relationship
    dao.relationshipDAO().insert(from.getId().toString(), to.getId().toString(), from.getType(), to.getType(),
            Relationship.UPSTREAM.ordinal());
  }

  private EntityLineage getLineage(EntityReference primary, int upstreamDepth, int downstreamDepth) throws IOException {
    List<EntityReference> entities = new ArrayList<>();
    EntityLineage lineage = new EntityLineage().withEntity(primary).withNodes(entities)
            .withUpstreamEdges(new ArrayList<>()).withDownstreamEdges(new ArrayList<>());
    addUpstreamLineage(primary.getId(), lineage, upstreamDepth);
    addDownstreamLineage(primary.getId(), lineage, downstreamDepth);

    // Remove duplicate nodes
    lineage.withNodes(lineage.getNodes().stream().distinct().collect(Collectors.toList()));

    // Add entityReference details
    for (int i = 0; i < lineage.getNodes().size(); i++) {
      EntityReference ref = lineage.getNodes().get(i);
      ref = getEntityReference(ref.getType(), ref.getId(), dao);
      lineage.getNodes().set(i, ref);
    }
    return lineage;
  }

  private void addUpstreamLineage(UUID id, EntityLineage lineage, int upstreamDepth) {
    if (upstreamDepth == 0) {
      return;
    }
    // from this id ---> find other ids
    List<EntityReference> upstreamEntities = dao.relationshipDAO().findFrom(id.toString(),
            Relationship.UPSTREAM.ordinal());
    lineage.getNodes().addAll(upstreamEntities);

    upstreamDepth--;
    for (EntityReference upstreamEntity : upstreamEntities) {
      lineage.getUpstreamEdges().add(new Edge().withFromEntity(upstreamEntity.getId()).withToEntity(id));
      addUpstreamLineage(upstreamEntity.getId(), lineage, upstreamDepth); // Recursively add upstream nodes and edges
    }
  }

  private void addDownstreamLineage(UUID id, EntityLineage lineage, int downstreamDepth) {
    if (downstreamDepth == 0) {
      return;
    }
    // from other ids ---> to this id
    List<EntityReference> downStreamEntities = dao.relationshipDAO().findTo(id.toString(),
            Relationship.UPSTREAM.ordinal());
    lineage.getNodes().addAll(downStreamEntities);

    downstreamDepth--;
    for (EntityReference entity : downStreamEntities) {
      lineage.getDownstreamEdges().add(new Edge().withToEntity(entity.getId()).withFromEntity(id));
      addDownstreamLineage(entity.getId(), lineage, downstreamDepth);
    }
  }
}
