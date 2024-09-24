package org.openmetadata.service.apps;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import io.dropwizard.configuration.ConfigurationException;
import io.dropwizard.configuration.EnvironmentVariableSubstitutor;
import io.dropwizard.configuration.FileConfigurationSourceProvider;
import io.dropwizard.configuration.SubstitutingSourceProvider;
import io.dropwizard.configuration.YamlConfigurationFactory;
import java.io.File;
import java.io.IOException;
import java.net.URL;
import java.util.Map;
import org.apache.commons.text.StringSubstitutor;
import org.openmetadata.schema.api.configuration.apps.AppPrivateConfig;
import org.openmetadata.service.util.JsonUtils;

public class ConfigurationReader {
  private final StringSubstitutor substitutor;
  private final ObjectMapper mapper = new ObjectMapper(new YAMLFactory());
  private final YamlConfigurationFactory<Object> factory =
      new YamlConfigurationFactory<>(Object.class, null, mapper, "dw");

  public ConfigurationReader(Map<String, String> envMap) {
    // envMap is for custom environment variables (e.g., for testing), defaulting to the system
    // environment.
    substitutor =
        envMap == null ? new EnvironmentVariableSubstitutor(false) : new StringSubstitutor(envMap);
  }

  public ConfigurationReader() {
    this(System.getenv());
  }

  public AppPrivateConfig readConfigFromResource(String appName)
      throws IOException, ConfigurationException {
    String configFilePath = "applications/" + appName + "/config.yaml";
    URL resource = ConfigurationReader.class.getClassLoader().getResource(configFilePath);
    if (resource == null) {
      throw new IOException("Configuration file not found: " + configFilePath);
    }
    File configFile = new File(resource.getFile());
    return JsonUtils.convertValue(readConfigFile(configFile), AppPrivateConfig.class);
  }

  public Map<String, Object> readConfigFile(File configFile)
      throws IOException, ConfigurationException {
    try {
      return (Map<String, Object>)
          factory.build(
              new SubstitutingSourceProvider(new FileConfigurationSourceProvider(), substitutor),
              configFile.getAbsolutePath());
    } catch (ClassCastException e) {
      throw new RuntimeException("Configuration file is not a valid YAML file", e);
    }
  }
}
