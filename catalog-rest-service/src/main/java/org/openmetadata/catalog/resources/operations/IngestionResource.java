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

package org.openmetadata.catalog.resources.operations;

import io.swagger.annotations.Api;
import io.swagger.v3.oas.annotations.ExternalDocumentation;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.security.GeneralSecurityException;
import java.text.ParseException;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import javax.json.JsonPatch;
import javax.validation.Valid;
import javax.validation.constraints.Max;
import javax.validation.constraints.Min;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.PATCH;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.SecurityContext;
import javax.ws.rs.core.UriInfo;
import lombok.extern.slf4j.Slf4j;
import org.openmetadata.catalog.CatalogApplicationConfig;
import org.openmetadata.catalog.Entity;
import org.openmetadata.catalog.api.operations.workflows.CreateIngestion;
import org.openmetadata.catalog.ingestion.AirflowRESTClient;
import org.openmetadata.catalog.jdbi3.CollectionDAO;
import org.openmetadata.catalog.jdbi3.IngestionRepository;
import org.openmetadata.catalog.operations.workflows.Ingestion;
import org.openmetadata.catalog.resources.Collection;
import org.openmetadata.catalog.security.Authorizer;
import org.openmetadata.catalog.security.SecurityUtil;
import org.openmetadata.catalog.type.EntityHistory;
import org.openmetadata.catalog.type.EntityReference;
import org.openmetadata.catalog.type.Include;
import org.openmetadata.catalog.util.EntityUtil.Fields;
import org.openmetadata.catalog.util.RestUtil;
import org.openmetadata.catalog.util.RestUtil.PatchResponse;
import org.openmetadata.catalog.util.RestUtil.PutResponse;
import org.openmetadata.catalog.util.ResultList;

@Slf4j
@Path("operations/v1/ingestion")
@Api(value = "Ingestion collection", tags = "Ingestion collection")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Collection(name = "ingestion")
public class IngestionResource {
  public static final String COLLECTION_PATH = "operations/v1/ingestion/";
  private final IngestionRepository dao;
  private final Authorizer authorizer;
  private AirflowRESTClient airflowRESTClient;
  private CatalogApplicationConfig config;

  public static void addHref(UriInfo uriInfo, EntityReference ref) {
    ref.withHref(RestUtil.getHref(uriInfo, COLLECTION_PATH, ref.getId()));
  }

  public static ResultList<Ingestion> addHref(UriInfo uriInfo, ResultList<Ingestion> ingestions) {
    Optional.ofNullable(ingestions.getData()).orElse(Collections.emptyList()).forEach(i -> addHref(uriInfo, i));
    return ingestions;
  }

  public static Ingestion addHref(UriInfo uriInfo, Ingestion ingestion) {
    Entity.withHref(uriInfo, ingestion.getOwner());
    Entity.withHref(uriInfo, ingestion.getService());
    return ingestion;
  }

  public IngestionResource(CollectionDAO dao, Authorizer authorizer) {
    Objects.requireNonNull(dao, "IngestionRepository must not be null");
    this.dao = new IngestionRepository(dao);
    this.authorizer = authorizer;
  }

  public void initialize(CatalogApplicationConfig config) {
    this.airflowRESTClient = new AirflowRESTClient(config);
    this.config = config;
  }

  public static class IngestionList extends ResultList<Ingestion> {
    @SuppressWarnings("unused")
    IngestionList() {
      // Empty constructor needed for deserialization
    }

    public IngestionList(List<Ingestion> data, String beforeCursor, String afterCursor, int total)
        throws GeneralSecurityException, UnsupportedEncodingException {
      super(data, beforeCursor, afterCursor, total);
    }
  }

  static final String FIELDS = "owner,tags,status,scheduleInterval";
  public static final List<String> FIELD_LIST = Arrays.asList(FIELDS.replace(" ", "").split(","));

  @GET
  @Valid
  @Operation(
      summary = "List Ingestion Workflows",
      tags = "ingestion",
      description =
          "Get a list of ingestion workflows. Use `fields` parameter to get only necessary fields. "
              + " Use cursor-based pagination to limit the number "
              + "entries in the list using `limit` and `before` or `after` query params.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "List of ingestion workflows",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = IngestionList.class)))
      })
  public ResultList<Ingestion> list(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(
              description = "Fields requested in the returned resource",
              schema = @Schema(type = "string", example = FIELDS))
          @QueryParam("fields")
          String fieldsParam,
      @Parameter(description = "Limit the number ingestion returned. (1 to 1000000, " + "default = 10)")
          @DefaultValue("10")
          @Min(1)
          @Max(1000000)
          @QueryParam("limit")
          int limitParam,
      @Parameter(description = "Returns list of ingestion before this cursor", schema = @Schema(type = "string"))
          @QueryParam("before")
          String before,
      @Parameter(description = "Returns list of ingestion after this cursor", schema = @Schema(type = "string"))
          @QueryParam("after")
          String after,
      @Parameter(
              description = "Include all, deleted, or non-deleted entities.",
              schema = @Schema(implementation = Include.class))
          @QueryParam("include")
          @DefaultValue("non-deleted")
          Include include)
      throws IOException, GeneralSecurityException, ParseException {
    RestUtil.validateCursors(before, after);
    Fields fields = new Fields(FIELD_LIST, fieldsParam);

    ResultList<Ingestion> ingestions;
    if (before != null) { // Reverse paging
      ingestions = dao.listBefore(uriInfo, fields, null, limitParam, before, include); // Ask for one extra entry
    } else { // Forward paging or first page
      ingestions = dao.listAfter(uriInfo, fields, null, limitParam, after, include);
    }
    if (fieldsParam != null && fieldsParam.contains("status")) {
      addStatus(ingestions.getData());
    }
    return addHref(uriInfo, ingestions);
  }

  @GET
  @Path("/{id}/versions")
  @Operation(
      summary = "List ingestion workflow versions",
      tags = "ingestion",
      description = "Get a list of all the versions of a ingestion identified by `id`",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "List of ingestion versions",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = EntityHistory.class)))
      })
  public EntityHistory listVersions(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "ingestion Id", schema = @Schema(type = "string")) @PathParam("id") String id)
      throws IOException, ParseException {
    return dao.listVersions(id);
  }

  @GET
  @Path("/{id}")
  @Operation(
      summary = "Get a ingestion workflow",
      tags = "ingestion",
      description = "Get a ingestion workflow by `id`.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "The ingestion",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Ingestion.class))),
        @ApiResponse(responseCode = "404", description = "ingestion for instance {id} is not found")
      })
  public Ingestion get(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @PathParam("id") String id,
      @Parameter(
              description = "Fields requested in the returned resource",
              schema = @Schema(type = "string", example = FIELDS))
          @QueryParam("fields")
          String fieldsParam,
      @Parameter(
              description = "Include all, deleted, or non-deleted entities.",
              schema = @Schema(implementation = Include.class))
          @QueryParam("include")
          @DefaultValue("non-deleted")
          Include include)
      throws IOException, ParseException {
    Fields fields = new Fields(FIELD_LIST, fieldsParam);
    Ingestion ingestion = dao.get(uriInfo, id, fields, include);
    if (fieldsParam != null && fieldsParam.contains("status")) {
      ingestion = addStatus(ingestion);
    }
    return addHref(uriInfo, ingestion);
  }

  @GET
  @Path("/{id}/versions/{version}")
  @Operation(
      summary = "Get a version of the ingestion",
      tags = "ingestion",
      description = "Get a version of the ingestion by given `id`",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "ingestion",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Ingestion.class))),
        @ApiResponse(
            responseCode = "404",
            description = "Ingestion for instance {id} and version  " + "{version} is not found")
      })
  public Ingestion getVersion(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "Ingestion Id", schema = @Schema(type = "string")) @PathParam("id") String id,
      @Parameter(
              description = "Ingestion version number in the form `major`.`minor`",
              schema = @Schema(type = "string", example = "0.1 or 1.1"))
          @PathParam("version")
          String version)
      throws IOException, ParseException {
    return dao.getVersion(id, version);
  }

  @GET
  @Path("/name/{fqn}")
  @Operation(
      summary = "Get a ingestion by name",
      tags = "ingestion",
      description = "Get a ingestion by fully qualified name.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "The ingestion",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Ingestion.class))),
        @ApiResponse(responseCode = "404", description = "Ingestion for instance {id} is not found")
      })
  public Ingestion getByName(
      @Context UriInfo uriInfo,
      @PathParam("fqn") String fqn,
      @Context SecurityContext securityContext,
      @Parameter(
              description = "Fields requested in the returned resource",
              schema = @Schema(type = "string", example = FIELDS))
          @QueryParam("fields")
          String fieldsParam,
      @Parameter(
              description = "Include all, deleted, or non-deleted entities.",
              schema = @Schema(implementation = Include.class))
          @QueryParam("include")
          @DefaultValue("non-deleted")
          Include include)
      throws IOException, ParseException {
    Fields fields = new Fields(FIELD_LIST, fieldsParam);
    Ingestion ingestion = dao.getByName(uriInfo, fqn, fields, include);
    if (fieldsParam != null && fieldsParam.contains("status")) {
      ingestion = addStatus(ingestion);
    }
    return addHref(uriInfo, ingestion);
  }

  @POST
  @Operation(
      summary = "Create a Ingestion",
      tags = "ingestion",
      description = "Create a new Ingestion.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "The ingestion",
            content =
                @Content(mediaType = "application/json", schema = @Schema(implementation = CreateIngestion.class))),
        @ApiResponse(responseCode = "400", description = "Bad request")
      })
  public Response create(
      @Context UriInfo uriInfo, @Context SecurityContext securityContext, @Valid CreateIngestion create)
      throws IOException, ParseException {
    SecurityUtil.checkAdminOrBotRole(authorizer, securityContext);
    Ingestion ingestion = getIngestion(securityContext, create);
    deploy(ingestion);
    // write to db only when the deployment is successful
    ingestion = addHref(uriInfo, dao.create(uriInfo, ingestion));
    return Response.created(ingestion.getHref()).entity(ingestion).build();
  }

  @PATCH
  @Path("/{id}")
  @Operation(
      summary = "Update a ingestion",
      tags = "ingestion",
      description = "Update an existing ingestion using JsonPatch.",
      externalDocs = @ExternalDocumentation(description = "JsonPatch RFC", url = "https://tools.ietf.org/html/rfc6902"))
  @Consumes(MediaType.APPLICATION_JSON_PATCH_JSON)
  public Response updateDescription(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @PathParam("id") String id,
      @RequestBody(
              description = "JsonPatch with array of operations",
              content =
                  @Content(
                      mediaType = MediaType.APPLICATION_JSON_PATCH_JSON,
                      examples = {
                        @ExampleObject("[" + "{op:remove, path:/a}," + "{op:add, path: /b, value: val}" + "]")
                      }))
          JsonPatch patch)
      throws IOException, ParseException {
    Fields fields = new Fields(FIELD_LIST, FIELDS);
    Ingestion ingestion = dao.get(uriInfo, id, fields);
    SecurityUtil.checkAdminRoleOrPermissions(
        authorizer, securityContext, dao.getEntityInterface(ingestion).getEntityReference(), patch);

    PatchResponse<Ingestion> response =
        dao.patch(uriInfo, UUID.fromString(id), securityContext.getUserPrincipal().getName(), patch);
    addHref(uriInfo, response.getEntity());
    return response.toResponse();
  }

  @PUT
  @Operation(
      summary = "Create or update a ingestion",
      tags = "ingestion",
      description = "Create a new ingestion, if it does not exist or update an existing ingestion.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "The ingestion",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Ingestion.class))),
        @ApiResponse(responseCode = "400", description = "Bad request")
      })
  public Response createOrUpdate(
      @Context UriInfo uriInfo, @Context SecurityContext securityContext, @Valid CreateIngestion create)
      throws IOException, ParseException {
    Ingestion ingestion = getIngestion(securityContext, create);
    deploy(ingestion);
    // write to db only when the deployment is successful
    PutResponse<Ingestion> response = dao.createOrUpdate(uriInfo, ingestion);
    addHref(uriInfo, response.getEntity());
    return response.toResponse();
  }

  @POST
  @Path("/trigger/{id}")
  @Operation(
      summary = "Trigger a ingestion workflow run",
      tags = "ingestion",
      description = "Trigger a ingestion workflow run by ingestion name.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "The ingestion",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Ingestion.class))),
        @ApiResponse(responseCode = "404", description = "Ingestion for instance {name} is not found")
      })
  public Ingestion triggerIngestion(
      @Context UriInfo uriInfo, @PathParam("id") String id, @Context SecurityContext securityContext)
      throws IOException, ParseException {
    Fields fields = new Fields(FIELD_LIST, "owner");
    Ingestion ingestion = dao.get(uriInfo, id, fields);
    airflowRESTClient.runPipeline(ingestion.getName());
    return addHref(uriInfo, dao.get(uriInfo, id, fields));
  }

  @DELETE
  @Path("/{id}")
  @Operation(
      summary = "Delete a Ingestion",
      tags = "ingestion",
      description = "Delete a ingestion by `id`.",
      responses = {
        @ApiResponse(responseCode = "200", description = "OK"),
        @ApiResponse(responseCode = "404", description = "ingestion for instance {id} is not found")
      })
  public Response delete(@Context UriInfo uriInfo, @PathParam("id") String id) throws IOException {
    dao.delete(UUID.fromString(id), false);
    return Response.ok().build();
  }

  private Ingestion getIngestion(SecurityContext securityContext, CreateIngestion create) {
    return new Ingestion()
        .withId(UUID.randomUUID())
        .withName(create.getName())
        .withDisplayName(create.getDisplayName())
        .withDescription(create.getDescription())
        .withIngestionType(create.getIngestionType())
        .withForceDeploy(create.getForceDeploy())
        .withConcurrency(create.getConcurrency())
        .withPauseWorkflow(create.getPauseWorkflow())
        .withStartDate(create.getStartDate())
        .withEndDate(create.getEndDate())
        .withRetries(create.getRetries())
        .withRetryDelay(create.getRetryDelay())
        .withConnectorConfig(create.getConnectorConfig())
        .withWorkflowCatchup(create.getWorkflowCatchup())
        .withScheduleInterval(create.getScheduleInterval())
        .withTags(create.getTags())
        .withOwner(create.getOwner())
        .withService(create.getService())
        .withUpdatedBy(securityContext.getUserPrincipal().getName())
        .withUpdatedAt(System.currentTimeMillis());
  }

  private void deploy(Ingestion ingestion) {
    if (Boolean.TRUE.equals(ingestion.getForceDeploy())) {
      airflowRESTClient.deploy(ingestion, config);
    }
  }

  public void addStatus(List<Ingestion> ingestions) {
    Optional.ofNullable(ingestions).orElse(Collections.emptyList()).forEach(this::addStatus);
  }

  private Ingestion addStatus(Ingestion ingestion) {
    try {
      ingestion = airflowRESTClient.getStatus(ingestion);
    } catch (Exception e) {
      LOG.error("Failed to fetch status for {}", ingestion.getName());
    }
    return ingestion;
  }
}
