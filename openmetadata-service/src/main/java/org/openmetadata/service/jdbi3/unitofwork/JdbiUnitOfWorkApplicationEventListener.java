package org.openmetadata.service.jdbi3.unitofwork;

import java.util.Set;
import javax.annotation.Nullable;
import javax.ws.rs.HttpMethod;
import lombok.extern.slf4j.Slf4j;
import org.glassfish.jersey.server.monitoring.ApplicationEvent;
import org.glassfish.jersey.server.monitoring.ApplicationEventListener;
import org.glassfish.jersey.server.monitoring.RequestEvent;
import org.glassfish.jersey.server.monitoring.RequestEventListener;

@Slf4j
public class JdbiUnitOfWorkApplicationEventListener implements ApplicationEventListener {

  private final JdbiUnitOfWorkProvider unitOfWorkProvider;
  private final Set<String> excludedPaths;

  public JdbiUnitOfWorkApplicationEventListener(JdbiUnitOfWorkProvider unitOfWorkProvider, Set<String> excludedPaths) {
    this.unitOfWorkProvider = unitOfWorkProvider;
    this.excludedPaths = excludedPaths;
  }

  @Override
  public void onEvent(ApplicationEvent event) {
    LOG.debug("Received Application event {}", event.getType());
  }

  @Override
  @Nullable
  public RequestEventListener onRequest(RequestEvent event) {
    String path = event.getUriInfo().getPath();
    if (excludedPaths.stream().anyMatch(path::contains)) {
      return null;
    }
    if (event.getContainerRequest().getMethod().equals(HttpMethod.GET)) {
      return new HttpGetRequestJdbiUnitOfWorkEventListener(unitOfWorkProvider.getHandleManager());
    }
    return new NonHttpGetRequestJdbiUnitOfWorkEventListener(unitOfWorkProvider.getHandleManager());
  }
}
