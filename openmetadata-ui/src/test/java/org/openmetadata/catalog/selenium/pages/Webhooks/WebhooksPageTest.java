package org.openmetadata.catalog.selenium.pages.Webhooks;

import com.github.javafaker.Faker;
import java.time.Duration;
import java.util.ArrayList;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.openmetadata.catalog.selenium.events.*;
import org.openmetadata.catalog.selenium.objectRepository.*;
import org.openmetadata.catalog.selenium.properties.*;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.interactions.Actions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.testng.Assert;

public class WebhooksPageTest {

  static WebDriver webDriver;
  static Common common;
  static Webhooks webhooks;
  static String url = Property.getInstance().getURL();
  static Faker faker = new Faker();
  static Actions actions;
  static WebDriverWait wait;
  Integer waitTime = Property.getInstance().getSleepTime();
  String webDriverInstance = Property.getInstance().getWebDriver();
  String webDriverPath = Property.getInstance().getWebDriverPath();

  @BeforeEach
  public void openMetadataWindow() {
    System.setProperty(webDriverInstance, webDriverPath);
    ChromeOptions options = new ChromeOptions();
    options.addArguments("--headless");
    options.addArguments("--window-size=1280,800");
    webDriver = new ChromeDriver(options);
    common = new Common(webDriver);
    webhooks = new Webhooks(webDriver);
    actions = new Actions(webDriver);
    wait = new WebDriverWait(webDriver, Duration.ofSeconds(30));
    webDriver.manage().window().maximize();
    webDriver.get(url);
  }

  @Test
  void openWebHookPage() {
    Events.click(webDriver, common.closeWhatsNew()); // Close What's new
    Events.click(webDriver, common.headerSettings()); // Setting
    Events.click(webDriver, webhooks.webhookLink());
  }

  @Test
  void addWebHook() throws InterruptedException {
    String name = faker.name().name();
    webDriver.manage().timeouts().implicitlyWait(Duration.ofSeconds(10));
    openWebHookPage();
    Events.click(webDriver, webhooks.addWebhook());
    Events.sendKeys(webDriver, webhooks.name(), name);
    Events.click(webDriver, webhooks.descriptionBox());
    Events.sendKeys(webDriver, webhooks.descriptionBox(), "test");
    Events.sendKeys(webDriver, webhooks.endpoint(), "test.com");
    Events.click(webDriver, webhooks.checkbox());
    Thread.sleep(waitTime);
    Events.click(webDriver, webhooks.entityCreatedMenu());
    Events.click(webDriver, webhooks.allEntities());
    actions.click();
    actions.perform();
    Events.click(webDriver, webhooks.saveWebhook());
    WebElement checkName = webDriver.findElement(webhooks.checkWebhook());
    Assert.assertTrue(checkName.isDisplayed());
    Assert.assertEquals(checkName.getText(), name);
  }

  @Test
  void checkDuplicateWebhookName() throws InterruptedException {
    String name = faker.name().name();
    webDriver.manage().timeouts().implicitlyWait(Duration.ofSeconds(10));
    openWebHookPage();
    for (int i = 0; i < 2; i++) {
      Events.click(webDriver, webhooks.addWebhook());
      Events.sendKeys(webDriver, webhooks.name(), name);
      Events.click(webDriver, webhooks.descriptionBox());
      Events.sendKeys(webDriver, webhooks.descriptionBox(), "test");
      Events.sendKeys(webDriver, webhooks.endpoint(), "test.com");
      Events.click(webDriver, webhooks.checkbox());
      Events.click(webDriver, webhooks.entityCreatedMenu());
      Events.click(webDriver, webhooks.allEntities());
      actions.click();
      actions.perform();
      Events.click(webDriver, webhooks.saveWebhook());
    }
    Thread.sleep(waitTime);
    WebElement errorMessage = webDriver.findElement(webhooks.toast());
    Assert.assertTrue(errorMessage.isDisplayed());
    Assert.assertEquals(errorMessage.getText(), "Request failed with status code 409");
  }

  @Test
  void checkBlankName() throws InterruptedException {
    webDriver.manage().timeouts().implicitlyWait(Duration.ofSeconds(10));
    openWebHookPage();
    Events.click(webDriver, webhooks.addWebhook());
    Events.sendKeys(webDriver, webhooks.name(), "");
    Events.click(webDriver, webhooks.descriptionBox());
    Events.sendKeys(webDriver, webhooks.descriptionBox(), "test");
    Events.sendKeys(webDriver, webhooks.endpoint(), "test.com");
    Events.click(webDriver, webhooks.checkbox());
    Thread.sleep(waitTime);
    Events.click(webDriver, webhooks.entityCreatedMenu());
    Events.click(webDriver, webhooks.allEntities());
    actions.click();
    actions.perform();
    Events.click(webDriver, webhooks.saveWebhook());
    WebElement errorMessage = webDriver.findElement(common.errorMessage());
    Assert.assertTrue(errorMessage.isDisplayed());
    Assert.assertEquals(errorMessage.getText(), "Webhook name is required.");
  }

  @Test
  void checkBlankEndpoint() {
    webDriver.manage().timeouts().implicitlyWait(Duration.ofSeconds(10));
    openWebHookPage();
    Events.click(webDriver, webhooks.addWebhook());
    Events.sendKeys(webDriver, webhooks.name(), "test");
    Events.click(webDriver, webhooks.descriptionBox());
    Events.sendKeys(webDriver, webhooks.descriptionBox(), "test");
    Events.sendKeys(webDriver, webhooks.endpoint(), "");
    Events.click(webDriver, webhooks.checkbox());
    Events.click(webDriver, webhooks.entityCreatedMenu());
    Events.click(webDriver, webhooks.allEntities());
    actions.click();
    actions.perform();
    Events.click(webDriver, webhooks.saveWebhook());
    WebElement errorMessage = webDriver.findElement(common.errorMessage());
    Assert.assertTrue(errorMessage.isDisplayed());
    Assert.assertEquals(errorMessage.getText(), "Webhook endpoint is required.");
  }

  @Test
  void checkBlankEntityCheckbox() {
    webDriver.manage().timeouts().implicitlyWait(Duration.ofSeconds(10));
    openWebHookPage();
    Events.click(webDriver, webhooks.addWebhook());
    Events.sendKeys(webDriver, webhooks.name(), "test");
    Events.click(webDriver, webhooks.descriptionBox());
    Events.sendKeys(webDriver, webhooks.descriptionBox(), "test");
    Events.sendKeys(webDriver, webhooks.endpoint(), "test.com");
    Events.click(webDriver, webhooks.saveWebhook());
    WebElement errorMessage = webDriver.findElement(common.errorMessage());
    Assert.assertTrue(errorMessage.isDisplayed());
    Assert.assertEquals(errorMessage.getText(), "Webhook event filters are required.");
  }

  @AfterEach
  public void closeTabs() {
    ArrayList<String> tabs = new ArrayList<>(webDriver.getWindowHandles());
    String originalHandle = webDriver.getWindowHandle();
    for (String handle : webDriver.getWindowHandles()) {
      if (!handle.equals(originalHandle)) {
        webDriver.switchTo().window(handle);
        webDriver.close();
      }
    }
    webDriver.switchTo().window(tabs.get(0)).close();
  }
}
