package org.openmetadata.service.search.opensearch.dataInsightAggregator;

import java.io.IOException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import org.jetbrains.annotations.NotNull;
import org.openmetadata.schema.dataInsight.custom.DataInsightCustomChart;
import org.openmetadata.schema.dataInsight.custom.DataInsightCustomChartResult;
import org.openmetadata.schema.dataInsight.custom.DataInsightCustomChartResultList;
import org.openmetadata.schema.dataInsight.custom.FormulaHolder;
import org.openmetadata.schema.dataInsight.custom.SummaryCard;
import org.openmetadata.service.jdbi3.DataInsightSystemChartRepository;
import org.openmetadata.service.util.JsonUtils;
import os.org.opensearch.action.search.SearchRequest;
import os.org.opensearch.action.search.SearchResponse;
import os.org.opensearch.index.query.QueryBuilder;
import os.org.opensearch.index.query.RangeQueryBuilder;
import os.org.opensearch.search.aggregations.AggregationBuilders;
import os.org.opensearch.search.aggregations.bucket.histogram.DateHistogramAggregationBuilder;
import os.org.opensearch.search.aggregations.bucket.histogram.DateHistogramInterval;
import os.org.opensearch.search.builder.SearchSourceBuilder;

public class OpenSearchSummaryCardAggregator implements OpenSearchDynamicChartAggregatorInterface {
  public SearchRequest prepareSearchRequest(
      @NotNull DataInsightCustomChart diChart, long start, long end, List<FormulaHolder> formulas)
      throws IOException {

    SummaryCard summaryCard = JsonUtils.convertValue(diChart.getChartDetails(), SummaryCard.class);
    DateHistogramAggregationBuilder dateHistogramAggregationBuilder =
        AggregationBuilders.dateHistogram("1")
            .field(DataInsightSystemChartRepository.TIMESTAMP_FIELD)
            .calendarInterval(DateHistogramInterval.DAY);
    populateDateHistogram(
        summaryCard.getFunction(),
        summaryCard.getFormula(),
        summaryCard.getField(),
        summaryCard.getFilter(),
        dateHistogramAggregationBuilder,
        formulas);

    Timestamp endTimeStamp = new Timestamp(end + MILLISECONDS_IN_DAY);
    Timestamp startTimeStamp = new Timestamp(end - MILLISECONDS_IN_DAY);

    QueryBuilder queryFilter =
        new RangeQueryBuilder("@timestamp")
            .gte(startTimeStamp.toLocalDateTime().toString() + "Z")
            .lte(endTimeStamp.toLocalDateTime().toString() + "Z");

    SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder();
    searchSourceBuilder.aggregation(dateHistogramAggregationBuilder);
    searchSourceBuilder.query(queryFilter);
    searchSourceBuilder.size(0);
    os.org.opensearch.action.search.SearchRequest searchRequest =
        new os.org.opensearch.action.search.SearchRequest(
            DataInsightSystemChartRepository.DI_SEARCH_INDEX);
    searchRequest.source(searchSourceBuilder);
    return searchRequest;
  }

  public DataInsightCustomChartResultList processSearchResponse(
      @NotNull DataInsightCustomChart diChart,
      SearchResponse searchResponse,
      List<FormulaHolder> formulas) {
    DataInsightCustomChartResultList resultList = new DataInsightCustomChartResultList();
    SummaryCard summaryCard = JsonUtils.convertValue(diChart.getChartDetails(), SummaryCard.class);
    List<DataInsightCustomChartResult> results =
        processAggregations(
            searchResponse.getAggregations().asList(), summaryCard.getFormula(), null, formulas);

    List<DataInsightCustomChartResult> finalResults = new ArrayList<>();
    for (int i = results.size() - 1; i >= 0; i++) {
      if (results.get(i).getCount() != null) {
        finalResults.add(results.get(i));
        resultList.setResults(finalResults);
        return resultList;
      }
    }

    resultList.setResults(results);
    return resultList;
  }
}
