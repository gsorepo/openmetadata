package org.openmetadata.catalog.resources.dqtests;

import com.google.inject.Inject;
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
import java.util.List;
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
import org.openmetadata.catalog.Entity;
import org.openmetadata.catalog.api.tests.CreateTest;
import org.openmetadata.catalog.jdbi3.CollectionDAO;
import org.openmetadata.catalog.jdbi3.ListFilter;
import org.openmetadata.catalog.jdbi3.TestRepository;
import org.openmetadata.catalog.resources.Collection;
import org.openmetadata.catalog.resources.EntityResource;
import org.openmetadata.catalog.security.Authorizer;
import org.openmetadata.catalog.tests.Test;
import org.openmetadata.catalog.type.EntityHistory;
import org.openmetadata.catalog.type.Include;
import org.openmetadata.catalog.util.RestUtil;
import org.openmetadata.catalog.util.ResultList;

@Slf4j
@Path("/v1/test")
@Api(value = "Test collection", tags = "Test collection")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Collection(name = "Tests")
public class TestResource extends EntityResource<Test, TestRepository> {
  public static final String COLLECTION_PATH = "/v1/test";

  static final String FIELDS = "owner,testSuite,entity,testDefinition";

  @Override
  public Test addHref(UriInfo uriInfo, Test test) {
    test.withHref(RestUtil.getHref(uriInfo, COLLECTION_PATH, test.getId()));
    Entity.withHref(uriInfo, test.getOwner());
    Entity.withHref(uriInfo, test.getTestSuite());
    Entity.withHref(uriInfo, test.getTestDefinition());
    Entity.withHref(uriInfo, test.getEntity());
    return test;
  }

  @Inject
  public TestResource(CollectionDAO dao, Authorizer authorizer) {
    super(Test.class, new TestRepository(dao), authorizer);
  }

  public static class TestList extends ResultList<Test> {
    @SuppressWarnings("unused")
    public TestList() {
      // Empty constructor needed for deserialization
    }

    public TestList(List<Test> data, String beforeCursor, String afterCursor, int total) {
      super(data, beforeCursor, afterCursor, total);
    }
  }

  @GET
  @Operation(
      operationId = "listTests",
      summary = "List tests",
      tags = "Tests",
      description =
          "Get a list of test. Use `fields` "
              + "parameter to get only necessary fields. Use cursor-based pagination to limit the number "
              + "entries in the list using `limit` and `before` or `after` query params.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "List of test definitions",
            content =
                @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = TestResource.TestList.class)))
      })
  public ResultList<Test> list(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(
              description = "Fields requested in the returned resource",
              schema = @Schema(type = "string", example = FIELDS))
          @QueryParam("fields")
          String fieldsParam,
      @Parameter(description = "Limit the number tests returned. (1 to 1000000, default = " + "10)")
          @DefaultValue("10")
          @QueryParam("limit")
          @Min(0)
          @Max(1000000)
          int limitParam,
      @Parameter(description = "Returns list of tests before this cursor", schema = @Schema(type = "string"))
          @QueryParam("before")
          String before,
      @Parameter(description = "Returns list of tests after this cursor", schema = @Schema(type = "string"))
          @QueryParam("after")
          String after,
      @Parameter(
              description = "Include all, deleted, or non-deleted entities.",
              schema = @Schema(implementation = Include.class))
          @QueryParam("include")
          @DefaultValue("non-deleted")
          Include include)
      throws IOException {
    ListFilter filter = new ListFilter(include);
    return super.listInternal(uriInfo, securityContext, fieldsParam, filter, limitParam, before, after);
  }

  @GET
  @Path("/{id}/versions")
  @Operation(
      operationId = "listAllTestVersion",
      summary = "List test versions",
      tags = "Tests",
      description = "Get a list of all the versions of a tests identified by `id`",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "List of test versions",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = EntityHistory.class)))
      })
  public EntityHistory listVersions(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "Test Id", schema = @Schema(type = "string")) @PathParam("id") String id)
      throws IOException {
    return dao.listVersions(id);
  }

  @GET
  @Path("/{id}")
  @Operation(
      summary = "Get a Test",
      tags = "Tests",
      description = "Get a Test by `id`.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "The Tests",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Test.class))),
        @ApiResponse(responseCode = "404", description = "Test for instance {id} is not found")
      })
  public Test get(
      @Context UriInfo uriInfo,
      @PathParam("id") String id,
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
      throws IOException {
    return getInternal(uriInfo, securityContext, id, fieldsParam, include);
  }

  @GET
  @Path("/name/{name}")
  @Operation(
      operationId = "getTestByName",
      summary = "Get a test by name",
      tags = "Tests",
      description = "Get a test by  name.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "The Test",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Test.class))),
        @ApiResponse(responseCode = "404", description = "Test for instance {id} is not found")
      })
  public Test getByName(
      @Context UriInfo uriInfo,
      @PathParam("name") String name,
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
      throws IOException {
    return getByNameInternal(uriInfo, securityContext, name, fieldsParam, include);
  }

  @GET
  @Path("/{id}/versions/{version}")
  @Operation(
      operationId = "getSpecificTestVersion",
      summary = "Get a version of the Test",
      tags = "Tests",
      description = "Get a version of the Test by given `id`",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Test",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Test.class))),
        @ApiResponse(
            responseCode = "404",
            description = "Test for instance {id} and version {version} is " + "not found")
      })
  public Test getVersion(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "Test Id", schema = @Schema(type = "string")) @PathParam("id") String id,
      @Parameter(
              description = "Test version number in the form `major`.`minor`",
              schema = @Schema(type = "string", example = "0.1 or 1.1"))
          @PathParam("version")
          String version)
      throws IOException {
    return dao.getVersion(id, version);
  }

  @POST
  @Operation(
      operationId = "createTest",
      summary = "Create a Test",
      tags = "Tests",
      description = "Create a Test",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "The test",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Test.class))),
        @ApiResponse(responseCode = "400", description = "Bad request")
      })
  public Response create(@Context UriInfo uriInfo, @Context SecurityContext securityContext, @Valid CreateTest create)
      throws IOException {
    Test test = getTest(create, securityContext.getUserPrincipal().getName());
    return create(uriInfo, securityContext, test, true);
  }

  @PATCH
  @Path("/{id}")
  @Operation(
      operationId = "patchTest",
      summary = "Update a test",
      tags = "Tests",
      description = "Update an existing test using JsonPatch.",
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
      throws IOException {
    return patchInternal(uriInfo, securityContext, id, patch);
  }

  @PUT
  @Operation(
      operationId = "createOrUpdateTest",
      summary = "Update test",
      tags = "Tests",
      description = "Create a Test, it it does not exist or update an existing Test.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "The updated test.",
            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Test.class)))
      })
  public Response createOrUpdate(
      @Context UriInfo uriInfo, @Context SecurityContext securityContext, @Valid CreateTest create) throws IOException {
    Test test = getTest(create, securityContext.getUserPrincipal().getName());
    return createOrUpdate(uriInfo, securityContext, test, true);
  }

  @DELETE
  @Path("/{id}")
  @Operation(
      operationId = "deleteTest",
      summary = "Delete a test",
      tags = "Tests",
      description = "Delete a test by `id`.",
      responses = {
        @ApiResponse(responseCode = "200", description = "OK"),
        @ApiResponse(responseCode = "404", description = "Test for instance {id} is not found")
      })
  public Response delete(
      @Context UriInfo uriInfo,
      @Context SecurityContext securityContext,
      @Parameter(description = "Hard delete the entity. (Default = `false`)")
          @QueryParam("hardDelete")
          @DefaultValue("false")
          boolean hardDelete,
      @Parameter(description = "Topic Id", schema = @Schema(type = "string")) @PathParam("id") String id)
      throws IOException {
    return delete(uriInfo, securityContext, id, false, hardDelete, true);
  }

  private Test getTest(CreateTest create, String user) {
    return copy(new Test(), create, user)
        .withDescription(create.getDescription())
        .withName(create.getName())
        .withDisplayName(create.getDisplayName())
        .withParameterValues(create.getParameterValues())
        .withEntity(create.getEntity())
        .withTestSuite(create.getTestSuite())
        .withTestDefinition(create.getTestDefinition());
  }
}
