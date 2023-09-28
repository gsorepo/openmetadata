package org.openmetadata.service.apps;

import static org.openmetadata.service.apps.scheduler.AppScheduler.APP_INFO;
import static org.openmetadata.service.apps.scheduler.AppScheduler.COLLECTION_DAO_KEY;

import lombok.extern.slf4j.Slf4j;
import org.openmetadata.schema.AppRuntime;
import org.openmetadata.schema.entity.app.AppType;
import org.openmetadata.schema.entity.app.Application;
import org.openmetadata.schema.entity.app.ScheduleType;
import org.openmetadata.schema.entity.app.ScheduledExecutionContext;
import org.openmetadata.service.apps.scheduler.AppScheduler;
import org.openmetadata.service.jdbi3.CollectionDAO;
import org.openmetadata.service.util.JsonUtils;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;

@Slf4j
public class AbstractNativeApplication implements NativeApplication {
  private CollectionDAO collectionDAO;
  private Application app;

  @Override
  public void init(Application app, CollectionDAO dao) {
    this.collectionDAO = dao;
    this.app = app;
  }

  @Override
  public void triggerOnDemand(Object requestObj) {
    // Validate Native Application
    if (app.getScheduleType().equals(ScheduleType.Scheduled)) {
      AppRuntime runtime = getAppRuntime(app);
      validateServerExecutableApp(runtime);
      // Trigger the application
      AppScheduler.getInstance().triggerOnDemandApplication(app);
    } else {
      throw new IllegalArgumentException("Live Application cannot scheduled.");
    }
  }

  @Override
  public void schedule() {
    // Validate Native Application
    if (app.getScheduleType().equals(ScheduleType.Scheduled)) {
      AppRuntime runtime = JsonUtils.convertValue(app.getRuntime(), ScheduledExecutionContext.class);
      validateServerExecutableApp(runtime);
      // Schedule New Application Run
      AppScheduler.getInstance().addApplicationSchedule(app);
    } else {
      throw new IllegalArgumentException("Live Application cannot scheduled.");
    }
  }

  protected void validateServerExecutableApp(AppRuntime context) {
    // Server apps are native
    if (!app.getAppType().equals(AppType.Internal)) {
      throw new IllegalArgumentException("Application Type is not Native.");
    }

    // Check OnDemand Execution is supported
    if (!(context != null && Boolean.TRUE.equals(context.getEnabled()))) {
      throw new IllegalArgumentException(
          "Applications does not support on demand execution or the context is not Internal.");
    }
  }

  @Override
  public void execute(JobExecutionContext jobExecutionContext) throws JobExecutionException {
    // This is the part of the code that is executed by the scheduler
    Application jobApp = (Application) jobExecutionContext.getJobDetail().getJobDataMap().get(APP_INFO);
    CollectionDAO dao = (CollectionDAO) jobExecutionContext.getJobDetail().getJobDataMap().get(COLLECTION_DAO_KEY);
    // Initialise the Application
    this.init(jobApp, dao);

    // Trigger
    this.doExecute(jobExecutionContext);
  }

  public static AppRuntime getAppRuntime(Application app) {
    return JsonUtils.convertValue(app.getRuntime(), ScheduledExecutionContext.class);
  }
}
