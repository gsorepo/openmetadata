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

package org.openmetadata.catalog.selenium.pages.pipelineDetails;

import com.github.javafaker.Faker;
import java.time.Duration;
import java.util.ArrayList;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.openmetadata.catalog.selenium.events.Events;
import org.openmetadata.catalog.selenium.properties.Property;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.interactions.Actions;
import org.openqa.selenium.support.ui.WebDriverWait;

@Order(6)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class PipelineDetailsPageTest {
  static WebDriver webDriver;
  static String url = Property.getInstance().getURL();
  Integer waitTime = Property.getInstance().getSleepTime();
  static Faker faker = new Faker();
  String pipelineName = "dim_product etl";
  static String enterDescription = "//div[@data-testid='enterDescription']/div/div[2]/div/div/div/div/div/div";
  static Actions actions;
  static WebDriverWait wait;

  @BeforeEach
  public void openMetadataWindow() {
    System.setProperty("webdriver.chrome.driver", "src/test/resources/drivers/linux/chromedriver");
    ChromeOptions options = new ChromeOptions();
    options.addArguments("--headless");
    webDriver = new ChromeDriver(options);
    actions = new Actions(webDriver);
    wait = new WebDriverWait(webDriver, Duration.ofSeconds(5));
    webDriver.manage().window().maximize();
    webDriver.get(url);
  }

  @Test
  @Order(1)
  public void openExplorePage() throws InterruptedException {
    Events.click(webDriver, By.cssSelector("[data-testid='closeWhatsNew']")); // Close What's new
    Events.click(webDriver, By.cssSelector("[data-testid='appbar-item'][id='explore']")); // Explore
    Events.click(webDriver, By.xpath("(//button[@data-testid='tab'])[4]")); // Pipeline
    Thread.sleep(waitTime);
  }

  @Test
  @Order(2)
  public void editDescription() throws InterruptedException {
    openExplorePage();
    String editDescription = faker.address().toString();
    String updateDescription = faker.address().toString();
    Events.click(webDriver, By.cssSelector("[data-testid='sortBy']")); // Sort By
    Events.click(webDriver, By.cssSelector("[data-testid='list-item']")); // Last Updated
    Events.click(webDriver, By.xpath("(//button[@data-testid='table-link'])[last()]"));
    Events.click(webDriver, By.cssSelector("[data-testid='edit-description']"));
    Events.sendKeys(webDriver, By.xpath(enterDescription), editDescription);
    Events.click(webDriver, By.cssSelector("[data-testid='save']"));
    webDriver.navigate().refresh();
    Events.click(webDriver, By.cssSelector("[data-testid='edit-description']"));
    Thread.sleep(1000);
    webDriver.findElement(By.xpath("//*[text()[contains(.,'" + editDescription + "')]] "));
    Events.sendKeys(webDriver, By.xpath(enterDescription), updateDescription);
    Events.click(webDriver, By.cssSelector("[data-testid='save']"));
    webDriver.navigate().refresh();
    Events.click(webDriver, By.cssSelector("[data-testid='edit-description']"));
    Thread.sleep(1000);
    webDriver.findElement(By.xpath("//*[text()[contains(.,'" + editDescription + updateDescription + "')]] "));
    Events.click(webDriver, By.cssSelector("[data-testid='cancel']"));
  }

  @Test
  @Order(3)
  public void addTag() throws InterruptedException {
    openExplorePage();
    Events.click(webDriver, By.cssSelector("[data-testid='sortBy']")); // Sort By
    Events.click(webDriver, By.cssSelector("[data-testid='list-item']")); // Last Updated
    Events.click(webDriver, By.xpath("(//button[@data-testid='table-link'])[last()]"));
    Thread.sleep(waitTime);
    Events.click(webDriver, By.cssSelector("[data-testid='tags']"));
    Events.click(webDriver, By.cssSelector("[data-testid='associatedTagName']"));
    for (int i = 1; i <= 2; i++) {
      Events.sendKeys(webDriver, By.cssSelector("[data-testid='associatedTagName']"), "P");
      Events.click(webDriver, By.cssSelector("[data-testid='list-item']"));
    }
    Events.click(webDriver, By.cssSelector("[data-testid='saveAssociatedTag']"));
    webDriver.navigate().back();
    webDriver.navigate().refresh();
  }

  @Test
  @Order(4)
  public void removeTag() throws InterruptedException {
    openExplorePage();
    Events.click(webDriver, By.cssSelector("[data-testid='sortBy']")); // Sort By
    Events.click(webDriver, By.cssSelector("[data-testid='list-item']")); // Last Updated
    Events.click(webDriver, By.xpath("(//button[@data-testid='table-link'])[1]"));
    Events.click(webDriver, By.cssSelector("[data-testid='tag-conatiner']"));
    Events.click(webDriver, By.cssSelector("[data-testid='remove']"));
    Events.click(webDriver, By.cssSelector("[data-testid='remove']"));
    Events.click(webDriver, By.cssSelector("[data-testid='saveAssociatedTag']"));
  }

  @Test
  @Order(5)
  public void editTaskDescription() throws InterruptedException {
    openExplorePage();
    String editDescription = faker.address().toString();
    String updateDescription = faker.address().toString();
    Events.click(webDriver, By.cssSelector("[data-testid='sortBy']")); // Sort By
    Events.click(webDriver, By.cssSelector("[data-testid='list-item']")); // Last Updated
    Events.click(webDriver, By.xpath("(//button[@data-testid='table-link'])[last()]"));
    Thread.sleep(waitTime);
    actions.moveToElement(webDriver.findElement(By.xpath("//div[@data-testid='description']/button"))).perform();
    Events.click(webDriver, By.xpath("//div[@data-testid='description']/button"));
    Events.sendKeys(webDriver, By.xpath(enterDescription), editDescription);
    Events.click(webDriver, By.cssSelector("[data-testid='save']"));
    webDriver.navigate().refresh();
    Thread.sleep(1000);
    actions.moveToElement(webDriver.findElement(By.xpath("//div[@data-testid='description']/button"))).perform();
    Events.click(webDriver, By.xpath("//div[@data-testid='description']/button"));
    webDriver.findElement(By.xpath("//*[text()[contains(.,'" + editDescription + "')]] "));
    Events.sendKeys(webDriver, By.xpath(enterDescription), updateDescription);
    Events.click(webDriver, By.cssSelector("[data-testid='save']"));
    webDriver.navigate().refresh();
    Thread.sleep(2000);
    actions.moveToElement(webDriver.findElement(By.xpath("//div[@data-testid='description']/button"))).perform();
    Events.click(webDriver, By.xpath("//div[@data-testid='description']/button"));
    Thread.sleep(1000);
    webDriver.findElement(By.xpath("//*[text()[contains(.,'" + editDescription + updateDescription + "')]] "));
    Events.click(webDriver, By.cssSelector("[data-testid='cancel']"));
  }

  @Test
  @Order(6)
  public void checkLineage() throws InterruptedException {
    openExplorePage();
    Events.sendKeys(webDriver, By.cssSelector("[data-testid='searchBox']"), pipelineName);
    Events.click(webDriver, By.cssSelector("[data-testid='data-name'][id ='sample_airflowdim_product_etl']"));
    Events.click(webDriver, By.xpath("(//button[@data-testid='tab'])[2]"));
    for (int i = 1; i <= 3; i++) {
      WebElement lineageEntity =
          webDriver.findElement(By.xpath("(//span[@data-testid='lineage-entity'])" + "[" + i + "]"));
      actions.dragAndDropBy(lineageEntity, 100, 200).build();
    }
  }

  @Test
  @Order(7)
  public void checkManage() throws InterruptedException {
    openExplorePage();
    Events.click(webDriver, By.cssSelector("[data-testid='sortBy']")); // Sort By
    Events.click(webDriver, By.cssSelector("[data-testid='list-item']")); // Last Updated
    Events.click(webDriver, By.xpath("(//button[@data-testid='table-link'])[last()]"));
    Events.click(webDriver, By.xpath("(//button[@data-testid='tab'])[3]"));
    Events.click(webDriver, By.cssSelector("[data-testid='owner-dropdown']")); // Owner
    Events.sendKeys(webDriver, By.cssSelector("[data-testid='searchInputText']"), "Cloud");
    Events.click(webDriver, By.cssSelector("[data-testid='list-item']")); // Select User/Team
    Events.click(webDriver, By.cssSelector("[data-testid='card-list']")); // Select Tier
    Events.click(webDriver, By.cssSelector("[data-testid='saveManageTab']")); // Save
    webDriver.navigate().back();
    webDriver.navigate().refresh();
  }

  @Test
  @Order(8)
  public void checkBreadCrumb() throws InterruptedException {
    openExplorePage();
    String editDescription = faker.address().toString();
    String updateDescription = faker.address().toString();
    Events.sendKeys(webDriver, By.cssSelector("[data-testid='searchBox']"), pipelineName);
    Events.click(webDriver, By.cssSelector("[data-testid='data-name'][id ='sample_airflowdim_product_etl']"));
    Thread.sleep(waitTime);
    Events.click(webDriver, By.cssSelector("[data-testid='breadcrumb-link']"));
    Events.click(webDriver, By.cssSelector("[data-testid='edit-description']")); // edit description
    Events.sendKeys(webDriver, By.xpath(enterDescription), editDescription);
    Events.click(webDriver, By.cssSelector("[data-testid='save']"));
    webDriver.navigate().refresh();
    Events.click(webDriver, By.cssSelector("[data-testid='edit-description']"));
    Thread.sleep(1000);
    webDriver.findElement(By.xpath("//*[text()[contains(.,'" + editDescription + "')]] "));
    Events.sendKeys(webDriver, By.xpath(enterDescription), updateDescription);
    Events.click(webDriver, By.cssSelector("[data-testid='save']"));
    webDriver.navigate().refresh();
    Events.click(webDriver, By.cssSelector("[data-testid='edit-description']"));
    Thread.sleep(1000);
    webDriver.findElement(By.xpath("//*[text()[contains(.,'" + editDescription + updateDescription + "')]] "));
    Events.click(webDriver, By.cssSelector("[data-testid='cancel']"));
    for (int i = 1; i <= 3; i++) { // check topics in service
      Events.click(webDriver, By.xpath("(//tr[@data-testid='column']//td[1]/a)" + "[" + i + "]")); // pipelines
      Events.click(webDriver, By.cssSelector("[data-testid='edit-description']")); // edit description
      Events.sendKeys(webDriver, By.xpath(enterDescription), editDescription);
      Events.click(webDriver, By.cssSelector("[data-testid='save']"));
      webDriver.navigate().refresh();
      Events.click(webDriver, By.cssSelector("[data-testid='edit-description']"));
      Thread.sleep(1000);
      webDriver.findElement(By.xpath("//*[text()[contains(.,'" + editDescription + "')]] "));
      Events.sendKeys(webDriver, By.xpath(enterDescription), updateDescription);
      Events.click(webDriver, By.cssSelector("[data-testid='save']"));
      webDriver.navigate().refresh();
      Events.click(webDriver, By.cssSelector("[data-testid='edit-description']"));
      Thread.sleep(1000);
      webDriver.findElement(By.xpath("//*[text()[contains(.,'" + editDescription + updateDescription + "')]] "));
      Events.click(webDriver, By.cssSelector("[data-testid='cancel']"));
      webDriver.navigate().refresh();
      Thread.sleep(waitTime);
      webDriver.navigate().back();
    }
  }

  @Test
  @Order(9)
  public void checkVersion() throws InterruptedException {
    openExplorePage();
    Events.click(webDriver, By.xpath("(//button[@data-testid='table-link'])[last()]"));
    Events.click(webDriver, By.cssSelector("[data-testid='version-button']"));
    Events.click(webDriver, By.cssSelector("[data-testid='closeDrawer']"));
    Events.click(webDriver, By.cssSelector("[data-testid='edit-description']"));
    Events.sendKeys(webDriver, By.xpath(enterDescription), faker.address().toString());
    Events.click(webDriver, By.cssSelector("[data-testid='save']"));
    Events.click(webDriver, By.cssSelector("[data-testid='version-button']"));
    Events.click(webDriver, By.xpath("(//span[@data-testid='select-version'])[2]"));
    Events.click(webDriver, By.xpath("(//span[@data-testid='select-version'])[1]"));
    Events.click(webDriver, By.cssSelector("[data-testid='closeDrawer']"));
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
