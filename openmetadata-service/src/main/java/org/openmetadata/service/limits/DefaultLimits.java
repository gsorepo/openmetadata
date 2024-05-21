package org.openmetadata.service.limits;

import javax.ws.rs.core.Response;
import javax.ws.rs.core.SecurityContext;
import org.jdbi.v3.core.Jdbi;
import org.openmetadata.schema.configuration.LimitsConfiguration;
import org.openmetadata.schema.system.LimitsConfig;
import org.openmetadata.service.OpenMetadataApplicationConfig;
import org.openmetadata.service.security.policyevaluator.OperationContext;
import org.openmetadata.service.security.policyevaluator.ResourceContextInterface;

public class DefaultLimits implements Limits {
  private OpenMetadataApplicationConfig serverConfig = null;
  private LimitsConfiguration limitsConfiguration = null;
  private Jdbi jdbi = null;

  @Override
  public void init(OpenMetadataApplicationConfig serverConfig, Jdbi jdbi) {
    this.serverConfig = serverConfig;
    this.limitsConfiguration = serverConfig.getLimitsConfiguration();
    this.jdbi = jdbi;
  }

  @Override
  public void enforceLimits(
      SecurityContext securityContext, ResourceContextInterface resourceContext, OperationContext operationContext) {
    // do not enforce limits
  }

  @Override
  public LimitsConfig getLimitsConfig() {
    LimitsConfig limitsConfig = new LimitsConfig();
    limitsConfig.setEnable(limitsConfiguration.getEnable());
    return limitsConfig;
  }

  @Override
  public Response getLimitsForaFeature(String name) {
    return Response.ok().build();
  }
}
