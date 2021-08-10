# Daily count of some measurement

This schema defines type used for capturing and reporting daily count of some measurement, such as usage, joins.

<b id="httpsgithub.comopen-metadataopenmetadatablobmaincatalog-rest-servicesrcmainresourcesjsonschematypedailycount.json">&#36;id: https://github.com/open-metadata/OpenMetadata/blob/main/catalog-rest-service/src/main/resources/json/schema/type/dailyCount.json</b>

Type: `object`

## Properties
 - <b id="#https://github.com/open-metadata/OpenMetadata/blob/main/catalog-rest-service/src/main/resources/json/schema/type/dailyCount.json/properties/count">count</b> `required`
	 - Daily count of a measurement on the given date.
	 - Type: `integer`
	 - Range:  &ge; 0
 - <b id="#https://github.com/open-metadata/OpenMetadata/blob/main/catalog-rest-service/src/main/resources/json/schema/type/dailyCount.json/properties/date">date</b> `required`
	 - &#36;ref: [basic.json#/definitions/date](#basic.jsondefinitionsdate)
