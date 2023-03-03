package org.openmetadata.service.resources.query;

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
import java.util.ArrayList;
import java.util.List;
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
import org.openmetadata.schema.api.data.CreateQuery;
import org.openmetadata.schema.api.data.RestoreEntity;
import org.openmetadata.schema.entity.data.Query;
import org.openmetadata.schema.type.EntityHistory;
import org.openmetadata.schema.type.EntityReference;
import org.openmetadata.schema.type.Include;
import org.openmetadata.schema.type.MetadataOperation;
import org.openmetadata.service.Entity;
import org.openmetadata.service.jdbi3.CollectionDAO;
import org.openmetadata.service.jdbi3.ListFilter;
import org.openmetadata.service.jdbi3.QueryRepository;
import org.openmetadata.service.resources.Collection;
import org.openmetadata.service.resources.EntityResource;
import org.openmetadata.service.security.Authorizer;
import org.openmetadata.service.security.policyevaluator.OperationContext;
import org.openmetadata.service.util.ResultList;

@Path("/v1/query")
@Api(value = "Query collection", tags = "query collection")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Collection(name = "query")
public class QueryResource extends EntityResource<Query, QueryRepository> {

  public static final String COLLECTION_PATH = "v1/query/";

  public QueryResource(CollectionDAO dao, Authorizer authorizer) {
    super(Query.class, new QueryRepository(dao), authorizer);
  }

  @Override
  public Query addHref(UriInfo uriInfo, Query entity) {
    Entity.withHref(uriInfo, entity.getOwner());
    Entity.withHref(uriInfo, entity.getFollowers());
    return entity;
  }

  public static class queryList extends ResultList<Query> {
    @SuppressWarnings("unused")
    public queryList() {
      /* Required for serde */
    }
  }

  static final String FIELDS = "queryUsage";

  @GET
  @Operation(
      operationId = "listQueries",
      summary = "List queries",
      tags = "query",
      description =
          "Get a list of queries, optionally filtered by `service` it belongs to. Use `fields` "
              + "parameter to get only necessary fields. Use cursor-based pagination to limit the number "
              + "entries in the list using `limit` and `before` or `after` query params.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "List of queries",
            content =
                @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = QueryResource.queryList.class)))
      })
  public ResultList<Query> list(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(
              description = "Fields requested in the returned resource",
              schema = @Schema(type = "string", example = FIELDS))
          @QueryParam("fields")
          String fieldsParam,
      @Parameter(
              description = "Filter locations by prefix of the FQN",
              schema = @Schema(type = "string", example = "s3://bucket/folder1"))
          @QueryParam("entity")
          String entity,
      @Parameter(description = "Limit the number locations returned. " + "(1 to 1000000, default = 10)")
          @DefaultValue("10")
          @Min(0)
          @Max(1000000)
          @QueryParam("limit")
          int limitParam,
      @Parameter(description = "Returns list of locations before this cursor", schema = @Schema(type = "string"))
          @QueryParam("before")
          String before,
      @Parameter(description = "Returns list of locations after this cursor", schema = @Schema(type = "string"))
          @QueryParam("after")
          String after,
      @Parameter(
              description = "Include all, deleted, or non-deleted entities.",
              schema = @Schema(implementation = Include.class))
          @QueryParam("include")
          @DefaultValue("non-deleted")
          Include include)
      throws IOException {
    ListFilter filter = new ListFilter(include).addQueryParam("entity", entity);
    return super.listInternal(uriInfo, securityContext, fieldsParam, filter, limitParam, before, after);
  }

  @GET
  @Path("/{id}")
  @Operation(
      operationId = "getQueryByID",
      summary = "Get a query",
      tags = "query",
      description = "Get a table by `id`",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "query",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Query.class))),
        @ApiResponse(responseCode = "404", description = "Query for instance {id} is not found")
      })
  public Query get(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "query Id", schema = @Schema(type = "UUID")) @PathParam("id") UUID id,
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
      throws IOException {
    return getInternal(uriInfo, securityContext, id, fieldsParam, include);
  }

  @GET
  @Path("/name/{fqn}")
  @Operation(
      operationId = "getQueryFqn",
      summary = "Get a query by name",
      tags = "query",
      description = "Get a query by fully qualified table name.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "query",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Query.class))),
        @ApiResponse(responseCode = "404", description = "Query for instance {id} is not found")
      })
  public Query getByName(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "Fully qualified name of the query", schema = @Schema(type = "string")) @PathParam("fqn")
          String fqn,
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
      throws IOException {
    return getByNameInternal(uriInfo, securityContext, fqn, fieldsParam, include);
  }

  @Path("/entity/{id}")
  @GET
  @Operation(
      operationId = "listQueries",
      summary = "List Queries",
      tags = "query",
      description = "",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "List of Queries",
            content =
                @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = QueryResource.queryList.class)))
      })
  public ResultList<Query> list(
      @Parameter(description = "user Id", schema = @Schema(type = "string")) @PathParam("id") String id,
      @DefaultValue("10") @Min(0) @Max(1000000) @QueryParam("limit") int limitParam,
      @Parameter(description = "Returns list of users before this cursor", schema = @Schema(type = "string"))
          @QueryParam("before")
          String before,
      @Parameter(description = "Returns list of users after this cursor", schema = @Schema(type = "string"))
          @QueryParam("after")
          String after) {
    ResultList<Query> queries = dao.listQueriesByEntityId(id, before, after, limitParam);
    return queries;
  }

  @GET
  @Path("/{id}/versions")
  @Operation(
      operationId = "listAllQueryVersion",
      summary = "List query versions",
      tags = "query",
      description = "Get a list of all the versions of a query identified by `id`",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "List of query versions",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = EntityHistory.class)))
      })
  public EntityHistory listVersions(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "query Id", schema = @Schema(type = "string")) @PathParam("id") UUID id)
      throws IOException {
    return super.listVersionsInternal(securityContext, id);
  }

  @GET
  @Path("/{id}/versions/{version}")
  @Operation(
      operationId = "getSpecificQueryVersion",
      summary = "Get a version of the query",
      tags = "query",
      description = "Get a version of the query by given `id`",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "query",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Query.class))),
        @ApiResponse(
            responseCode = "404",
            description = "query for instance {id} and version {version} is " + "not found")
      })
  public Query getVersion(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "query Id", schema = @Schema(type = "UUID")) @PathParam("id") UUID id,
      @Parameter(
              description = "query version number in the form `major`.`minor`",
              schema = @Schema(type = "string", example = "0.1 or 1.1"))
          @PathParam("version")
          String version)
      throws IOException {
    return super.getVersionInternal(securityContext, id, version);
  }

  @POST
  @Operation(
      operationId = "createQuery",
      summary = "Create a query",
      tags = "query",
      description = "Create a query under an existing entity.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "The query",
            content =
                @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = QueryResource.queryList.class))),
        @ApiResponse(responseCode = "400", description = "Bad request")
      })
  public Response create(@Context UriInfo uriInfo, @Context SecurityContext securityContext, @Valid CreateQuery create)
      throws IOException {
    Query query = getQuery(create, securityContext.getUserPrincipal().getName());
    return create(uriInfo, securityContext, query);
  }

  @PUT
  @Path("/bulk")
  @Operation(
      operationId = "createBukQuery",
      summary = "Add query in bulk",
      tags = "query",
      description = "insert bulk query data",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "The query",
            content =
                @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = QueryResource.queryList.class))),
        @ApiResponse(responseCode = "400", description = "Bad request")
      })
  public List<Query> addBulkQueries(
      @Context UriInfo uriInfo, @Context SecurityContext securityContext, @Valid List<CreateQuery> createQueryList)
      throws IOException {
    List<Query> queryList = new ArrayList<>();
    for (CreateQuery createQuery : createQueryList) {
      Query query = getQuery(createQuery, securityContext.getUserPrincipal().getName());
      Response response = createOrUpdate(uriInfo, securityContext, query);
      queryList.add((Query) response.getEntity());
    }
    return queryList;
  }

  @PUT
  @Operation(
      operationId = "createOrUpdateQuery",
      summary = "Create or update a query",
      tags = "tables",
      description = "Create a query, if it does not exist. If a query already exists, update the query.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "The query",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Query.class))),
        @ApiResponse(responseCode = "400", description = "Bad request")
      })
  public Response createOrUpdate(
      @Context UriInfo uriInfo, @Context SecurityContext securityContext, @Valid CreateQuery create)
      throws IOException {
    Query query = getQuery(create, securityContext.getUserPrincipal().getName());
    return createOrUpdate(uriInfo, securityContext, query);
  }

  @PATCH
  @Path("/{id}")
  @Operation(
      operationId = "patchQuery",
      summary = "Update a query",
      tags = "query",
      description = "Update an existing query using JsonPatch.",
      externalDocs = @ExternalDocumentation(description = "JsonPatch RFC", url = "https://tools.ietf.org/html/rfc6902"))
  @Consumes(MediaType.APPLICATION_JSON_PATCH_JSON)
  public Response patch(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "Id of the query", schema = @Schema(type = "UUID")) @PathParam("id") UUID id,
      @RequestBody(
              description = "JsonPatch with array of operations",
              content =
                  @Content(
                      mediaType = MediaType.APPLICATION_JSON_PATCH_JSON,
                      examples = {
                        @ExampleObject("[" + "{op:remove, path:/a}," + "{op:add, path: /b, value: val}" + "]")
                      }))
          JsonPatch patch)
      throws IOException {
    return patchInternal(uriInfo, securityContext, id, patch);
  }

  @DELETE
  @Path("/{id}")
  @Operation(
      operationId = "deleteQuery",
      summary = "Delete a query",
      tags = "query",
      description = "Delete a query by `id`.",
      responses = {
        @ApiResponse(responseCode = "200", description = "OK"),
        @ApiResponse(responseCode = "404", description = "Query for instance {id} is not found")
      })
  public Response delete(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "Hard delete the entity. (Default = `false`)")
          @QueryParam("hardDelete")
          @DefaultValue("false")
          boolean hardDelete,
      @Parameter(description = "Id of the query", schema = @Schema(type = "UUID")) @PathParam("id") UUID id)
      throws IOException {
    return delete(uriInfo, securityContext, id, false, hardDelete);
  }

  @PUT
  @Path("/restore")
  @Operation(
      operationId = "restore",
      summary = "Restore a soft deleted query.",
      tags = "query",
      description = "Restore a soft deleted query.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Successfully restored the Query ",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Query.class)))
      })
  public Response restoreTable(
      @Context UriInfo uriInfo, @Context SecurityContext securityContext, @Valid RestoreEntity restore)
      throws IOException {
    return restoreEntity(uriInfo, securityContext, restore.getId());
  }

  @PUT
  @Path("/{id}/addQueryUsage")
  @Operation(
      operationId = "addQueryUsage",
      summary = "Add query usage",
      tags = "query",
      description = "Add query usage",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "OK",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Query.class)))
      })
  public Query addQuery(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "Id of the query", schema = @Schema(type = "UUID")) @PathParam("id") UUID id,
      @Valid List<EntityReference> entityIds)
      throws IOException {
    OperationContext operationContext = new OperationContext(entityType, MetadataOperation.EDIT_ALL);
    authorizer.authorize(securityContext, operationContext, getResourceContextById(id));
    Query query = dao.addQueryUsage(id, entityIds);
    return query;
  }

  @DELETE
  @Path("/name/{fqn}")
  @Operation(
      operationId = "deleteQueryByFQN",
      summary = "Delete a query",
      tags = "query",
      description = "Delete a query by `fullyQualifiedName`.",
      responses = {
        @ApiResponse(responseCode = "200", description = "OK"),
        @ApiResponse(responseCode = "404", description = "Query for instance {fqn} is not found")
      })
  public Response delete(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "Hard delete the entity. (Default = `false`)")
          @QueryParam("hardDelete")
          @DefaultValue("false")
          boolean hardDelete,
      @Parameter(description = "Fully qualified name of the location", schema = @Schema(type = "string"))
          @PathParam("fqn")
          String fqn)
      throws IOException {
    return deleteByName(uriInfo, securityContext, fqn, false, hardDelete);
  }

  private Query getQuery(CreateQuery create, String user) throws IOException {
    return copy(new Query(), create, user)
        .withChecksum(create.getChecksum())
        .withQuery(create.getQuery())
        .withDuration(create.getDuration())
        .withVote(create.getVote())
        .withUsers(create.getUsers())
        .withName(create.getEntityType())
        .withQueryUsage(create.getQueryUsage())
        .withEntityType(create.getEntityType())
        .withQueryDate(create.getQueryDate());
  }
}
