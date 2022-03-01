package org.openmetadata.catalog.selenium.objectRepository;

import java.util.List;
import javax.annotation.Nonnull;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;

@Getter
@RequiredArgsConstructor
public class ExplorePage {
  @Nonnull WebDriver webDriver;

  By explore = By.cssSelector("[data-testid='appbar-item'][id='explore']");
  By tableCount = By.xpath("(//span[@data-testid='filter-count'])[1]");
  By topicCount = By.xpath("(//span[@data-testid='filter-count'])[2]");
  By dashboardCount = By.xpath("(//span[@data-testid='filter-count'])[3]");
  By pipelineCount = By.xpath("(//span[@data-testid='filter-count'])[4]");
  By tables = By.xpath("(//button[@data-testid='tab'])[1]");
  By topics = By.xpath("(//button[@data-testid='tab'])[2]");
  By dashboard = By.xpath("(//button[@data-testid='tab'])[3]");
  By pipeline = By.xpath("(//button[@data-testid='tab'])[4]");
  By next = By.linkText("Next");
  By pagination = By.xpath("//div[@data-testid=\"pagination-button\"]");
  By bigQueryCheckbox = By.xpath("//input[@data-testid=\"checkbox\"][@id=\"BigQuery\"]");
  By serviceName = By.xpath("//div[@data-testid=\"checkbox-label\"]");
  By countService = By.xpath("//div[@data-testid='filter-containers-0']/div/span");
  By errorMessage = By.xpath("//p[@data-testid=\"no-search-results\"]");
  By glueCheckbox = By.xpath("//input[@data-testid=\"checkbox\"][@id=\"Glue\"]");
  By selectTable = By.xpath("(//button[@data-testid=\"table-link\"])[1]");
  By addTag = By.xpath("//div[@data-testid='tag-conatiner']/div/span/span");
  By serviceText = By.xpath("//h6[contains(text(),'Service')]");
  By tierText = By.xpath("//h6[contains(text(),'Tier')]");
  By databaseText = By.xpath("//h6[contains(text(),'Database')]");
  By tagText = By.xpath("//h6[contains(text(),'Tags')]");
  By lastWeekSortDesc = By.xpath("//i[@data-testid=\"last-updated\"]");
  By lastWeekSortAesc = By.xpath("//i[@data-testid=\"last-updated\"]");
  By updatedDescription = By.xpath("(//div[@data-testid=\"description-text\"])[1]");
  By shopifyCheckbox = By.xpath("//input[@data-testid=\"checkbox\"][@id=\"shopify\"]");
  By tagSpecialCategoryCheckbox = By.xpath("//input[@data-testid=\"checkbox\"][@id=\"PersonalData.SpecialCategory\"]");
  By tierTier3Checkbox = By.xpath("//input[@data-testid=\"checkbox\"][@id=\"Tier.Tier3\"]");
  By selectedCheckbox =
      By.xpath(
          "//span[@class=\"tw-py-px tw-px-1 tw-ml-1 tw-border tw-rounded tw-text-xs tw-min-w-badgeCount tw-text-center tw-bg-primary tw-text-white tw-border-none tw-py-0 tw-px-0\"]");
  By kafka = By.xpath("//input[@data-testid=\"checkbox\"][@id=\"Kafka\"]");
  By superset = By.xpath("//input[@data-testid=\"checkbox\"][@id=\"Superset\"]");
  By airflow = By.xpath("//input[@data-testid=\"checkbox\"][@id=\"Airflow\"]");

  public List<WebElement> serviceName() {
    return webDriver.findElements(serviceName);
  }

  public List<WebElement> serviceCount() {
    return webDriver.findElements(countService);
  }

  public List<WebElement> selectedCheckbox() {
    return webDriver.findElements(selectedCheckbox);
  }
}
