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

package org.openmetadata.catalog;

import io.dropwizard.testing.ResourceHelpers;
import io.dropwizard.testing.junit5.DropwizardAppExtension;
import io.dropwizard.testing.junit5.DropwizardExtensionsSupport;
import javax.ws.rs.client.Client;
import javax.ws.rs.client.ClientBuilder;
import javax.ws.rs.client.WebTarget;
import lombok.extern.slf4j.Slf4j;
import org.glassfish.jersey.client.ClientProperties;
import org.glassfish.jersey.client.HttpUrlConnectorProvider;
import org.junit.jupiter.api.extension.ExtendWith;
import org.openmetadata.catalog.fernet.Fernet;
import org.openmetadata.catalog.resources.CollectionRegistry;
import org.openmetadata.catalog.resources.EmbeddedMySqlSupport;
import org.openmetadata.catalog.resources.events.WebhookCallbackResource;

@Slf4j
@ExtendWith(EmbeddedMySqlSupport.class)
@ExtendWith(DropwizardExtensionsSupport.class)
public abstract class CatalogApplicationTest {
  protected static final String CONFIG_PATH;
  public static final DropwizardAppExtension<CatalogApplicationConfig> APP;
  private static final Client client;
  protected static final WebhookCallbackResource webhookCallbackResource = new WebhookCallbackResource();
  public static final String FERNET_KEY_1 = "ihZpp5gmmDvVsgoOG6OVivKWwC9vd5JQ";
  public static final String FERNET_KEY_2 = "0cDdxg2rlodhcsjtmuFsOOvWpRRTW9ZJ";

  static {
    CollectionRegistry.addTestResource(webhookCallbackResource);
    CONFIG_PATH = ResourceHelpers.resourceFilePath("openmetadata-secure-test.yaml");
    APP = new DropwizardAppExtension<>(CatalogApplication.class, CONFIG_PATH);
    client = ClientBuilder.newClient();
    client.property(ClientProperties.CONNECT_TIMEOUT, 0);
    client.property(ClientProperties.READ_TIMEOUT, 0);
    client.property(HttpUrlConnectorProvider.SET_METHOD_WORKAROUND, true);
    Fernet.getInstance().setFernetKey(FERNET_KEY_1);
  }

  public static WebTarget getResource(String collection) {
    String targetURI = "http://localhost:" + APP.getLocalPort() + "/api/v1/" + collection;
    return client.target(targetURI);
  }

  public static WebTarget getConfigResource(String resource) {
    String targetURI = "http://localhost:" + APP.getLocalPort() + "/api/v1/config/" + resource;
    return APP.client().target(targetURI);
  }

  public static WebTarget getOperationsResource(String collection) {
    String targetURI = "http://localhost:" + APP.getLocalPort() + "/api/v1/services/ingestionPipelines/";
    return APP.client().target(targetURI);
  }
}
