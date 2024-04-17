package org.openmetadata.service.search.indexes;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.openmetadata.service.Entity;
import org.openmetadata.service.search.ParseTags;
import org.openmetadata.service.search.SearchIndexUtils;
import org.openmetadata.service.search.models.SearchSuggest;
import org.openmetadata.service.util.JsonUtils;

public record SearchEntityIndex(org.openmetadata.schema.entity.data.SearchIndex searchIndex)
    implements SearchIndex {
  private static final List<String> excludeFields = List.of("changeDescription");

  public List<SearchSuggest> getSuggest() {
    List<SearchSuggest> suggest = new ArrayList<>();
    suggest.add(SearchSuggest.builder().input(searchIndex.getName()).weight(5).build());
    suggest.add(
        SearchSuggest.builder().input(searchIndex.getFullyQualifiedName()).weight(5).build());
    return suggest;
  }

  public Map<String, Object> buildESDoc() {
    Map<String, Object> doc = JsonUtils.getMap(searchIndex);
    SearchIndexUtils.removeNonIndexableFields(doc, excludeFields);
    Map<String, Object> commonAttributes = getCommonAttributesMap(searchIndex, Entity.SEARCH_INDEX);
    doc.putAll(commonAttributes);
    ParseTags parseTags = new ParseTags(Entity.getEntityTags(Entity.SEARCH_INDEX, searchIndex));
    doc.put("tags", parseTags.getTags());
    doc.put("tier", parseTags.getTierTag());
    doc.put("service", getEntityWithDisplayName(searchIndex.getService()));
    doc.put("lineage", SearchIndex.getLineageData(searchIndex.getEntityReference()));
    return doc;
  }

  public static Map<String, Float> getFields() {
    Map<String, Float> fields = SearchIndex.getDefaultFields();
    fields.put("fields.name", 7.0f);
    fields.put("fields.name.keyword", 50f);
    fields.put("fields.children.description", 1.0f);
    fields.put("fields.children.name", 7.0f);
    fields.put("fields.children.name.keyword", 5.0f);
    return fields;
  }
}
