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

package org.openmetadata.catalog.selenium.pages.topicDetails;

import com.github.javafaker.Faker;
import org.openmetadata.catalog.selenium.events.Events;
import org.openmetadata.catalog.selenium.properties.Property;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.interactions.Actions;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

import java.time.Duration;
import java.util.ArrayList;

public class TopicDetailsPageTest {
    static WebDriver webDriver;
    static String url = Property.getInstance().getURL();
    Integer waitTime = Property.getInstance().getSleepTime();
    static Faker faker = new Faker();
    static String enterDescription = "//div[@data-testid='enterDescription']/div/div[2]/div/div/div/div/div/div";
    static Actions actions;
    static WebDriverWait wait;

    @BeforeMethod
    public void openMetadataWindow() {
        System.setProperty("webdriver.chrome.driver", "src/test/resources/drivers/linux/chromedriver");
        webDriver = new ChromeDriver();
        actions = new Actions(webDriver);
        wait = new WebDriverWait(webDriver, Duration.ofSeconds(30));
        webDriver.manage().window().maximize();
        webDriver.get(url);
    }

    @Test(priority = 1)
    public void openExplorePage() throws InterruptedException {
        Events.click(webDriver, By.cssSelector("[data-testid='closeWhatsNew']")); // Close What's new
        Events.click(webDriver, By.cssSelector("[data-testid='appbar-item'][id='explore']")); // Explore
        Events.click(webDriver, By.xpath("(//button[@data-testid='tab'])[2]")); // Topics
        Thread.sleep(waitTime);
    }

    @Test(priority = 2)
    public void checkTabs() throws InterruptedException {
        openExplorePage();
        Events.click(webDriver, By.cssSelector("[data-testid='sortBy']")); // Sort By
        Events.click(webDriver, By.cssSelector("[data-testid='list-item']")); // Last Updated
        Thread.sleep(waitTime);
        Events.click(webDriver, By.xpath("(//a[@data-testid='table-link'])[last()]"));
        Thread.sleep(waitTime);
        Events.click(webDriver, By.xpath("(//button[@data-testid='tab'])[2]"));
        Events.click(webDriver, By.xpath("(//button[@data-testid='tab'])[3]"));
    }

    @Test(priority = 3)
    public void checkFollow() throws InterruptedException {
        openExplorePage();
        Events.click(webDriver, By.cssSelector("[data-testid='sortBy']")); // Sort By
        Events.click(webDriver, By.cssSelector("[data-testid='list-item']")); // Last Updated
        Events.click(webDriver, By.xpath("(//a[@data-testid='table-link'])[last()]"));
        Thread.sleep(waitTime);
        Events.click(webDriver, By.cssSelector("[data-testid='follow-button']"));
        Events.click(webDriver, By.cssSelector("[data-testid='getFollowerDetail']"));
        Events.click(webDriver, By.cssSelector("[data-testid='follow-button']"));
        Events.click(webDriver, By.cssSelector("[data-testid='getFollowerDetail']"));
    }

    @Test(priority = 4)
    public void addTags() throws InterruptedException {
        openExplorePage();
        Events.click(webDriver, By.cssSelector("[data-testid='sortBy']")); // Sort By
        Events.click(webDriver, By.cssSelector("[data-testid='list-item']")); // Last Updated
        Events.click(webDriver, By.xpath("(//a[@data-testid='table-link'])[last()]"));
        Thread.sleep(waitTime);
        Events.click(webDriver, By.cssSelector("[data-testid='tags']"));
        Events.click(webDriver, By.cssSelector("[data-testid='associatedTagName']"));
        for (int i = 0; i <=1; i++){
            Events.sendKeys(webDriver, By.cssSelector("[data-testid='associatedTagName']"), "P");
            Events.click(webDriver, By.cssSelector("[data-testid='list-item']"));
        }
        Events.click(webDriver, By.cssSelector("[data-testid='saveAssociatedTag']"));
        Events.click(webDriver, By.cssSelector("[data-testid='appbar-item'][id='explore']")); // Explore
        Events.click(webDriver, By.cssSelector("[data-testid='checkbox'][id='PersonalData.Personal']"));
    }

    @Test(priority = 5)
    public void removeTag() throws InterruptedException {
        openExplorePage();
        Events.click(webDriver, By.cssSelector("[data-testid='sortBy']")); // Sort By
        Events.click(webDriver, By.cssSelector("[data-testid='list-item']")); // Last Updated
        Events.click(webDriver, By.xpath("(//a[@data-testid='table-link'])[1]"));
        Events.click(webDriver, By.cssSelector("[data-testid='tag-conatiner']"));
        Events.click(webDriver, By.cssSelector("[data-testid='remove']"));
        Events.click(webDriver, By.cssSelector("[data-testid='remove']"));
        Events.click(webDriver, By.cssSelector("[data-testid='saveAssociatedTag']"));
    }

    @Test(priority = 6)
    public void editDescription() throws InterruptedException {
        openExplorePage();
        Events.click(webDriver, By.cssSelector("[data-testid='sortBy']")); // Sort By
        Events.click(webDriver, By.cssSelector("[data-testid='list-item']")); // Last Updated
        Events.click(webDriver, By.xpath("(//a[@data-testid='table-link'])[last()]"));
        Events.click(webDriver, By.cssSelector("[data-testid='edit-description']"));
        Events.sendKeys(webDriver, By.xpath(enterDescription), faker.address().toString());
        Events.click(webDriver, By.cssSelector("[data-testid='save']"));
    }

    @Test(priority = 7)
    public void checkManage() throws InterruptedException {
        openExplorePage();
        Events.click(webDriver, By.cssSelector("[data-testid='sortBy']")); // Sort By
        Events.click(webDriver, By.cssSelector("[data-testid='list-item']")); // Last Updated
        Events.click(webDriver, By.xpath("(//a[@data-testid='table-link'])[last()]"));
        Events.click(webDriver, By.xpath("(//button[@data-testid='tab'])[3]"));
        Events.click(webDriver, By.cssSelector("[data-testid='owner-dropdown']")); // Owner
        Events.sendKeys(webDriver, By.cssSelector("[data-testid='searchInputText']"), "Cloud");
        Events.click(webDriver, By.cssSelector("[data-testid='list-item']")); // Select User/Team
        Events.click(webDriver, By.cssSelector("[data-testid='card-list']")); // Select Tier
        Events.click(webDriver, By.cssSelector("[data-testid='saveManageTab']")); // Save
        webDriver.navigate().back();
        webDriver.navigate().refresh();
    }

    @Test(priority = 8)
    public void checkBreadCrumb() throws InterruptedException {
        openExplorePage();
        Events.click(webDriver, By.cssSelector("[data-testid='sortBy']")); // Sort By
        Events.click(webDriver, By.cssSelector("[data-testid='list-item']")); // Last Updated
        Events.click(webDriver, By.xpath("(//a[@data-testid='table-link'])[last()]"));
        wait.until(ExpectedConditions.elementToBeClickable(By.cssSelector("[data-testid='breadcrumb-link']")));
        Events.click(webDriver, By.cssSelector("[data-testid='breadcrumb-link']"));
        wait.until(ExpectedConditions.elementToBeClickable(By.cssSelector("[data-testid='description-edit']")));
        Events.click(webDriver, By.cssSelector("[data-testid='description-edit']")); // edit description
        Events.sendKeys(webDriver, By.xpath(enterDescription), faker.address().toString());
        Events.click(webDriver, By.cssSelector("[data-testid='save']"));
        for (int i = 1; i <= 3; i++) { //check topics in service
            Events.click(webDriver, By.xpath("(//tr[@data-testid='column']//td[1]/a)" + "[" + i + "]")); // topics
            Thread.sleep(waitTime);
            webDriver.navigate().back();
        }
    }

    @AfterMethod
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
