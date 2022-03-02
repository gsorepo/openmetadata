/*
 *  Copyright 2021 Collate
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.openmetadata.catalog.jdbi3;

import static org.openmetadata.catalog.Entity.helper;
import static org.openmetadata.catalog.util.EntityUtil.toBoolean;

import com.fasterxml.jackson.core.JsonProcessingException;
import java.io.IOException;
import java.text.ParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import javax.json.JsonPatch;
import javax.ws.rs.core.Response.Status;
import javax.ws.rs.core.UriInfo;
import org.apache.commons.lang3.StringUtils;
import org.jdbi.v3.sqlobject.transaction.Transaction;
import org.openmetadata.catalog.Entity;
import org.openmetadata.catalog.api.feed.EntityLinkThreadCount;
import org.openmetadata.catalog.api.feed.ThreadCount;
import org.openmetadata.catalog.entity.feed.Thread;
import org.openmetadata.catalog.resources.feeds.FeedResource;
import org.openmetadata.catalog.resources.feeds.FeedUtil;
import org.openmetadata.catalog.resources.feeds.MessageParser;
import org.openmetadata.catalog.resources.feeds.MessageParser.EntityLink;
import org.openmetadata.catalog.type.EntityReference;
import org.openmetadata.catalog.type.Include;
import org.openmetadata.catalog.type.Post;
import org.openmetadata.catalog.type.Relationship;
import org.openmetadata.catalog.util.EntityUtil;
import org.openmetadata.catalog.util.JsonUtils;
import org.openmetadata.catalog.util.RestUtil;
import org.openmetadata.catalog.util.RestUtil.PatchResponse;

public class FeedRepository {
  private final CollectionDAO dao;

  public FeedRepository(CollectionDAO dao) {
    this.dao = dao;
  }

  @Transaction
  public Thread create(Thread thread) throws IOException, ParseException {
    String createdBy = thread.getCreatedBy();

    // Validate user creating thread
    dao.userDAO().findEntityByName(createdBy);

    // Validate about data entity is valid
    EntityLink about = EntityLink.parse(thread.getAbout());
    EntityReference aboutRef = EntityUtil.validateEntityLink(about);

    // Get owner for the addressed to Entity
    EntityReference owner = helper(aboutRef).getOwnerOrNull();

    // Insert a new thread
    dao.feedDAO().insert(JsonUtils.pojoToJson(thread));

    // Add relationship User -- created --> Thread relationship
    dao.relationshipDAO()
        .insert(createdBy, thread.getId().toString(), Entity.USER, Entity.THREAD, Relationship.CREATED.ordinal());

    // Add field relationship data asset Thread -- isAbout ---> entity/entityField
    // relationship
    dao.fieldRelationshipDAO()
        .insert(
            thread.getId().toString(), // from FQN
            about.getFullyQualifiedFieldValue(), // to FQN
            Entity.THREAD, // From type
            about.getFullyQualifiedFieldType(), // to Type
            Relationship.IS_ABOUT.ordinal());

    // Add the owner also as addressedTo as the entity he owns when addressed, the owner is actually being addressed
    if (owner != null) {
      dao.relationshipDAO()
          .insert(
              thread.getId().toString(),
              owner.getId().toString(),
              Entity.THREAD,
              owner.getType(),
              Relationship.ADDRESSED_TO.ordinal());
    }

    // Create relationship for users, teams, and other entities that are mentioned in the post
    // Multiple mentions of the same entity is handled by taking distinct mentions
    List<EntityLink> mentions = MessageParser.getEntityLinks(thread.getMessage());

    mentions.stream()
        .distinct()
        .forEach(
            mention ->
                dao.fieldRelationshipDAO()
                    .insert(
                        mention.getFullyQualifiedFieldValue(),
                        thread.getId().toString(),
                        mention.getFullyQualifiedFieldType(),
                        Entity.THREAD,
                        Relationship.MENTIONED_IN.ordinal()));

    return thread;
  }

  public Thread get(String id) throws IOException {
    return EntityUtil.validate(id, dao.feedDAO().findById(id), Thread.class);
  }

  @Transaction
  public Thread addPostToThread(String id, Post post) throws IOException {
    // Query 1 - validate the user posting the message
    String fromUser = post.getFrom();
    dao.userDAO().findEntityByName(fromUser);

    // Query 2 - Find the thread
    Thread thread = EntityUtil.validate(id, dao.feedDAO().findById(id), Thread.class);
    FeedUtil.addPost(thread, post);

    // TODO is rewriting entire json okay?
    // Query 3 - update the JSON document for the feed
    dao.feedDAO().update(id, JsonUtils.pojoToJson(thread));

    // Query 4 - Add relation User -- repliedTo --> Thread
    // Add relationship from thread to the user entity that is posting a reply
    boolean relationAlreadyExists = false;
    for (Post p : thread.getPosts()) {
      if (p.getFrom().equals(post.getFrom())) {
        relationAlreadyExists = true;
        break;
      }
    }
    if (!relationAlreadyExists) {
      dao.relationshipDAO()
          .insert(
              post.getFrom(), thread.getId().toString(), Entity.USER, Entity.THREAD, Relationship.REPLIED_TO.ordinal());
    }
    return thread;
  }

  @Transaction
  public ThreadCount getThreadsCount(String link, boolean isResolved) throws IOException {
    ThreadCount threadCount = new ThreadCount();
    List<List<String>> result;
    List<EntityLinkThreadCount> entityLinkThreadCounts = new ArrayList<>();
    AtomicInteger totalCount = new AtomicInteger(0);
    if (link == null) {
      // Get thread count of all entities
      result =
          dao.feedDAO()
              .listCountByEntityLink(
                  StringUtils.EMPTY, Entity.THREAD, StringUtils.EMPTY, Relationship.IS_ABOUT.ordinal(), isResolved);
    } else {
      EntityLink entityLink = EntityLink.parse(link);
      EntityReference reference = EntityUtil.validateEntityLink(entityLink);
      if (reference.getType().equals(Entity.USER)) {
        List<String> threadIds = new ArrayList<>(getUserThreadIds(reference));
        result = dao.feedDAO().listCountByThreads(threadIds, isResolved);
      } else {
        result =
            dao.feedDAO()
                .listCountByEntityLink(
                    entityLink.getFullyQualifiedFieldValue(),
                    Entity.THREAD,
                    entityLink.getFullyQualifiedFieldType(),
                    Relationship.IS_ABOUT.ordinal(),
                    isResolved);
      }
    }
    result.forEach(
        l -> {
          int count = Integer.parseInt(l.get(1));
          entityLinkThreadCounts.add(new EntityLinkThreadCount().withEntityLink(l.get(0)).withCount(count));
          totalCount.addAndGet(count);
        });
    threadCount.withTotalCount(totalCount.get());
    threadCount.withCounts(entityLinkThreadCounts);
    return threadCount;
  }

  public List<Post> listPosts(String threadId) throws IOException {
    Thread thread = get(threadId);
    return thread.getPosts();
  }

  @Transaction
  public List<Thread> listThreads(String link, int limitPosts) throws IOException {
    List<Thread> threads = new ArrayList<>();
    if (link == null) {
      // Not listing thread by data asset or user
      threads = JsonUtils.readObjects(dao.feedDAO().list(), Thread.class);
    } else {
      EntityLink entityLink = EntityLink.parse(link);
      EntityReference reference = EntityUtil.validateEntityLink(entityLink);
      List<String> threadIds = new ArrayList<>();
      List<List<String>> result;

      // TODO remove hardcoding of thread
      // For a user entityLink get created or replied relationships to the thread
      if (reference.getType().equals(Entity.USER)) {
        threadIds.addAll(getUserThreadIds(reference));
      } else {
        // Only data assets are added as about
        result =
            dao.fieldRelationshipDAO()
                .listFromByAllPrefix(
                    entityLink.getFullyQualifiedFieldValue(),
                    Entity.THREAD,
                    entityLink.getFullyQualifiedFieldType(),
                    Relationship.IS_ABOUT.ordinal());
        result.forEach(l -> threadIds.add(l.get(1)));
      }

      Set<String> uniqueValues = new HashSet<>();
      for (String t : threadIds) {
        // If an entity has multiple relationships (created, mentioned, repliedTo etc.) to the same thread
        // Don't send duplicated copies of the thread in response
        if (uniqueValues.add(t)) {
          threads.add(EntityUtil.validate(t, dao.feedDAO().findById(t), Thread.class));
        }
      }
      // sort the list by thread updated timestamp before returning
      threads.sort(Comparator.comparing(Thread::getUpdatedAt, Comparator.reverseOrder()));
    }
    return limitPostsInThreads(threads, limitPosts);
  }

  @Transaction
  public final PatchResponse<Thread> patch(UriInfo uriInfo, UUID id, String user, JsonPatch patch)
      throws IOException, ParseException {
    // Get all the fields in the original thread that can be updated during PATCH operation
    Thread original = get(id.toString());

    // Apply JSON patch to the original thread to get the updated thread
    Thread updated = JsonUtils.applyPatch(original, patch, Thread.class);
    // update the "updatedBy" and "updatedAt" fields
    updated.withUpdatedAt(System.currentTimeMillis()).withUpdatedBy(user);

    restorePatchAttributes(original, updated);

    // Update the attributes
    String change = patchUpdate(original, updated) ? RestUtil.ENTITY_UPDATED : RestUtil.ENTITY_NO_CHANGE;
    Thread updatedHref = FeedResource.addHref(uriInfo, updated);
    return new PatchResponse<>(Status.OK, updatedHref, change);
  }

  private void restorePatchAttributes(Thread original, Thread updated) {
    // Patch can't make changes to following fields. Ignore the changes
    updated.withId(original.getId()).withAbout(original.getAbout());
  }

  private boolean patchUpdate(Thread original, Thread updated) throws JsonProcessingException {
    updated.setId(original.getId());

    // store the updated thread
    // if there is no change, there is no need to apply patch
    if (fieldsChanged(original, updated)) {
      dao.feedDAO().update(updated.getId().toString(), JsonUtils.pojoToJson(updated));
      return true;
    }
    return false;
  }

  private boolean fieldsChanged(Thread original, Thread updated) {
    // Patch supports only isResolved and message for now
    return original.getResolved() != updated.getResolved() || !original.getMessage().equals(updated.getMessage());
  }

  private List<Thread> limitPostsInThreads(List<Thread> threads, int limitPosts) {
    for (Thread t : threads) {
      List<Post> posts = t.getPosts();
      if (posts.size() > limitPosts) {
        // Only keep the last "n" number of posts
        posts.sort(Comparator.comparing(Post::getPostTs));
        posts = posts.subList(posts.size() - limitPosts, posts.size());
        t.withPosts(posts);
      }
    }
    return threads;
  }

  private List<String> getUserThreadIds(EntityReference user) {
    List<String> threadIds = new ArrayList<>();
    // TODO: Add user mentioned threads as well
    threadIds.addAll(
        dao.relationshipDAO()
            .findTo(
                user.getName(),
                user.getType(),
                Relationship.CREATED.ordinal(),
                Entity.THREAD,
                toBoolean(Include.NON_DELETED)));
    threadIds.addAll(
        dao.relationshipDAO()
            .findTo(
                user.getName(),
                user.getType(),
                Relationship.REPLIED_TO.ordinal(),
                Entity.THREAD,
                toBoolean(Include.NON_DELETED)));
    return threadIds;
  }
}
