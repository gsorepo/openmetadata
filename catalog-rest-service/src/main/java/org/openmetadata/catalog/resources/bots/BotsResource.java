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

package org.openmetadata.catalog.resources.bots;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.google.inject.Inject;
import org.openmetadata.catalog.entity.Bots;
import org.openmetadata.catalog.jdbi3.BotsRepository;
import org.openmetadata.catalog.resources.Collection;
import org.openmetadata.catalog.security.SecurityUtil;
import org.openmetadata.catalog.util.RestUtil;
import org.openmetadata.catalog.util.ResultList;
import io.swagger.annotations.Api;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.openmetadata.catalog.security.CatalogAuthorizer;

import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.SecurityContext;
import javax.ws.rs.core.UriInfo;

import java.io.IOException;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Path("/v1/bots")
@Api(value = "Bots collection", tags = "Bots collection")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Collection(name = "bots", repositoryClass = "org.openmetadata.catalog.jdbi3.BotsRepository")
public class BotsResource {
  public static final String COLLECTION_PATH = "/v1/bots/";
  private final BotsRepository dao;
  private final CatalogAuthorizer authorizer;

  private static List<Bots> addHref(UriInfo uriInfo, List<Bots> bots) {
    Optional.ofNullable(bots).orElse(Collections.emptyList()).forEach(i -> addHref(uriInfo, i));
    return bots;
  }

  private static Bots addHref(UriInfo uriInfo, Bots bot) {
    bot.setHref(RestUtil.getHref(uriInfo, COLLECTION_PATH, bot.getId()));
    return bot;
  }

  @Inject
  public BotsResource(BotsRepository dao, CatalogAuthorizer authorizer) {
    Objects.requireNonNull(dao, "BotsRepository must not be null");
    this.dao = dao;
    this.authorizer = authorizer;
  }

  static class BotsList extends ResultList<Bots> {
    BotsList(List<Bots> data) {
      super(data);
    }
  }

  @GET
  @Operation(summary = "List bots", tags = "bots",
          description = "Get a list of bots.",
          responses = {
                  @ApiResponse(responseCode = "200", description = "List of bots",
                          content = @Content(mediaType = "application/json", schema = @Schema(implementation =
                                  BotsList.class)))
          })
  public BotsList list(@Context UriInfo uriInfo,
                       @Context SecurityContext securityContext,
                       @QueryParam("name") String name) throws IOException {
    List<Bots> list = addHref(uriInfo, dao.list(name));
    return new BotsList(list);
  }

  @GET
  @Path("/{id}")
  @Operation(summary = "Get a bot", tags = "bots",
          description = "Get a bot by `id`.",
          responses = {
                  @ApiResponse(responseCode = "200", description = "The bot",
                          content = @Content(mediaType = "application/json", schema = @Schema(implementation =
                                  Bots.class))),
                  @ApiResponse(responseCode = "404", description = "Bot for instance {id} is not found")
          })
  public Bots get(@Context UriInfo uriInfo,
                  @Context SecurityContext securityContext,
                  @PathParam("name") String name) throws IOException {
    return addHref(uriInfo, dao.findByName(name));
  }

  @POST
  @Operation(summary = "Create a bot", tags = "bots",
          description = "Create a new bot.",
          responses = {
                  @ApiResponse(responseCode = "200", description = "The bot ",
                          content = @Content(mediaType = "application/json", schema = @Schema(implementation =
                                  Bots.class))),
                  @ApiResponse(responseCode = "400", description = "Bad request")
          })
  public Response create(@Context UriInfo uriInfo,
                         @Context SecurityContext securityContext,
                         Bots bots) throws JsonProcessingException {
    SecurityUtil.checkAdminRole(authorizer, securityContext);
    bots.withId(UUID.randomUUID()).withUpdatedBy(securityContext.getUserPrincipal().getName())
            .withUpdatedAt(new Date());
    addHref(uriInfo, dao.insert(bots));
    return Response.created(bots.getHref()).entity(bots).build();
  }
}
