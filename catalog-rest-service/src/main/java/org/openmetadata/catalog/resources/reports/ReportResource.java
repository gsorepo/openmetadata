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

package org.openmetadata.catalog.resources.reports;

import com.google.inject.Inject;
import org.openmetadata.catalog.entity.data.Report;
import org.openmetadata.catalog.jdbi3.ReportRepository;
import org.openmetadata.catalog.resources.Collection;
import org.openmetadata.catalog.util.EntityUtil.Fields;
import org.openmetadata.catalog.util.RestUtil;
import org.openmetadata.catalog.util.RestUtil.PutResponse;
import org.openmetadata.catalog.util.ResultList;
import io.swagger.annotations.Api;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.openmetadata.catalog.security.CatalogAuthorizer;

import javax.validation.Valid;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.UriInfo;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Path("/v1/reports")
@Api(value = "Reports collection", tags = "Reports collection")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Collection(name = "reports", repositoryClass = "org.openmetadata.catalog.jdbi3.ReportRepository")
public class ReportResource {
  public static final String COLLECTION_PATH = "/v1/bots/";
  private final ReportRepository dao;

  private static List<Report> addHref(UriInfo uriInfo, List<Report> reports) {
    reports.forEach(r -> addHref(uriInfo, r));
    return reports;
  }

  private static Report addHref(UriInfo uriInfo, Report report) {
    report.setHref(RestUtil.getHref(uriInfo, COLLECTION_PATH, report.getId()));
    return report;
  }

  @Inject
  public ReportResource(ReportRepository dao, CatalogAuthorizer authorizer) {
    Objects.requireNonNull(dao, "ReportRepository must not be null");
    this.dao = dao;
  }

  static class ReportList extends ResultList<Report> {
    ReportList(List<Report> data) {
      super(data);
    }
  }

  static final String FIELDS ="owner,service,usageSummary";
  public static final List<String> FIELD_LIST = Arrays.asList(FIELDS.replaceAll(" ", "")
          .split(","));

  @GET
  @Operation(summary = "List reports", tags = "reports",
          description = "Get a list of reports. Use `fields` parameter to get only necessary fields.",
          responses = {
                  @ApiResponse(responseCode = "200", description = "List of reports",
                          content = @Content(mediaType = "application/json",
                          schema = @Schema(implementation = ReportList.class)))
          })
  public ReportList list(@Context UriInfo uriInfo,
                         @Parameter(description = "Fields requested in the returned resource",
                                 schema = @Schema(type = "string", example = FIELDS))
                         @QueryParam("fields") String fieldsParam) throws IOException {
    Fields fields = new Fields(FIELD_LIST, fieldsParam);
    return new ReportList(addHref(uriInfo, dao.list(fields)));
  }

  @GET
  @Path("/{id}")
  @Operation(summary = "Get a report", tags = "reports",
          description = "Get a report by `id`.",
          responses = {
                  @ApiResponse(responseCode = "200", description = "The report",
                          content = @Content(mediaType = "application/json",
                          schema = @Schema(implementation = Report.class))),
                  @ApiResponse(responseCode = "404", description = "Report for instance {id} is not found")
          })
  public Report get(@Context UriInfo uriInfo, @PathParam("id") String id,
                     @Parameter(description = "Fields requested in the returned resource",
                             schema = @Schema(type = "string", example = FIELDS))
                     @QueryParam("fields") String fieldsParam) throws IOException {
    Fields fields = new Fields(FIELD_LIST, fieldsParam);
    return addHref(uriInfo, dao.get(id, fields));
  }

  @POST
  @Operation(summary = "Create a report", tags = "reports",
          description = "Create a new report.",
          responses = {
                  @ApiResponse(responseCode = "200", description = "The report",
                          content = @Content(mediaType = "application/json",
                          schema = @Schema(implementation = Report.class))),
                  @ApiResponse(responseCode = "400", description = "Bad request")
          })
  public Response create(@Context UriInfo uriInfo, @Valid Report report) throws IOException {
    report.setId(UUID.randomUUID());
    addHref(uriInfo, dao.create(report, report.getService(), report.getOwner()));
    return Response.created(report.getHref()).entity(report).build();
  }

  @PUT
  @Operation(summary = "Create or update a report", tags = "reports",
          description = "Create a new report, it it does not exist or update an existing report.",
          responses = {
                  @ApiResponse(responseCode = "200", description = "The report",
                          content = @Content(mediaType = "application/json",
                          schema = @Schema(implementation = Report.class))),
                  @ApiResponse(responseCode = "400", description = "Bad request")
          })
  public Response createOrUpdate(@Context UriInfo uriInfo, @Valid Report report) throws IOException {
    report.setId(UUID.randomUUID());
    PutResponse<Report> response = dao.createOrUpdate(report, report.getService(), report.getOwner());
    addHref(uriInfo, report);
    return Response.status(response.getStatus()).entity(report).build();
  }
}

