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
import org.openmetadata.schema.dataInsight.custom.LineChart;
import org.openmetadata.service.jdbi3.DataInsightSystemChartRepository;
import org.openmetadata.service.util.JsonUtils;
import os.org.opensearch.action.search.SearchRequest;
import os.org.opensearch.action.search.SearchResponse;
import os.org.opensearch.index.query.QueryBuilder;
import os.org.opensearch.index.query.RangeQueryBuilder;
import os.org.opensearch.search.aggregations.Aggregation;
import os.org.opensearch.search.aggregations.AggregationBuilders;
import os.org.opensearch.search.aggregations.bucket.histogram.DateHistogramAggregationBuilder;
import os.org.opensearch.search.aggregations.bucket.histogram.DateHistogramInterval;
import os.org.opensearch.search.aggregations.bucket.terms.ParsedTerms;
import os.org.opensearch.search.aggregations.bucket.terms.Terms;
import os.org.opensearch.search.aggregations.bucket.terms.TermsAggregationBuilder;
import os.org.opensearch.search.builder.SearchSourceBuilder;

public class OpenSearchLineChartAggregator implements OpenSearchDynamicChartAggregatorInterface {
  public SearchRequest prepareSearchRequest(
      @NotNull DataInsightCustomChart diChart, long start, long end, List<FormulaHolder> formulas)
      throws IOException {
    LineChart lineChart = JsonUtils.convertValue(diChart.getChartDetails(), LineChart.class);
    DateHistogramAggregationBuilder dateHistogramAggregationBuilder =
        AggregationBuilders.dateHistogram("1")
            .field(DataInsightSystemChartRepository.TIMESTAMP_FIELD)
            .calendarInterval(DateHistogramInterval.DAY);
    populateDateHistogram(
        lineChart.getFunction(),
        lineChart.getFormula(),
        lineChart.getField(),
        lineChart.getFilter(),
        dateHistogramAggregationBuilder,
        formulas);

    SearchSourceBuilder searchSourceBuilder = new SearchSourceBuilder();

    Timestamp endTimeStamp = new Timestamp(end + MILLISECONDS_IN_DAY);
    Timestamp startTimeStamp = new Timestamp(start);

    QueryBuilder queryFilter =
        new RangeQueryBuilder("@timestamp")
            .gte(startTimeStamp.toLocalDateTime().toString() + "Z")
            .lte(endTimeStamp.toLocalDateTime().toString() + "Z");

    if (lineChart.getGroupBy() != null) {
      TermsAggregationBuilder termsAggregationBuilder =
          AggregationBuilders.terms("0").field(lineChart.getGroupBy());
      termsAggregationBuilder.subAggregation(dateHistogramAggregationBuilder);
      searchSourceBuilder.size(0);
      searchSourceBuilder.aggregation(termsAggregationBuilder);
    } else {
      searchSourceBuilder.aggregation(dateHistogramAggregationBuilder);
    }
    searchSourceBuilder.query(queryFilter);
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
    LineChart lineChart = JsonUtils.convertValue(diChart.getChartDetails(), LineChart.class);
    if (lineChart.getGroupBy() != null) {
      List<DataInsightCustomChartResult> diChartResults = new ArrayList<>();
      for (Aggregation arg : searchResponse.getAggregations().asList()) {
        ParsedTerms parsedTerms = (ParsedTerms) arg;
        for (Terms.Bucket bucket : parsedTerms.getBuckets()) {
          diChartResults.addAll(
              processAggregations(
                  bucket.getAggregations().asList(),
                  lineChart.getFormula(),
                  bucket.getKeyAsString(),
                  formulas));
        }
      }
      resultList.setResults(diChartResults);
      return resultList;
    }
    List<DataInsightCustomChartResult> results =
        processAggregations(
            searchResponse.getAggregations().asList(), lineChart.getFormula(), null, formulas);
    resultList.setResults(results);
    if (lineChart.getKpiDetails() != null) {
      resultList.setKpiDetails(lineChart.getKpiDetails());
    }
    return resultList;
  }
}
