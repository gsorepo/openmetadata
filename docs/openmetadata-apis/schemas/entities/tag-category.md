# Tag Category

This schema defines the Tag Category entity. A Tag Category has one more children tags called Primary Tags. Primary Tags can further have children Tags called Secondary Tags. Only two levels of tags are supported currently.

**$id:** [**https://github.com/open-metadata/OpenMetadata/blob/main/catalog-rest-service/src/main/resources/json/schema/entity/tags/tagCategory.json**](https://github.com/open-metadata/OpenMetadata/blob/main/catalog-rest-service/src/main/resources/json/schema/entity/tags/tagCategory.json)

Type: `object`

This schema does not accept additional properties.

## Properties

* **name** `required`
  * $ref: [\#/definitions/tagName](tag-category.md#/definitions/tagName)
* **description** `required`
  * Description of the tag category.
  * Type: `string`
* **categoryType** `required`
  * $ref: [\#/definitions/tagCategoryType](tag-category.md#/definitions/tagCategoryType)
* **href**
  * Link to the resource corresponding to the tag category.
  * $ref: [../../type/basic.json\#/definitions/href](tag-category.md#....typebasic.jsondefinitionshref)
* **usageCount**
  * Count of how many times the tags from this tag category are used.
  * Type: `integer`
* **children**
  * Tags under this category.
  * Type: `array`
    * **Items**
    * $ref: [\#/definitions/tag](tag-category.md#/definitions/tag)

## Types definitions in this schema

**tagName**

* Name of the tag.
* Type: `string`
* Length: between 2 and 25

**tagCategoryType**

* Type of tag category.
* Type: `string`
* The value is restricted to the following: 
  1. _"Descriptive"_
  2. _"Classification"_

**tag**

