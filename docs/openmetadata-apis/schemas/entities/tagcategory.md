# Tag Category

This schema defines the Tag Category entity. A Tag Category contains tags called Primary Tags. Primary Tags can further have children Tags called Secondary Tags. Only two levels of tags are supported currently.

**$id:**[**https://open-metadata.org/schema/entity/tags/tagCategory.json**](https://open-metadata.org/schema/entity/tags/tagCategory.json)

Type: `object`

This schema <u>does not</u> accept additional properties.

## Properties
 - **name** `required`
	 - $ref: [#/definitions/tagName](#tagname)
 - **displayName**
	 - Display Name that identifies this tag category.
	 - Type: `string`
 - **description** `required`
	 - Description of the tag category.
	 - Type: `string`
 - **version**
	 - Metadata version of the entity.
	 - $ref: [../../type/entityHistory.json#/definitions/entityVersion](../types/entityhistory.md#entityversion)
 - **updatedAt**
	 - Last update time corresponding to the new version of the entity in Unix epoch time milliseconds.
	 - $ref: [../../type/basic.json#/definitions/timestamp](../types/basic.md#timestamp)
 - **updatedBy**
	 - User who made the update.
	 - Type: `string`
 - **categoryType** `required`
	 - $ref: [#/definitions/tagCategoryType](#tagcategorytype)
 - **href**
	 - Link to the resource corresponding to the tag category.
	 - $ref: [../../type/basic.json#/definitions/href](../types/basic.md#href)
 - **usageCount**
	 - Count of how many times the tags from this tag category are used.
	 - Type: `integer`
 - **children**
	 - Tags under this category.
	 - Type: `array`
		 - **Items**
		 - $ref: [#/definitions/tag](#tag)
 - **changeDescription**
	 - Change that lead to this version of the entity.
	 - $ref: [../../type/entityHistory.json#/definitions/changeDescription](../types/entityhistory.md#changedescription)
 - **deleted**
	 - When `true` indicates the entity has been soft deleted.
	 - Type: `boolean`
	 - Default: _false_


## Type definitions in this schema
### tagName

 - Name of the tag.
 - Type: `string`
 - Length: between 2 and 25


### tagCategoryType

 - Type of tag category.
 - Type: `string`
 - The value is restricted to the following: 
	 1. _"Descriptive"_
	 2. _"Classification"_


### tag





_This document was updated on: Wednesday, March 9, 2022_