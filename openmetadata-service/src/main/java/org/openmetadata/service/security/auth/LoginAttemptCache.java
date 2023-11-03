package org.openmetadata.service.security.auth;

import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import lombok.NonNull;
import org.jetbrains.annotations.NotNull;
import org.openmetadata.schema.api.configuration.LoginConfiguration;
import org.openmetadata.service.OpenMetadataApplicationConfig;

public class LoginAttemptCache {
  private int maxAttempt = 3;
  private final LoadingCache<String, Integer> attemptsCache;

  public LoginAttemptCache(OpenMetadataApplicationConfig config) {
    LoginConfiguration loginConfiguration = config.getApplicationConfiguration().getLoginConfig();
    long accessBlockTime = 600;
    if (loginConfiguration != null) {
      maxAttempt = loginConfiguration.getMaxLoginFailAttempts();
      accessBlockTime = loginConfiguration.getAccessBlockTime();
    }
    attemptsCache =
        CacheBuilder.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(accessBlockTime, TimeUnit.SECONDS)
            .build(
                new CacheLoader<>() {
                  public @NotNull Integer load(@NonNull String username) {
                    return 0;
                  }
                });
  }

  public LoginAttemptCache(int maxAttempt, int blockTimeInSec) {
    this.maxAttempt = maxAttempt;
    attemptsCache =
        CacheBuilder.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(blockTimeInSec, TimeUnit.SECONDS)
            .build(
                new CacheLoader<>() {
                  public @NotNull Integer load(@NonNull String username) {
                    return 0;
                  }
                });
  }

  public void recordSuccessfulLogin(String username) {
    attemptsCache.invalidate(username.toLowerCase());
  }

  public void recordFailedLogin(String username) {
    int attempts;
    try {
      attempts = attemptsCache.get(username.toLowerCase());
    } catch (ExecutionException e) {
      attempts = 0;
    }
    attempts++;
    attemptsCache.put(username, attempts);
  }

  public boolean isLoginBlocked(String username) {
    try {
      return attemptsCache.get(username.toLowerCase()) >= maxAttempt;
    } catch (ExecutionException e) {
      return false;
    }
  }

  public int getUserFailedLoginCount(String username) {
    try {
      return attemptsCache.get(username.toLowerCase());
    } catch (ExecutionException e) {
      return -1;
    }
  }
}
